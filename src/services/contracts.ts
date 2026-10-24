import type { Shipment, ShipmentStatus } from '@/domain/shipment'

export interface DashboardSummary {
  total: number
  inTransit: number
  delivered: number
  exceptions: number
  weekly: number[]
}

export interface CustomerOption { id: number; fullName: string; phone: string; address: string }
export interface WarehouseOption { id: number; name: string; city: string; address: string }
export interface TrackingEvent { id: number; status: string; description: string; eventTime: string; warehouse: string }
export interface CourierOption { id: number; fullName: string; courierCode: string; active: boolean }
export interface RouteRecord { id: number; courierId: number; courierName: string; courierCode: string; originWarehouseId: number; origin: string; destinationWarehouseId: number; destination: string; departureAt: string | null; arrivalAt: string | null; status: 'planned' | 'in_progress' | 'completed' | 'cancelled'; createdAt: string }
export interface AuditLogRecord { id: number; shipmentId: number; trackingNumber: string; action: string; oldStatus: string | null; newStatus: string | null; changedBy: string; changedAt: string }
export interface CreateRouteInput { courierId: number; originWarehouseId: number; destinationWarehouseId: number; departureAt: string | null; arrivalAt: string | null; status: 'planned' | 'in_progress' | 'completed' | 'cancelled' }
export interface CreateWarehouseInput { name: string; city: string; address: string }
export interface AppProfile { id: string; fullName: string; email?: string; role: 'admin' | 'staff' | 'courier' | 'customer' }
export interface CreateShipmentInput { trackingNumber: string; senderId: number; receiverId: number; originWarehouseId: number; weightKg: number }

export interface BackendAdapter {
  readonly provider: 'demo' | 'supabase' | 'firebase'
  getShipments(): Promise<Shipment[]>
  getSummary(): Promise<DashboardSummary>
  getCustomers(): Promise<CustomerOption[]>
  getWarehouses(): Promise<WarehouseOption[]>
  getCouriers(): Promise<CourierOption[]>
  getRoutes(): Promise<RouteRecord[]>
  getAuditLogs(): Promise<AuditLogRecord[]>
  createWarehouse(input: CreateWarehouseInput): Promise<void>
  updateWarehouse(id: number, input: CreateWarehouseInput): Promise<void>
  createRoute(input: CreateRouteInput): Promise<void>
  updateRoute(id: number, input: CreateRouteInput): Promise<void>
  updateRouteStatus(id: number, status: RouteRecord['status']): Promise<void>
  getTrackingEvents(shipmentId: number): Promise<TrackingEvent[]>
  getProfile(): Promise<AppProfile | null>
  updateProfile(fullName: string): Promise<void>
  signIn(email: string, password: string): Promise<void>
  signOut(): Promise<void>
  createShipment(input: CreateShipmentInput): Promise<void>
  assignShipmentRoute(shipmentId: number, routeId: number): Promise<void>
  updateShipmentStatus(id: number, status: ShipmentStatus, description?: string): Promise<void>
}
