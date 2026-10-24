import { demoAdapter } from './demo'
import { supabaseAdapter } from './supabase/adapter'
import type { BackendAdapter } from './contracts'

const provider = (import.meta.env.VITE_BACKEND_PROVIDER || 'demo').toLowerCase()
export const backend: BackendAdapter = provider === 'supabase' ? supabaseAdapter : demoAdapter
