export type ShipmentStatus =
  | 'Pending'
  | 'Picked up'
  | 'In transit'
  | 'At transit warehouse'
  | 'Out for delivery'
  | 'Delivered'
  | 'Cancelled'
  | 'Exception'

export interface Shipment {
  id: number
  trackingNumber: string
  /** Internal identifiers used for role-aware actions; never shown as customer data. */
  originWarehouseId?: number
  currentRouteId?: number | null
  courierProfileId?: string | null
  recipient: string
  origin: string
  destination: string
  courier: string
  status: ShipmentStatus
  updatedAt: string
  /** ISO timestamp used for dashboard aggregation and backend comparison. */
  createdAt?: string
  eta: string
  amount: number
}

export const statusTone: Record<ShipmentStatus, string> = {
  Pending: 'amber',
  'Picked up': 'blue',
  'In transit': 'violet',
  'At transit warehouse': 'blue',
  'Out for delivery': 'violet',
  Delivered: 'green',
  Cancelled: 'red',
  Exception: 'red',
}

export const DB_TO_UI_STATUS: Record<string, ShipmentStatus> = {
  created: 'Pending',
  picked_up: 'Picked up',
  in_transit: 'In transit',
  at_transit_warehouse: 'At transit warehouse',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

export const UI_TO_DB_STATUS: Partial<Record<ShipmentStatus, string>> = {
  Pending: 'created',
  'Picked up': 'picked_up',
  'In transit': 'in_transit',
  'At transit warehouse': 'at_transit_warehouse',
  'Out for delivery': 'out_for_delivery',
  Delivered: 'delivered',
  Cancelled: 'cancelled',
}

export const ALLOWED_NEXT_STATUSES: Record<string, ShipmentStatus[]> = {
  created: ['Picked up', 'Cancelled'],
  picked_up: ['In transit', 'Cancelled'],
  in_transit: ['At transit warehouse'],
  at_transit_warehouse: ['Out for delivery'],
  out_for_delivery: ['Delivered'],
  delivered: [],
  cancelled: [],
}
