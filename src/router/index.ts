import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '@/views/DashboardView.vue'
import ShipmentsView from '@/views/ShipmentsView.vue'
import TrackingView from '@/views/TrackingView.vue'
import RoutesView from '@/views/RoutesView.vue'
import WarehousesView from '@/views/WarehousesView.vue'
import AuditLogsView from '@/views/AuditLogsView.vue'
import LoginView from '@/views/LoginView.vue'
import ProfileView from '@/views/ProfileView.vue'
import { backend } from '@/services/backend'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/dashboard' },
    { path: '/login', component: LoginView, meta: { title: 'Masuk', public: true } },
    { path: '/profile', component: ProfileView, meta: { title: 'Profil' } },
    { path: '/dashboard', component: DashboardView, meta: { title: 'Dasbor' } },
    { path: '/shipments', component: ShipmentsView, meta: { title: 'Pengiriman' } },
    { path: '/tracking', component: TrackingView, meta: { title: 'Pelacakan' } },
    { path: '/routes', component: RoutesView, meta: { title: 'Rute' } },
    { path: '/warehouses', component: WarehousesView, meta: { title: 'Gudang' } },
    { path: '/audit-logs', component: AuditLogsView, meta: { title: 'Log audit' } },
    { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach(async (to) => {
  if (backend.provider === 'demo') return true
  if (to.meta.public) {
    try { if (await backend.getProfile()) return typeof to.query.redirect === 'string' ? to.query.redirect : '/dashboard' } catch { /* show login if session cannot be restored */ }
    return true
  }
  try {
    const profile = await backend.getProfile()
    if (!profile) return { path: '/login', query: { redirect: to.fullPath } }
    return true
  } catch {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
})

export default router
