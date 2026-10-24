import type { BackendAdapter, DashboardSummary, CustomerOption, WarehouseOption, TrackingEvent, AppProfile, CreateShipmentInput, CourierOption, RouteRecord, AuditLogRecord, CreateRouteInput, CreateWarehouseInput } from '../contracts'
import type { Shipment, ShipmentStatus } from '@/domain/shipment'
import { DB_TO_UI_STATUS, UI_TO_DB_STATUS } from '@/domain/shipment'
import { supabase, supabaseConfigured } from './client'

function client() {
  if (!supabaseConfigured || !supabase) throw new Error('Konfigurasi Supabase belum lengkap. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di .env.local.')
  return supabase
}
function fail(error: { message?: string } | null) { if (error) throw new Error(error.message || 'Permintaan Supabase gagal.') }
function fmtTime(value: string | null | undefined) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }).format(new Date(value))
}
type NestedProfile = { full_name?: string } | null
type NestedCustomer = { id: number; profile_id: string; phone: string; address: string; profile?: NestedProfile } | null
type NestedWarehouse = { id: number; name: string; city: string; address: string } | null
type NestedCourier = { id: number; courier_code: string; profile_id?: string; profile?: NestedProfile } | null
type ShipmentRecord = {
  id: number; tracking_number: string; sender_id: number; receiver_id: number; origin_warehouse_id: number; current_warehouse_id: number | null; current_route_id: number | null; weight_kg: number | string; status: string; created_at: string; updated_at: string;
  sender?: NestedCustomer; receiver?: NestedCustomer; origin?: NestedWarehouse; current_warehouse?: NestedWarehouse; route?: { id: number; status: string; courier?: NestedCourier; destination?: NestedWarehouse } | null
}

export const supabaseAdapter: BackendAdapter = {
  provider: 'supabase',
  async getProfile(): Promise<AppProfile | null> {
    const sb = client()
    const { data: authData, error: authError } = await sb.auth.getUser()
    fail(authError)
    if (!authData.user) return null
    const { data, error } = await sb.from('profiles').select('id, full_name, role').eq('id', authData.user.id).maybeSingle()
    fail(error)
    if (!data) return null
    return { id: data.id, fullName: data.full_name || authData.user.email?.split('@')[0] || 'Pengguna', email: authData.user.email || '', role: data.role }
  },
  async getShipments(): Promise<Shipment[]> {
    const sb = client()
    const select = 'id,tracking_number,sender_id,receiver_id,origin_warehouse_id,current_warehouse_id,current_route_id,weight_kg,status,created_at,updated_at,sender:customers!shipments_sender_id_fkey(id,profile_id,phone,address,profile:profiles!customers_profile_id_fkey(full_name)),receiver:customers!shipments_receiver_id_fkey(id,profile_id,phone,address,profile:profiles!customers_profile_id_fkey(full_name)),origin:warehouses!shipments_origin_warehouse_id_fkey(id,name,city,address),current_warehouse:warehouses!shipments_current_warehouse_id_fkey(id,name,city,address),route:routes!shipments_current_route_id_fkey(id,status,courier:couriers!routes_courier_id_fkey(id,courier_code,profile_id,profile:profiles!couriers_profile_id_fkey(full_name)),destination:warehouses!routes_destination_warehouse_id_fkey(id,name,city,address))'
    const { data, error } = await sb.from('shipments').select(select).order('updated_at', { ascending: false })
    fail(error)
    return ((data || []) as unknown as ShipmentRecord[]).map((row) => ({
      id: Number(row.id), trackingNumber: row.tracking_number, originWarehouseId: Number(row.origin_warehouse_id), currentRouteId: row.current_route_id == null ? null : Number(row.current_route_id), courierProfileId: row.route?.courier?.profile_id || null,
      recipient: row.receiver?.profile?.full_name || `Pelanggan #${row.receiver_id}`,
      origin: row.origin?.city || row.origin?.name || `Warehouse #${row.origin_warehouse_id}`,
      destination: row.route?.destination?.city || row.route?.destination?.name || row.receiver?.address || 'Belum ditentukan',
      courier: row.route?.courier?.profile?.full_name || row.route?.courier?.courier_code || 'Belum ditugaskan',
      status: DB_TO_UI_STATUS[row.status] || 'Exception', updatedAt: fmtTime(row.updated_at), eta: 'Belum tersedia', amount: 0,
    }))
  },
  async getSummary(): Promise<DashboardSummary> {
    const rows = await supabaseAdapter.getShipments()
    const { data, error } = await client().from('shipments').select('created_at,status')
    fail(error)
    const now = new Date()
    const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(now); d.setHours(0,0,0,0); d.setDate(d.getDate() - (6 - i)); return d })
    const weekly = days.map(day => (data || []).filter((row: any) => { const created = new Date(row.created_at); return created >= day && created < new Date(day.getTime() + 86400000) }).length)
    return { total: rows.length, inTransit: rows.filter(s => ['Picked up','In transit','At transit warehouse','Out for delivery'].includes(s.status)).length, delivered: rows.filter(s => s.status === 'Delivered').length, exceptions: rows.filter(s => s.status === 'Cancelled' || s.status === 'Exception').length, weekly }
  },
  async getCustomers(): Promise<CustomerOption[]> {
    const sb = client()
    const { data, error } = await sb.from('customers').select('id,phone,address,profile:profiles!customers_profile_id_fkey(full_name)').order('id')
    fail(error)
    return (data || []).map((row: any) => ({ id: Number(row.id), fullName: row.profile?.full_name || `Pelanggan #${row.id}`, phone: row.phone, address: row.address }))
  },
  async getWarehouses(): Promise<WarehouseOption[]> {
    const sb = client()
    const { data, error } = await sb.from('warehouses').select('id,name,city,address').order('name')
    fail(error)
    return (data || []).map((row: any) => ({ id: Number(row.id), name: row.name, city: row.city, address: row.address }))
  },
  async getCouriers(): Promise<CourierOption[]> {
    const { data, error } = await client().from('couriers').select('id,courier_code,active,profile:profiles!couriers_profile_id_fkey(full_name)').eq('active', true).order('courier_code')
    fail(error)
    return (data || []).map((row: any) => ({ id: Number(row.id), fullName: row.profile?.full_name || row.courier_code, courierCode: row.courier_code, active: row.active }))
  },
  async getRoutes(): Promise<RouteRecord[]> {
    const select = 'id,courier_id,origin_warehouse_id,destination_warehouse_id,departure_at,arrival_at,status,created_at,courier:couriers!routes_courier_id_fkey(id,courier_code,profile_id,profile:profiles!couriers_profile_id_fkey(full_name)),origin:warehouses!routes_origin_warehouse_id_fkey(id,name,city),destination:warehouses!routes_destination_warehouse_id_fkey(id,name,city)'
    const { data, error } = await client().from('routes').select(select).order('created_at', { ascending: false })
    fail(error)
    return (data || []).map((row: any) => ({ id: Number(row.id), courierId: Number(row.courier_id), courierName: row.courier?.profile?.full_name || row.courier?.courier_code || 'Kurir', courierCode: row.courier?.courier_code || '—', originWarehouseId: Number(row.origin_warehouse_id), origin: row.origin?.city || row.origin?.name || `Warehouse #${row.origin_warehouse_id}`, destinationWarehouseId: Number(row.destination_warehouse_id), destination: row.destination?.city || row.destination?.name || `Warehouse #${row.destination_warehouse_id}`, departureAt: row.departure_at, arrivalAt: row.arrival_at, status: row.status, createdAt: row.created_at }))
  },
  async getAuditLogs(): Promise<AuditLogRecord[]> {
    const select = 'id,shipment_id,action,old_status,new_status,changed_by,changed_at,shipment:shipments!audit_logs_shipment_id_fkey(tracking_number),changer:profiles!audit_logs_changed_by_fkey(full_name)'
    const { data, error } = await client().from('audit_logs').select(select).order('changed_at', { ascending: false }).limit(500)
    fail(error)
    return (data || []).map((row: any) => ({ id: Number(row.id), shipmentId: Number(row.shipment_id), trackingNumber: row.shipment?.tracking_number || `Shipment #${row.shipment_id}`, action: row.action, oldStatus: row.old_status, newStatus: row.new_status, changedBy: row.changer?.full_name || row.changed_by || 'System', changedAt: fmtTime(row.changed_at) }))
  },
  async createWarehouse(input: CreateWarehouseInput) {
    const { error } = await client().from('warehouses').insert({ name: input.name.trim(), city: input.city.trim(), address: input.address.trim() })
    fail(error)
  },
  async updateWarehouse(id: number, input: CreateWarehouseInput) {
    const { data, error } = await client().from('warehouses').update({ name: input.name.trim(), city: input.city.trim(), address: input.address.trim() }).eq('id', id).select('id').maybeSingle()
    fail(error)
    if (!data) throw new Error('Gudang tidak ditemukan atau perubahan ditolak oleh policy database.')
  },
  async createRoute(input: CreateRouteInput) {
    const { error } = await client().from('routes').insert({ courier_id: input.courierId, origin_warehouse_id: input.originWarehouseId, destination_warehouse_id: input.destinationWarehouseId, departure_at: input.departureAt, arrival_at: input.arrivalAt, status: input.status })
    fail(error)
  },
  async updateRoute(id: number, input: CreateRouteInput) {
    const { data, error } = await client().from('routes').update({ courier_id: input.courierId, origin_warehouse_id: input.originWarehouseId, destination_warehouse_id: input.destinationWarehouseId, departure_at: input.departureAt, arrival_at: input.arrivalAt, status: input.status }).eq('id', id).select('id').maybeSingle()
    fail(error)
    if (!data) throw new Error('Rute tidak ditemukan atau perubahan ditolak oleh policy database.')
  },
  async updateRouteStatus(id: number, status: RouteRecord['status']) {
    const { error } = await client().from('routes').update({ status }).eq('id', id)
    fail(error)
  },
  async getTrackingEvents(shipmentId: number): Promise<TrackingEvent[]> {
    const sb = client()
    const { data, error } = await sb.from('tracking_events').select('id,status,description,event_time,warehouse:warehouses!tracking_events_warehouse_id_fkey(name,city)').eq('shipment_id', shipmentId).order('event_time', { ascending: true })
    fail(error)
    return (data || []).map((row: any) => ({ id: Number(row.id), status: DB_TO_UI_STATUS[row.status] || row.status, description: row.description || '', eventTime: fmtTime(row.event_time), warehouse: row.warehouse?.city || row.warehouse?.name || 'Lokasi belum tersedia' }))
  },
  async updateProfile(fullName: string) {
    const sb = client()
    const { data: authData, error: authError } = await sb.auth.getUser()
    fail(authError)
    if (!authData.user) throw new Error('Sesi login tidak ditemukan. Silakan login kembali.')
    const { data, error } = await sb.from('profiles').update({ full_name: fullName.trim() }).eq('id', authData.user.id).select('id').maybeSingle()
    fail(error)
    if (!data) throw new Error('Profil tidak dapat diperbarui. Periksa policy UPDATE profil dan migration akses profil.')
  },
  async signIn(email: string, password: string) { const { error } = await client().auth.signInWithPassword({ email, password }); fail(error) },
  async signOut() { const { error } = await client().auth.signOut(); fail(error) },
  async createShipment(input: CreateShipmentInput) {
    const { error } = await client().rpc('create_shipment', { p_tracking_number: input.trackingNumber, p_sender_id: input.senderId, p_receiver_id: input.receiverId, p_origin_warehouse_id: input.originWarehouseId, p_weight_kg: input.weightKg })
    fail(error)
  },
  async assignShipmentRoute(shipmentId: number, routeId: number) {
    const { error } = await client().rpc('assign_shipment_route', { p_shipment_id: shipmentId, p_route_id: routeId })
    fail(error)
  },
  async updateShipmentStatus(id: number, status: ShipmentStatus, description = 'Shipment status updated') {
    const dbStatus = UI_TO_DB_STATUS[status]
    if (!dbStatus) throw new Error(`Status ${status} tidak dapat disimpan ke database.`)
    const { error } = await client().rpc('update_shipment_status', { p_shipment_id: id, p_new_status: dbStatus, p_warehouse_id: null, p_route_id: null, p_description: description })
    fail(error)
  },
}
