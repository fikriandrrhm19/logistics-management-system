<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { backend } from '@/services/backend'

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const busy = ref(false)
const formError = ref('')
const router = useRouter()
const route = useRoute()

async function submit() {
  formError.value = ''
  const normalizedEmail = email.value.trim().toLowerCase()

  if (!normalizedEmail || !password.value) {
    formError.value = 'Masukkan email dan kata sandi.'
    return
  }

  busy.value = true
  try {
    await backend.signIn(normalizedEmail, password.value)
    const requestedRedirect = typeof route.query.redirect === 'string'
      ? route.query.redirect
      : '/dashboard'
    const redirect = requestedRedirect.startsWith('/') && !requestedRedirect.startsWith('//')
      ? requestedRedirect
      : '/dashboard'
    await router.push(redirect)
  } catch (error) {
    formError.value = error instanceof Error
      ? error.message
      : 'Tidak dapat masuk. Periksa email dan kata sandi.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <main class="login-page">
    <div class="login-orb orb-one" aria-hidden="true"></div>
    <div class="login-orb orb-two" aria-hidden="true"></div>

    <div class="login-layout">
      <section class="login-intro" aria-label="Trackest">
        <RouterLink to="/login" class="login-brand" aria-label="Trackest">
          <span class="brand-mark"><span></span><span></span><span></span></span>
          <strong>trackest</strong>
        </RouterLink>
        <h1>Kelola pengirimanmu dari satu tempat.</h1>
      </section>

      <section class="login-card" aria-labelledby="login-title">
        <h2 id="login-title">Masuk ke Trackest</h2>
        <p class="login-description">Gunakan akun yang sudah terdaftar.</p>

        <form @submit.prevent="submit">
          <div class="login-field">
            <label for="login-email">Email</label>
            <input
              id="login-email"
              v-model.trim="email"
              type="email"
              autocomplete="username"
              inputmode="email"
              placeholder="nama@perusahaan.com"
              required
              :disabled="busy"
            />
          </div>

          <div class="login-field">
            <label for="login-password">Kata sandi</label>
            <span class="password-field">
              <input
                id="login-password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                placeholder="Masukkan kata sandi"
                required
                :disabled="busy"
              />
              <button
                type="button"
                class="password-toggle"
                :aria-label="showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'"
                :aria-pressed="showPassword"
                :title="showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'"
                :disabled="busy"
                @click="showPassword = !showPassword"
              >
                <svg v-if="!showPassword" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                <svg v-else viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m3 3 18 18" />
                  <path d="M10.6 5.2A10.8 10.8 0 0 1 12 5c6.4 0 10 7 10 7a16 16 0 0 1-3.1 3.8M6.2 6.3C3.5 8.1 2 12 2 12s3.6 7 10 7c1.2 0 2.3-.3 3.3-.7" />
                  <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
                </svg>
              </button>
            </span>
          </div>

          <p v-if="formError" class="login-error" role="alert">{{ formError }}</p>

          <button class="button button-primary login-submit" type="submit" :disabled="busy">
            {{ busy ? 'Memeriksa akun…' : 'Masuk' }}
          </button>
        </form>

        <p v-if="backend.provider === 'demo'" class="login-note">
          Mode demo aktif. Data dan sesi tidak menggunakan autentikasi produksi.
        </p>
      </section>
    </div>

    <footer class="login-footer">© 2026 Trackest Logistics</footer>
  </main>
</template>
