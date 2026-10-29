import { demoAdapter } from './demo'
import { supabaseAdapter } from './supabase/adapter'
import { firebaseAdapter } from './firebase/adapter'
import type { BackendAdapter } from './contracts'

const provider = (import.meta.env.VITE_BACKEND_PROVIDER || 'firebase').toLowerCase()
export const backend: BackendAdapter = provider === 'supabase' ? supabaseAdapter : provider === 'firebase' ? firebaseAdapter : demoAdapter
