import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getDatabase } from 'firebase/database'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
}

export const firebaseConfigured = Boolean(config.apiKey && config.authDomain && config.databaseURL && config.projectId)
const app = firebaseConfigured
  ? (getApps().find((item) => item.name === 'trackest') ?? initializeApp(config, 'trackest'))
  : null
export const firebaseAuth = app ? getAuth(app) : null
export const firebaseDatabase = app ? getDatabase(app) : null
