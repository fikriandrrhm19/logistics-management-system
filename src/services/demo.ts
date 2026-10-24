import type { BackendAdapter, DashboardSummary, CustomerOption, WarehouseOption, TrackingEvent, AppProfile, CreateShipmentInput, CourierOption, RouteRecord, AuditLogRecord, CreateRouteInput, CreateWarehouseInput } from './contracts'
import type { Shipment, ShipmentStatus } from '@/domain/shipment'

let shipments: Shipment[] = [
  { id: 1201, trackingNumber: 'TRK-2601-1201', originWarehouseId: 1, currentRouteId: 1, recipient: 'Nadia Putri', origin: 'Jakarta Selatan', destination: 'Bandung', courier: 'Rizky Pratama', status: 'In transit', updatedAt: '10:42', eta: 'Demo', amount: 0 },
  { id: 1202, trackingNumber: 'TRK-2601-1202', originWarehouseId: 1, currentRouteId: 2, recipient: 'Bima Saputra', origin: 'Jakarta Pusat', destination: 'Yogyakarta', courier: 'Dimas Ardi', status: 'Picked up', updatedAt: '10:18', eta: 'Demo', amount: 0 },
  { id: 1203, trackingNumber: 'TRK-2601-1203', originWarehouseId: 2, currentRouteId: null, recipient: 'Alya Maharani', origin: 'Bandung', destination: 'Surabaya', courier: 'Sinta Dewi', status: 'Delivered', updatedAt: '09:56', eta: 'Demo', amount: 0 },
  { id: 1204, trackingNumber: 'TRK-2601-1204', originWarehouseId: 1, currentRouteId: null, recipient: 'Rafi Akbar', origin: 'Semarang', destination: 'Jakarta Utara', courier: 'Belum ditugaskan', status: 'Pending', updatedAt: '09:32', eta: 'Demo', amount: 0 },
]
const customers: CustomerOption[] = [
  { id: 1, fullName: 'Nadia Putri', phone: '081200000001', address: 'Bandung' },
  { id: 2, fullName: 'Bima Saputra', phone: '081200000002', address: 'Yogyakarta' },
  { id: 3, fullName: 'Alya Maharani', phone: '081200000003', address: 'Surabaya' },
  { id: 4, fullName: 'Rafi Akbar', phone: '081200000004', address: 'Jakarta Utara' },
]
let warehouses: WarehouseOption[] = [
  { id: 1, name: 'Jakarta Central Hub', city: 'Jakarta', address: 'Jakarta' },
  { id: 2, name: 'Bandung Distribution Center', city: 'Bandung', address: 'Bandung' },
]
let nextId = 1205
let nextWarehouseId = 3
let nextRouteId = 4
const couriers: CourierOption[] = [{ id: 1, fullName: 'Rizky Pratama', courierCode: 'CR-001', active: true }, { id: 2, fullName: 'Dimas Ardi', courierCode: 'CR-002', active: true }, { id: 3, fullName: 'Sinta Dewi', courierCode: 'CR-003', active: true }]
let routes: RouteRecord[] = [
  { id: 1, courierId: 1, courierName: 'Rizky Pratama', courierCode: 'CR-001', originWarehouseId: 1, origin: 'Jakarta', destinationWarehouseId: 2, destination: 'Bandung', departureAt: null, arrivalAt: null, status: 'in_progress', createdAt: new Date().toISOString() },
  { id: 2, courierId: 2, courierName: 'Dimas Ardi', courierCode: 'CR-002', originWarehouseId: 1, origin: 'Jakarta', destinationWarehouseId: 2, destination: 'Bandung', departureAt: null, arrivalAt: null, status: 'planned', createdAt: new Date().toISOString() },
]
let auditLogs: AuditLogRecord[] = []
let demoProfile: AppProfile = { id: 'demo-user', fullName: 'Demo Operator', email: 'demo@trackest.local', role: 'admin' }
export const demoAdapter: BackendAdapter = {
  provider: 'demo',
  async getShipments() { return [...shipments] },
  async getSummary(): Promise<DashboardSummary> {
    return { total: shipments.length, inTransit: shipments.filter(s => ['Picked up','In transit','At transit warehouse','Out for delivery'].includes(s.status)).length, delivered: shipments.filter(s => s.status === 'Delivered').length, exceptions: shipments.filter(s => s.status === 'Cancelled' || s.status === 'Exception').length, weekly: [32,44,38,57,48,72,63] }
  },
  async getCustomers() { return [...customers] },
  async getWarehouses() { return [...warehouses] },
  async getCouriers() { return [...couriers] },
  async getRoutes() { return [...routes] },
  async getAuditLogs() { return [...auditLogs] },
  async createWarehouse(input: CreateWarehouseInput) { warehouses.push({ id: nextWarehouseId++, name: input.name.trim(), city: input.city.trim(), address: input.address.trim() }) },
  async updateWarehouse(id: number, input: CreateWarehouseInput) { const index = warehouses.findIndex(w => w.id === id); if (index < 0) throw new Error('Gudang tidak ditemukan.'); warehouses = warehouses.map(w => w.id === id ? { id, name: input.name.trim(), city: input.city.trim(), address: input.address.trim() } : w) },
  async createRoute(input: CreateRouteInput) { const c = couriers.find(x => x.id === input.courierId); const o = warehouses.find(x => x.id === input.originWarehouseId); const d = warehouses.find(x => x.id === input.destinationWarehouseId); if (!c || !o || !d) throw new Error('Pilih kurir dan gudang yang tersedia.'); if (o.id === d.id) throw new Error('Gudang asal dan tujuan harus berbeda.'); routes.unshift({ id: nextRouteId++, courierId: c.id, courierName: c.fullName, courierCode: c.courierCode, originWarehouseId: o.id, origin: o.city, destinationWarehouseId: d.id, destination: d.city, departureAt: input.departureAt, arrivalAt: input.arrivalAt, status: input.status, createdAt: new Date().toISOString() }) },
  async updateRoute(id: number, input: CreateRouteInput) { const c = couriers.find(x => x.id === input.courierId); const o = warehouses.find(x => x.id === input.originWarehouseId); const d = warehouses.find(x => x.id === input.destinationWarehouseId); if (!c || !o || !d) throw new Error('Pilih kurir dan gudang yang tersedia.'); if (o.id === d.id) throw new Error('Gudang asal dan tujuan harus berbeda.'); if (!routes.some(r => r.id === id)) throw new Error('Rute tidak ditemukan.'); routes = routes.map(r => r.id === id ? { ...r, courierId: c.id, courierName: c.fullName, courierCode: c.courierCode, originWarehouseId: o.id, origin: o.city, destinationWarehouseId: d.id, destination: d.city, departureAt: input.departureAt, arrivalAt: input.arrivalAt, status: input.status } : r) },
  async updateRouteStatus(id: number, status: RouteRecord['status']) { routes = routes.map(r => r.id === id ? { ...r, status } : r) },
  async getTrackingEvents(shipmentId: number): Promise<TrackingEvent[]> {
    const s = shipments.find(item => item.id === shipmentId)
    if (!s) return []
    return [{ id: 1, status: 'Pending', description: 'Shipment registered in demo mode', eventTime: s.updatedAt, warehouse: s.origin }]
  },
  async getProfile(): Promise<AppProfile | null> { return { ...demoProfile } },
  async updateProfile(fullName: string) { if (!fullName.trim()) throw new Error('Nama wajib diisi.'); demoProfile = { ...demoProfile, fullName: fullName.trim() } },
  async signIn() { /* demo login is intentionally not real authentication */ },
  async signOut() {},
  async createShipment(input: CreateShipmentInput) {
    const sender = customers.find(c => c.id === input.senderId)
    const receiver = customers.find(c => c.id === input.receiverId)
    const warehouse = warehouses.find(w => w.id === input.originWarehouseId)
    if (!sender || !receiver || !warehouse) throw new Error('Pilih customer dan warehouse demo yang tersedia.')
    if (sender.id === receiver.id) throw new Error('Pengirim dan penerima harus berbeda.')
    if (shipments.some(s => s.trackingNumber === input.trackingNumber)) throw new Error('Nomor tracking sudah digunakan.')
    const id = nextId++
    shipments = [{ id, trackingNumber: input.trackingNumber, recipient: receiver.fullName, origin: warehouse.city, originWarehouseId: warehouse.id, currentRouteId: null, destination: receiver.address, courier: 'Belum ditugaskan', status: 'Pending', updatedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }), eta: 'Belum tersedia', amount: 0 }, ...shipments]
    auditLogs.unshift({ id, shipmentId: id, trackingNumber: input.trackingNumber, action: 'INSERT', oldStatus: null, newStatus: 'created', changedBy: 'Demo Operator', changedAt: new Date().toLocaleTimeString('id-ID') })
  },
  async assignShipmentRoute(shipmentId: number, routeId: number) {
    const shipment = shipments.find(s => s.id === shipmentId)
    const route = routes.find(r => r.id === routeId)
    if (!shipment || !route) throw new Error('Shipment atau rute tidak ditemukan.')
    if (shipment.status === 'Delivered' || shipment.status === 'Cancelled') throw new Error('Shipment selesai atau dibatalkan tidak dapat ditugaskan.')
    if (route.originWarehouseId !== shipment.originWarehouseId) throw new Error('Gudang asal rute harus sama dengan gudang asal shipment.')
    if (route.status === 'completed' || route.status === 'cancelled') throw new Error('Rute selesai atau dibatalkan tidak dapat digunakan.')
    shipments = shipments.map(s => s.id === shipmentId ? { ...s, currentRouteId: route.id, courier: route.courierName, destination: route.destination, updatedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) } : s)
    auditLogs.unshift({ id: Date.now(), shipmentId, trackingNumber: shipment.trackingNumber, action: 'UPDATE', oldStatus: shipment.status, newStatus: shipment.status, changedBy: demoProfile.fullName, changedAt: new Date().toLocaleTimeString('id-ID') })
  },
  async updateShipmentStatus(id: number, status: ShipmentStatus) {
    const current = shipments.find(s => s.id === id)
    shipments = shipments.map(s => s.id === id ? { ...s, status, updatedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) } : s)
    if (current) auditLogs.unshift({ id: Date.now(), shipmentId: id, trackingNumber: current.trackingNumber, action: 'UPDATE', oldStatus: current.status, newStatus: status, changedBy: 'Demo Operator', changedAt: new Date().toLocaleTimeString('id-ID') })
  },
}
