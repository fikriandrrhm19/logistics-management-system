<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import PageHeading from '@/components/PageHeading.vue'
import { backend } from '@/services/backend'
import { useToast } from '@/composables/useToast'
import type { AppProfile } from '@/services/contracts'

const profile = ref<AppProfile | null>(null)
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const form = reactive({ fullName: '' })
const { show } = useToast()

const roleLabels: Record<AppProfile['role'], string> = {
  admin: 'Administrator',
  staff: 'Staf operasional',
  courier: 'Kurir',
  customer: 'Pelanggan',
}
const roleLabel = computed(() => profile.value ? roleLabels[profile.value.role] : '—')
const initials = computed(() => form.fullName.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase() || 'U')

async function load() {
  loading.value = true
  error.value = ''
  try {
    profile.value = await backend.getProfile()
    if (!profile.value) throw new Error('Profil tidak ditemukan untuk akun ini.')
    form.fullName = profile.value.fullName || ''
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Gagal memuat profil.'
  } finally {
    loading.value = false
  }
}

onMounted(load)

async function save() {
  error.value = ''
  const fullName = form.fullName.trim()
  if (fullName.length < 2) {
    error.value = 'Nama harus terdiri dari sedikitnya 2 karakter.'
    return
  }
  if (fullName.length > 120) {
    error.value = 'Nama maksimal 120 karakter.'
    return
  }
  saving.value = true
  try {
    await backend.updateProfile(fullName)
    if (profile.value) profile.value = { ...profile.value, fullName }
    form.fullName = fullName
    window.dispatchEvent(new Event('trackest:profile-updated'))
    show('Profil berhasil diperbarui.', 'success')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Profil gagal disimpan.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <PageHeading
    title="Profil saya"
    :info="backend.provider === 'firebase' ? 'Nama disimpan di profil Firebase Realtime Database. Email dan role dikelola terpisah.' : backend.provider === 'supabase' ? 'Nama disimpan di public.profiles. Anda hanya dapat mengubah nama sendiri; email dan role dikelola terpisah.' : 'Mode demo: perubahan profil hanya sementara.'"
    description="Kelola informasi profil yang digunakan di workspace Trackest."
  >
    <button class="button button-secondary" :disabled="loading || saving" @click="load">Muat ulang</button>
  </PageHeading>

  <div v-if="loading" class="panel profile-panel profile-loading">Memuat informasi akun…</div>
  <div v-else-if="error && !profile" class="notice notice-warning" role="alert">
    {{ error }}
    <button class="button button-secondary" @click="load">Coba lagi</button>
  </div>

  <div v-else-if="profile" class="profile-page-grid">
    <section class="panel profile-overview">
      <div class="profile-avatar-large">{{ initials }}</div>
      <h2>{{ profile.fullName }}</h2>
      <p>{{ profile.email || 'Email tidak tersedia' }}</p>
      <span class="profile-role-badge">{{ roleLabel }}</span>
      <div class="profile-separator"></div>
      <div class="profile-meta-row"><span>Status akun</span><strong>Terautentikasi</strong></div>
    </section>

    <section class="panel profile-panel">
      <div class="profile-panel-heading">
        <div><h2>Informasi pribadi</h2><p>Perubahan nama akan digunakan pada tampilan aplikasi.</p></div>
      </div>
      <form class="profile-form" @submit.prevent="save">
        <label>Nama lengkap
          <input v-model.trim="form.fullName" type="text" autocomplete="name" maxlength="120" required />
        </label>
        <label>Email
          <input :value="profile.email || '—'" type="text" readonly aria-describedby="email-help" />
          <small id="email-help">{{ backend.provider === 'firebase' ? 'Email dikelola melalui Firebase Authentication dan tidak diubah dari halaman ini.' : backend.provider === 'supabase' ? 'Email dikelola melalui Supabase Authentication dan tidak diubah dari halaman ini.' : 'Email demo tidak dikelola oleh layanan autentikasi.' }}</small>
        </label>
        <label>Role
          <input :value="roleLabel" type="text" readonly aria-describedby="role-help" />
          <small id="role-help">Role diatur oleh administrator database dan tidak dapat diubah sendiri.</small>
        </label>
        <p v-if="error" class="route-form-error" role="alert">{{ error }}</p>
        <div class="profile-form-actions">
          <button class="button button-primary" type="submit" :disabled="saving || loading">
            {{ saving ? 'Menyimpan…' : 'Simpan perubahan' }}
          </button>
        </div>
      </form>
    </section>
  </div>

</template>
