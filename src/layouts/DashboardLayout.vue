<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { backend } from '@/services/backend'
import type { AppProfile } from '@/services/contracts'

const route = useRoute()
const router = useRouter()
const mobileOpen = ref(false)
const profileMenuOpen = ref(false)
const profileMenuRef = ref<HTMLElement | null>(null)
const { message, kind, show } = useToast()
const profile = ref<AppProfile | null>(null)

const nav = [
  { label: 'Ruang kerja', items: [
    { to: '/dashboard', icon: '▦', label: 'Dasbor' },
    { to: '/shipments', icon: '≡', label: 'Pengiriman' },
    { to: '/tracking', icon: '◎', label: 'Pelacakan' },
  ] },
  { label: 'Operasional', items: [
    { to: '/routes', icon: '↗', label: 'Rute' },
    { to: '/warehouses', icon: '▤', label: 'Gudang' },
  ] },
  { label: 'Administrasi', items: [
    { to: '/audit-logs', icon: '◷', label: 'Log audit' },
  ] },
]

async function loadProfile() {
  try {
    profile.value = await backend.getProfile()
  } catch {
    profile.value = null
  }
}

function closeProfileMenu() {
  profileMenuOpen.value = false
}

function handleOutsideClick(event: PointerEvent) {
  if (profileMenuRef.value && !profileMenuRef.value.contains(event.target as Node)) {
    closeProfileMenu()
  }
}

function handleEscape(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeProfileMenu()
    mobileOpen.value = false
  }
}

onMounted(() => {
  void loadProfile()
  document.addEventListener('pointerdown', handleOutsideClick)
  document.addEventListener('keydown', handleEscape)
  window.addEventListener('trackest:profile-updated', loadProfile)
})
onUnmounted(() => {
  document.removeEventListener('pointerdown', handleOutsideClick)
  document.removeEventListener('keydown', handleEscape)
  window.removeEventListener('trackest:profile-updated', loadProfile)
})

const displayName = computed(() => profile.value?.fullName || (backend.provider === 'demo' ? 'Operator demo' : 'Pengguna'))
const displayRole = computed(() => {
  const roles: Record<string, string> = { admin: 'Administrator', staff: 'Staf operasional', courier: 'Kurir', customer: 'Pelanggan' }
  return profile.value ? roles[profile.value.role] || profile.value.role : backend.provider === 'demo' ? 'Mode demo' : 'Akun'
})
const initials = computed(() => displayName.value.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'U')

async function logout() {
  try {
    await backend.signOut()
    closeProfileMenu()
    show('Kamu sudah keluar dari sesi.', 'success')
    await router.push('/login')
  } catch (e) {
    show(e instanceof Error ? e.message : 'Gagal keluar dari sesi.', 'error')
  }
}
</script>

<template>
  <div class="app-shell">
    <button v-if="mobileOpen" class="mobile-scrim" aria-label="Tutup menu" @click="mobileOpen = false"></button>

    <aside class="sidebar" :class="{ 'sidebar-open': mobileOpen }">
      <RouterLink to="/dashboard" class="brand" @click="mobileOpen = false">
        <span class="brand-mark"><span></span><span></span><span></span></span>
        <span><strong>trackest</strong><small>LOGISTIK</small></span>
      </RouterLink>

      <div class="workspace-switch" aria-label="Workspace aktif">
        <span class="workspace-avatar">CU</span>
        <span class="workspace-copy"><strong>Cakrawala University</strong><small>Workspace operasional</small></span>
      </div>

      <nav class="sidebar-nav" aria-label="Navigasi utama">
        <section v-for="group in nav" :key="group.label" class="nav-group">
          <p class="nav-label">{{ group.label }}</p>
          <RouterLink
            v-for="item in group.items"
            :key="item.to"
            :to="item.to"
            class="nav-link"
            :class="{ active: route.path === item.to }"
            @click="mobileOpen = false"
          >
            <span class="nav-icon" aria-hidden="true">{{ item.icon }}</span>
            <span>{{ item.label }}</span>
          </RouterLink>
        </section>
      </nav>

      <div class="sidebar-bottom">
        <RouterLink to="/profile" class="profile-row" @click="mobileOpen = false">
          <span class="profile-avatar">{{ initials }}</span>
          <span class="profile-copy"><strong>{{ displayName }}</strong><small>{{ displayRole }}</small></span>
          <span class="profile-more" aria-hidden="true">↗</span>
        </RouterLink>
      </div>
    </aside>

    <main class="main-area">
      <header class="topbar">
        <div class="topbar-left">
          <button class="mobile-menu icon-button" aria-label="Buka menu" @click="mobileOpen = !mobileOpen">☰</button>

        </div>

        <div class="topbar-actions">
          <div ref="profileMenuRef" class="profile-menu-wrap">
            <button
              class="top-profile"
              type="button"
              aria-haspopup="menu"
              :aria-expanded="profileMenuOpen"
              @click.stop="profileMenuOpen = !profileMenuOpen"
            >
              <span class="profile-avatar small">{{ initials }}</span>
              <span class="top-profile-name">{{ displayName }}</span>
              <span class="chevron" aria-hidden="true">{{ profileMenuOpen ? '⌃' : '⌄' }}</span>
            </button>

            <div v-if="profileMenuOpen" class="profile-dropdown" role="menu">
              <div class="profile-dropdown-header">
                <strong>{{ displayName }}</strong>
                <span>{{ profile?.email || displayRole }}</span>
              </div>
              <RouterLink to="/profile" role="menuitem" class="profile-dropdown-item" @click="closeProfileMenu">
                <span aria-hidden="true">♙</span> Profil dan pengaturan
              </RouterLink>
              <button type="button" role="menuitem" class="profile-dropdown-item profile-dropdown-logout" @click="logout">
                <span aria-hidden="true">↪</span> Keluar
              </button>
            </div>
          </div>
        </div>
      </header>

      <div class="page-content"><slot /></div>
      <footer class="app-footer">
        <span>© 2026 Trackest Logistics</span>
        <span>{{ backend.provider === 'supabase' ? 'Supabase · v2.2.0' : 'Mode demo · v2.2.0' }}</span>
      </footer>
    </main>

    <Transition name="toast">
      <div v-if="message" class="toast-message" :class="`toast-${kind}`" role="status" aria-live="polite">
        <span>{{ kind === 'success' ? '✓' : kind === 'error' ? '!' : 'i' }}</span>{{ message }}
      </div>
    </Transition>
  </div>
</template>
