import { signInWithEmailAndPassword, signOut, updateProfile as updateAuthProfile } from 'firebase/auth'
import {
  equalTo, get, limitToLast, orderByChild, push, query, ref, runTransaction,
  set, update, type QueryConstraint,
} from 'firebase/database'
import type {
  BackendAdapter, DashboardSummary, CustomerOption, WarehouseOption, TrackingEvent,
  AppProfile, CreateShipmentInput, CourierOption, RouteRecord, AuditLogRecord,
  CreateRouteInput, CreateWarehouseInput,
} from '../contracts'
import type { Shipment, ShipmentStatus } from '@/domain/shipment'
import { ALLOWED_NEXT_STATUSES, DB_TO_UI_STATUS, UI_TO_DB_STATUS } from '@/domain/shipment'
import { firebaseAuth, firebaseConfigured, firebaseDatabase } from './client'

type Row = Record<string, any> & { id?: number | string }
const now = () => new Date().toISOString()
const fmtTime = (value?: string | number | null) => value ? new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }).format(new Date(value)) : '—'
function db() {
  if (!firebaseConfigured || !firebaseDatabase || !firebaseAuth) throw new Error('Firebase belum dikonfigurasi. Isi VITE_FIREBASE_* di .env.local.')
  return firebaseDatabase
}
function auth() {
  if (!firebaseConfigured || !firebaseDatabase || !firebaseAuth) throw new Error('Firebase belum dikonfigurasi. Isi VITE_FIREBASE_* di .env.local.')
  return firebaseAuth
}
function keyId(key: string): number | string { return /^\d+$/.test(key) ? Number(key) : key }
async function rows<T extends Row = Row>(path: string, constraints: QueryConstraint[] = []): Promise<T[]> {
  const target = ref(db(), path)
  const snap = await get(constraints.length ? query(target, ...constraints) : target)
  const value = snap.val()
  if (!value || typeof value !== 'object') return []
  return Object.entries(value).map(([key, row]) => {
    const record = row && typeof row === 'object' ? row as Row : {}
    return { ...record, id: record.id ?? keyId(key) } as T
  })
}
async function nextId(path: string) {
  const result = await runTransaction(ref(db(), `_meta/counters/${path}`), current => Number(current || 0) + 1)
  if (!result.committed) throw new Error('Gagal membuat ID baru.')
  return Number(result.snapshot.val())
}
async function currentProfile(): Promise<AppProfile | null> {
  const user = auth().currentUser
  if (!user) return null
  const snap = await get(ref(db(), `profiles/${user.uid}`))
  const value = snap.val()
  if (!value) return null
  return { id: user.uid, fullName: value.fullName || user.displayName || user.email?.split('@')[0] || 'User', email: user.email || '', role: value.role || 'customer' }
}
async function shipmentsVisibleToCurrentUser(): Promise<Row[]> {
  const profile = await currentProfile()
  if (!profile) return []
  if (profile.role === 'admin' || profile.role === 'staff') return rows('shipments', [orderByChild('updatedAt')])
  const indexPath = profile.role === 'customer' ? `customer_shipments/${profile.id}` : `courier_shipments/${profile.id}`
  const indexSnap = await get(ref(db(), indexPath))
  const ids = Object.keys(indexSnap.val() || {})
  const items: Array<Row | null> = await Promise.all(
    ids.map(async (id): Promise<Row | null> => {
      const snap = await get(ref(db(), `shipments/${id}`))
      if (!snap.exists()) return null

      const value = snap.val() as Row
      return {
        ...value,
        id: Number(value.id ?? id),
      }
    }),
  )

  return items
    .filter((row): row is Row => row !== null)
    .sort((a, b) =>
      String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')),
    )
}
async function relatedShipments(): Promise<Shipment[]> {
  const profile = await currentProfile()
  if (!profile) return []
  const privileged = profile.role === 'admin' || profile.role === 'staff'
  const [shipments, warehouses, couriers, routes, customers] = await Promise.all([
    shipmentsVisibleToCurrentUser(), rows('warehouses'), rows('couriers'), rows('routes'),
    privileged ? rows('customers') : Promise.resolve([] as Row[]),
  ])
  return shipments.map(s => {
    const receiver = customers.find(c => Number(c.id) === Number(s.receiverId))
    const origin = warehouses.find(w => Number(w.id) === Number(s.originWarehouseId))
    const route = routes.find(r => Number(r.id) === Number(s.currentRouteId))
    const courier = couriers.find(c => Number(c.id) === Number(route?.courierId))
    const destination = warehouses.find(w => Number(w.id) === Number(route?.destinationWarehouseId))
    const createdAt = s.createdAt ? String(s.createdAt) : undefined
    return {
      id: Number(s.id), trackingNumber: s.trackingNumber,
      originWarehouseId: Number(s.originWarehouseId),
      currentRouteId: s.currentRouteId == null ? null : Number(s.currentRouteId),
      courierProfileId: courier?.profileId || s.courierProfileId || null,
      recipient: receiver?.fullName || s.recipient || `Customer #${s.receiverId}`,
      origin: origin?.city || origin?.name || s.origin || 'Unknown',
      destination: destination?.city || destination?.name || s.destination || 'Not assigned',
      courier: courier?.fullName || courier?.courierCode || s.courier || 'Not assigned',
      status: DB_TO_UI_STATUS[s.status] || s.status || 'Exception',
      updatedAt: fmtTime(s.updatedAt), createdAt, eta: 'Not available', amount: 0,
    } as Shipment
  })
}
export const firebaseAdapter: BackendAdapter = {
  provider: 'firebase',
  async getProfile() { return currentProfile() },
  async signIn(email, password) { await signInWithEmailAndPassword(auth(), email.trim(), password) },
  async signOut() { await signOut(auth()) },
  async updateProfile(fullName) {
    const user = auth().currentUser
    if (!user) throw new Error('Please sign in again.')
    const name = fullName.trim()
    if (!name) throw new Error('Name is required.')
    await updateAuthProfile(user, { displayName: name })
    await update(ref(db(), `profiles/${user.uid}`), { fullName: name, updatedAt: now() })
  },
  async getShipments() { return relatedShipments() },
  async getSummary(): Promise<DashboardSummary> {
    const shipments = await this.getShipments()
    const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - 6)
    const days = Array.from({ length: 7 }, (_, index) => { const d = new Date(start); d.setDate(start.getDate() + index); return d })
    const weekly = days.map(day => {
      const end = new Date(day); end.setDate(end.getDate() + 1)
      return shipments.filter(s => { const created = s.createdAt ? new Date(s.createdAt) : null; return created && created >= day && created < end }).length
    })
    return {
      total: shipments.length,
      inTransit: shipments.filter(s => ['Picked up', 'In transit', 'At transit warehouse', 'Out for delivery'].includes(s.status)).length,
      delivered: shipments.filter(s => s.status === 'Delivered').length,
      exceptions: shipments.filter(s => ['Cancelled', 'Exception'].includes(s.status)).length,
      weekly,
    }
  },
  async getCustomers() {
    return (await rows('customers')).map(c => ({ id: Number(c.id), fullName: c.fullName || `Customer #${c.id}`, phone: c.phone || '', address: c.address || '' })) as CustomerOption[]
  },
  async getWarehouses() {
    return (await rows('warehouses')).map(w => ({ id: Number(w.id), name: w.name, city: w.city, address: w.address || '' })) as WarehouseOption[]
  },
  async getCouriers() {
    return (await rows('couriers', [orderByChild('active'), equalTo(true)])).map(c => ({ id: Number(c.id), fullName: c.fullName || c.courierCode, courierCode: c.courierCode || '', active: c.active !== false })) as CourierOption[]
  },
  async getRoutes(): Promise<RouteRecord[]> {
    const [routes, warehouses, couriers] = await Promise.all([rows('routes', [orderByChild('status')]), rows('warehouses'), rows('couriers', [orderByChild('active'), equalTo(true)])])
    return routes.map(r => {
      const courier = couriers.find(c => Number(c.id) === Number(r.courierId))
      const origin = warehouses.find(w => Number(w.id) === Number(r.originWarehouseId))
      const destination = warehouses.find(w => Number(w.id) === Number(r.destinationWarehouseId))
      return {
        id: Number(r.id), courierId: Number(r.courierId), courierName: courier?.fullName || courier?.courierCode || 'Courier',
        courierCode: courier?.courierCode || '—', originWarehouseId: Number(r.originWarehouseId),
        origin: origin?.city || origin?.name || 'Unknown', destinationWarehouseId: Number(r.destinationWarehouseId),
        destination: destination?.city || destination?.name || 'Unknown', departureAt: r.departureAt || null,
        arrivalAt: r.arrivalAt || null, status: r.status || 'planned', createdAt: r.createdAt || now(),
      } as RouteRecord
    })
  },
  async getAuditLogs(): Promise<AuditLogRecord[]> {
    const [logs, shipments, profiles] = await Promise.all([
      rows('audit_logs', [orderByChild('changedAt'), limitToLast(500)]), rows('shipments'), rows('profiles'),
    ])
    return logs.sort((a, b) => String(b.changedAt || '').localeCompare(String(a.changedAt || ''))).slice(0, 500).map(log => ({
      id: log.id ?? 0,
      shipmentId: Number(log.shipmentId),
      trackingNumber: log.trackingNumber || shipments.find(s => Number(s.id) === Number(log.shipmentId))?.trackingNumber || `Shipment #${log.shipmentId}`,
      action: log.action || 'UPDATE', oldStatus: log.oldStatus || null, newStatus: log.newStatus || null,
      changedBy: profiles.find(p => p.id === log.changedBy)?.fullName || log.changedBy || 'System', changedAt: fmtTime(log.changedAt),
    }))
  },
  async createWarehouse(input: CreateWarehouseInput) {
    const id = await nextId('warehouses')
    await set(ref(db(), `warehouses/${id}`), { id, name: input.name.trim(), city: input.city.trim(), address: input.address.trim(), createdAt: now() })
  },
  async updateWarehouse(id: number, input: CreateWarehouseInput) {
    const target = ref(db(), `warehouses/${id}`)
    if (!(await get(target)).exists()) throw new Error('Warehouse not found.')
    await update(target, { name: input.name.trim(), city: input.city.trim(), address: input.address.trim(), updatedAt: now() })
  },
  async createRoute(input: CreateRouteInput) {
    if (input.originWarehouseId === input.destinationWarehouseId) throw new Error('Origin and destination must be different.')
    const id = await nextId('routes')
    await set(ref(db(), `routes/${id}`), { id, ...input, createdAt: now() })
  },
  async updateRoute(id: number, input: CreateRouteInput) {
    if (input.originWarehouseId === input.destinationWarehouseId) throw new Error('Origin and destination must be different.')
    const target = ref(db(), `routes/${id}`)
    if (!(await get(target)).exists()) throw new Error('Route not found.')
    await update(target, { ...input, updatedAt: now() })
  },
  async updateRouteStatus(id: number, status: RouteRecord['status']) { await update(ref(db(), `routes/${id}`), { status, updatedAt: now() }) },
  async getTrackingEvents(shipmentId: number): Promise<TrackingEvent[]> {
    const profile = await currentProfile()
    if (!profile) throw new Error('Please sign in to view tracking history.')
    let events: Row[]
    if (profile.role === 'admin' || profile.role === 'staff') {
      events = await rows('tracking_events', [orderByChild('shipmentId'), equalTo(shipmentId)])
    } else {
      const accessNode = profile.role === 'customer' ? 'customer_shipments' : 'courier_shipments'
      const access = await get(ref(db(), `${accessNode}/${profile.id}/${shipmentId}`))
      if (access.val() !== true) throw new Error('You do not have access to this shipment tracking history.')
      const keySnap = await get(ref(db(), `shipment_tracking_events/${shipmentId}`))
      const keys = Object.keys(keySnap.val() || {})
      const fetched: Array<Row | null> = await Promise.all(
        keys.map(async (key): Promise<Row | null> => {
          const snap = await get(ref(db(), `tracking_events/${key}`))
          if (!snap.exists()) return null

          const event = snap.val() as Row
          return {
            ...event,
            id: event.id ?? keyId(key),
          }
        }),
      )

      events = fetched.filter((row): row is Row => row !== null)
    }
    const warehouses = await rows('warehouses')
    return events.sort((a, b) => String(a.eventTime || '').localeCompare(String(b.eventTime || ''))).map(event => ({
      id: event.id ?? 0,
      status: DB_TO_UI_STATUS[event.status] || event.status,
      description: event.description || '',
      eventTime: fmtTime(event.eventTime),
      warehouse: warehouses.find(w => Number(w.id) === Number(event.warehouseId))?.city || 'Location unavailable',
    }))
  },
  async createShipment(input: CreateShipmentInput) {
    const [customers, warehouses, existing, customerRows] = await Promise.all([this.getCustomers(), this.getWarehouses(), this.getShipments(), rows('customers')])
    const sender = customers.find(c => c.id === input.senderId)
    const receiver = customers.find(c => c.id === input.receiverId)
    const origin = warehouses.find(w => w.id === input.originWarehouseId)
    const senderRaw = customerRows.find(c => Number(c.id) === input.senderId)
    const receiverRaw = customerRows.find(c => Number(c.id) === input.receiverId)
    if (!sender || !receiver) throw new Error('Select valid sender and receiver.')
    if (input.senderId === input.receiverId) throw new Error('Sender and receiver must differ.')
    if (!origin) throw new Error('Select a valid warehouse.')
    if (!senderRaw?.profileId || !receiverRaw?.profileId) throw new Error('Customer profile mapping is missing. Reload the seed data and verify profileId fields.')
    if (existing.some(s => s.trackingNumber === input.trackingNumber)) throw new Error('Tracking number already exists.')
    const id = await nextId('shipments')
    const stamp = now()
    const shipment = {
      id, trackingNumber: input.trackingNumber.trim(), senderId: input.senderId, receiverId: input.receiverId,
      originWarehouseId: input.originWarehouseId, currentWarehouseId: input.originWarehouseId,
      weightKg: input.weightKg, status: 'created', createdAt: stamp, updatedAt: stamp,
      recipient: receiver.fullName, origin: origin.city || origin.name, destination: receiver.address || 'Not assigned', courier: 'Not assigned',
    }
    const eventKey = push(ref(db(), 'tracking_events')).key!
    const auditKey = push(ref(db(), 'audit_logs')).key!
    const user = auth().currentUser
    const changes: Record<string, unknown> = {}
    changes[`shipments/${id}`] = shipment
    changes[`customer_shipments/${senderRaw.profileId}/${id}`] = true
    changes[`customer_shipments/${receiverRaw.profileId}/${id}`] = true
    changes[`tracking_events/${eventKey}`] = { shipmentId: id, status: 'created', description: 'Shipment created', warehouseId: input.originWarehouseId, eventTime: stamp }
    changes[`shipment_tracking_events/${id}/${eventKey}`] = true
    changes[`audit_logs/${auditKey}`] = { shipmentId: id, trackingNumber: shipment.trackingNumber, action: 'INSERT', oldStatus: null, newStatus: 'created', changedBy: user?.uid || 'system', changedAt: stamp }
    await update(ref(db()), changes)
  },
  async assignShipmentRoute(shipmentId: number, routeId: number) {
    const [shipmentSnap, routeSnap, couriers, warehouses] = await Promise.all([
      get(ref(db(), `shipments/${shipmentId}`)), get(ref(db(), `routes/${routeId}`)), rows('couriers'), rows('warehouses'),
    ])
    if (!shipmentSnap.exists() || !routeSnap.exists()) throw new Error('Shipment or route not found.')
    const shipment = shipmentSnap.val() as Row
    const route = routeSnap.val() as Row
    if (['delivered', 'cancelled'].includes(shipment.status)) throw new Error('Completed shipments cannot be reassigned.')
    if (Number(route.originWarehouseId) !== Number(shipment.originWarehouseId)) throw new Error('Route origin must match shipment origin.')
    if (['completed', 'cancelled'].includes(route.status)) throw new Error('Route is not available.')
    const courier = couriers.find(c => Number(c.id) === Number(route.courierId))
    const destination = warehouses.find(w => Number(w.id) === Number(route.destinationWarehouseId))
    const previousCourierUid = shipment.courierProfileId as string | undefined
    const nextCourierUid = courier?.profileId as string | undefined
    const stamp = now()
    const eventKey = push(ref(db(), 'tracking_events')).key!
    const auditKey = push(ref(db(), 'audit_logs')).key!
    const user = auth().currentUser
    const changes: Record<string, unknown> = {
      [`shipments/${shipmentId}/currentRouteId`]: routeId,
      [`shipments/${shipmentId}/courierProfileId`]: nextCourierUid || null,
      [`shipments/${shipmentId}/courier`]: courier?.fullName || courier?.courierCode || 'Not assigned',
      [`shipments/${shipmentId}/destination`]: destination?.city || destination?.name || 'Not assigned',
      [`shipments/${shipmentId}/updatedAt`]: stamp,
      [`tracking_events/${eventKey}`]: { shipmentId, status: shipment.status, description: `Route assigned: RTE-${routeId}`, warehouseId: shipment.currentWarehouseId || shipment.originWarehouseId, routeId, eventTime: stamp },
      [`shipment_tracking_events/${shipmentId}/${eventKey}`]: true,
      [`audit_logs/${auditKey}`]: { shipmentId, trackingNumber: shipment.trackingNumber, action: 'UPDATE', oldStatus: shipment.status, newStatus: shipment.status, changedBy: user?.uid || 'system', changedAt: stamp },
    }
    if (previousCourierUid && previousCourierUid !== nextCourierUid) changes[`courier_shipments/${previousCourierUid}/${shipmentId}`] = null
    if (nextCourierUid) changes[`courier_shipments/${nextCourierUid}/${shipmentId}`] = true
    await update(ref(db()), changes)
  },
  async updateShipmentStatus(id: number, status: ShipmentStatus, description = 'Shipment status updated') {
    const dbStatus = UI_TO_DB_STATUS[status]
    if (!dbStatus) throw new Error(`Status ${status} cannot be saved.`)
    const target = ref(db(), `shipments/${id}`)
    let previousStatus: string | null = null
    let transitionError = ''
    const result = await runTransaction(target, current => {
      if (!current) { transitionError = 'Shipment not found.'; return }
      const currentStatus = String(current.status || '')
      const allowed = ALLOWED_NEXT_STATUSES[currentStatus] || []
      if (!allowed.includes(status)) { transitionError = `Transition from ${currentStatus} to ${dbStatus} is not allowed.`; return }
      previousStatus = currentStatus
      return { ...current, status: dbStatus, updatedAt: now() }
    })
    if (transitionError) throw new Error(transitionError)
    if (!result.committed || !result.snapshot.exists()) throw new Error('Shipment update failed.')
    const shipment = result.snapshot.val() as Row
    const stamp = String(shipment.updatedAt || now())
    const eventKey = push(ref(db(), 'tracking_events')).key!
    const auditKey = push(ref(db(), 'audit_logs')).key!
    const user = auth().currentUser
    const changes: Record<string, unknown> = {}
    changes[`tracking_events/${eventKey}`] = { shipmentId: id, status: dbStatus, description, warehouseId: shipment.currentWarehouseId || shipment.originWarehouseId, routeId: shipment.currentRouteId ?? null, eventTime: stamp }
    changes[`shipment_tracking_events/${id}/${eventKey}`] = true
    changes[`audit_logs/${auditKey}`] = { shipmentId: id, trackingNumber: shipment.trackingNumber, action: 'UPDATE', oldStatus: previousStatus, newStatus: dbStatus, changedBy: user?.uid || 'system', changedAt: stamp }
    await update(ref(db()), changes)
  },
}
