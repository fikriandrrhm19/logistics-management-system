<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import PageHeading from '@/components/PageHeading.vue'
import TablePagination from '@/components/TablePagination.vue'
import { backend } from '@/services/backend'
import { useToast } from '@/composables/useToast'
import type { WarehouseOption, AppProfile, CreateWarehouseInput } from '@/services/contracts'

const warehouses = ref<WarehouseOption[]>([])
const profile = ref<AppProfile | null>(null)
const query = ref('')
const page = ref(1)
const pageSize = ref(10)
const modalOpen = ref(false)
const editingId = ref<number | null>(null)
const saving = ref(false)
const loading = ref(false)
const error = ref('')
const { show } = useToast()
const form = reactive({ name: '', city: '', address: '' })

const canManage = computed(() => backend.provider === 'demo' || profile.value?.role === 'admin' || profile.value?.role === 'staff')
const filtered = computed(() => warehouses.value.filter(w => `${w.name} ${w.city} ${w.address}`.toLowerCase().includes(query.value.trim().toLowerCase())))
const paginatedWarehouses = computed(() => pageSize.value === 0 ? filtered.value : filtered.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value))
watch(query, () => { page.value = 1 })

async function load() {
  loading.value = true
  try {
    [warehouses.value, profile.value] = await Promise.all([backend.getWarehouses(), backend.getProfile()])
  } catch (e) {
    show(e instanceof Error ? e.message : 'Gagal memuat gudang.', 'error')
  } finally {
    loading.value = false
  }
}
onMounted(load)

function openCreate() {
  editingId.value = null
  error.value = ''
  form.name = ''
  form.city = ''
  form.address = ''
  modalOpen.value = true
}
function openEdit(warehouse: WarehouseOption) {
  editingId.value = warehouse.id
  error.value = ''
  form.name = warehouse.name
  form.city = warehouse.city
  form.address = warehouse.address
  modalOpen.value = true
}
async function saveWarehouse() {
  error.value = ''
  const input: CreateWarehouseInput = { name: form.name.trim(), city: form.city.trim(), address: form.address.trim() }
  if (!input.name || !input.city || !input.address) {
    error.value = 'Nama, kota, dan alamat wajib diisi.'
    return
  }
  saving.value = true
  try {
    if (editingId.value !== null) {
      await backend.updateWarehouse(editingId.value, input)
      show(backend.provider === 'demo' ? 'Perubahan gudang tersimpan di demo.' : 'Gudang berhasil diperbarui.', 'success')
    } else {
      await backend.createWarehouse(input)
      show(backend.provider === 'demo' ? 'Gudang ditambahkan ke demo sementara.' : 'Gudang berhasil dibuat.', 'success')
    }
    modalOpen.value = false
    page.value = 1
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Gagal menyimpan gudang.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <PageHeading title="Gudang" description="Kelola lokasi gudang yang digunakan untuk rute dan pengiriman." :info="backend.provider === 'firebase' ? 'Data gudang disimpan di Firebase Realtime Database dan akses mengikuti Firebase Security Rules. Kapasitas gudang belum tersedia.' : backend.provider === 'supabase' ? 'Data disimpan di public.warehouses sesuai policy PostgreSQL. Kapasitas gudang belum tersedia pada skema.' : 'Mode demo: data tidak persisten. Kapasitas gudang belum tersedia.'">
    <button v-if="canManage" class="button button-primary" @click="openCreate">＋ Tambah gudang</button>
  </PageHeading>

  <section class="panel route-directory">
    <div class="route-toolbar">
      <div><h2>Daftar gudang</h2><p>{{ warehouses.length }} gudang tercatat</p></div>
      <div class="route-controls">
        <label class="route-search"><span aria-hidden="true">⌕</span><input v-model="query" placeholder="Cari nama, kota, atau alamat…" aria-label="Cari gudang" /></label>
        <button class="button button-secondary" :disabled="loading" @click="load">{{ loading ? 'Memuat…' : 'Muat ulang' }}</button>
      </div>
    </div>
    <div class="table-wrap"><table class="data-table"><thead><tr><th>ID</th><th>Nama gudang</th><th>Kota</th><th>Alamat</th><th v-if="canManage">Aksi</th></tr></thead><tbody>
      <tr v-for="warehouse in paginatedWarehouses" :key="warehouse.id"><td><span class="tracking-id">WH-{{ warehouse.id }}</span></td><td><span class="recipient-name">{{ warehouse.name }}</span></td><td>{{ warehouse.city }}</td><td>{{ warehouse.address }}</td><td v-if="canManage"><button class="button button-secondary button-compact" @click="openEdit(warehouse)">Edit</button></td></tr>
      <tr v-if="!loading && !filtered.length"><td :colspan="canManage ? 5 : 4" class="empty-cell">Tidak ada gudang yang cocok.</td></tr>
      <tr v-if="loading"><td :colspan="canManage ? 5 : 4" class="empty-cell">Memuat data gudang…</td></tr>
    </tbody></table></div>
    <TablePagination v-model:page="page" v-model:page-size="pageSize" :total="filtered.length" item-label="gudang" />
  </section>


  <div v-if="modalOpen" class="route-modal-backdrop" @click.self="modalOpen = false">
    <section class="route-modal" role="dialog" aria-modal="true" aria-labelledby="warehouse-modal-title">
      <div class="route-modal-heading"><div><h2 id="warehouse-modal-title">{{ editingId !== null ? 'Edit gudang' : 'Tambah gudang' }}</h2><p>Isi informasi sesuai lokasi sebenarnya.</p></div><button class="route-modal-close" aria-label="Tutup" :disabled="saving" @click="modalOpen = false">×</button></div>
      <form class="route-form" @submit.prevent="saveWarehouse">
        <label>Nama gudang<input v-model="form.name" maxlength="100" required placeholder="Gudang Jakarta" /></label>
        <label>Kota<input v-model="form.city" maxlength="100" required placeholder="Jakarta" /></label>
        <label>Alamat<input v-model="form.address" maxlength="500" required placeholder="Alamat lengkap" /></label>
        <p v-if="error" class="route-form-error" role="alert">{{ error }}</p>
        <div class="route-form-actions"><button type="button" class="button button-secondary" :disabled="saving" @click="modalOpen = false">Batal</button><button type="submit" class="button button-primary" :disabled="saving">{{ saving ? 'Menyimpan…' : editingId !== null ? 'Simpan perubahan' : 'Buat gudang' }}</button></div>
      </form>
    </section>
  </div>
</template>
