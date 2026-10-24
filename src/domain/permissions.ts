export type AppRole = 'admin' | 'staff' | 'courier' | 'customer'

// UI visibility only. Real authorization MUST be enforced by PostgreSQL RLS/RPC
// or Firebase Security Rules, never by this client-side helper alone.
export const canViewAuditLogs = (role: AppRole) => role === 'admin'
export const canManageShipments = (role: AppRole) => role === 'admin' || role === 'staff'
