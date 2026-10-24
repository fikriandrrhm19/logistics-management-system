<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import PageHeading from '@/components/PageHeading.vue'
import TablePagination from '@/components/TablePagination.vue'
import { backend } from '@/services/backend'
import { useToast } from '@/composables/useToast'
import type { RouteRecord, WarehouseOption, CourierOption, AppProfile, CreateRouteInput } from '@/services/contracts'

const routes = ref<RouteRecord[]>([])
const warehouses = ref<WarehouseOption[]>([])
const couriers = ref<CourierOption[]>([])
const profile = ref<AppProfile | null>(null)
const query = ref('')
const statusFilter = ref('all')
const page = ref(1)
const pageSize = ref(10)
const modalOpen = ref(false)
const editingId = ref<number | null>(null)
const saving = ref(false)
const loading = ref(false)
const error = ref('')
const { show } = useToast()
const form = reactive({ courierId: 0, originWarehouseId: 0, destinationWarehouseId: 0, departureAt: '', arrivalAt: '', status: 'planned' as RouteRecord['status'] })

const canManage = computed(() => backend.provider === 'demo' || profile.value?.role === 'admin' || profile.value?.role === 'staff')
const filteredRoutes = computed(() => routes.value.filter(r => (statusFilter.value === 'all' || r.status === statusFilter.value) && `${r.id} ${r.courierCode} ${r.courierName} ${r.origin} ${r.destination}`.toLowerCase().includes(query.value.trim().toLowerCase())))
const paginatedRoutes = computed(() => pageSize.value === 0 ? filteredRoutes.value : filteredRoutes.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value))
watch([query, statusFilter], () => { page.value = 1 })
const statusLabels: Record<RouteRecord['status'], string> = { planned: 'Terjadwal', in_progress: 'Berjalan', completed: 'Selesai', cancelled: 'Dibatalkan' }

async function load() {
  loading.value = true
  try {
    [routes.value, warehouses.value, couriers.value, profile.value] = await Promise.all([backend.getRoutes(), backend.getWarehouses(), backend.getCouriers(), backend.getProfile()])
  } catch (e) {
    show(e instanceof Error ? e.message : 'Gagal memuat rute.', 'error')
  } finally {
    loading.value = false
  }
}
onMounted(load)

function toLocalInput(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}
function toIso(value: string) { return value ? new Date(value).toISOString() : null }
function openCreate() {
  error.value = ''
  editingId.value = null
  form.courierId = couriers.value[0]?.id || 0
  form.originWarehouseId = warehouses.value[0]?.id || 0
  form.destinationWarehouseId = warehouses.value.find(w => w.id !== form.originWarehouseId)?.id || 0
  form.departureAt = ''
  form.arrivalAt = ''
  form.status = 'planned'
  modalOpen.value = true
}
function openEdit(route: RouteRecord) {
  error.value = ''
  editingId.value = route.id
  form.courierId = route.courierId
  form.originWarehouseId = route.originWarehouseId
  form.destinationWarehouseId = route.destinationWarehouseId
  form.departureAt = toLocalInput(route.departureAt)
  form.arrivalAt = toLocalInput(route.arrivalAt)
  form.status = route.status
  modalOpen.value = true
}
async function saveRoute() {
  error.value = ''
  if (!form.courierId || !form.originWarehouseId || !form.destinationWarehouseId) { error.value = 'Pilih kurir, gudang asal, dan gudang tujuan.'; return }
  if (form.originWarehouseId === form.destinationWarehouseId) { error.value = 'Gudang asal dan tujuan harus berbeda.'; return }
  if (form.departureAt && form.arrivalAt && new Date(form.arrivalAt) < new Date(form.departureAt)) { error.value = 'Waktu tiba tidak boleh sebelum waktu berangkat.'; return }
  const input: CreateRouteInput = { courierId: Number(form.courierId), originWarehouseId: Number(form.originWarehouseId), destinationWarehouseId: Number(form.destinationWarehouseId), departureAt: toIso(form.departureAt), arrivalAt: toIso(form.arrivalAt), status: form.status }
  saving.value = true
  try {
    if (editingId.value !== null) {
      await backend.updateRoute(editingId.value, input)
      show(backend.provider === 'demo' ? 'Perubahan rute diperbarui di demo.' : 'Rute berhasil diperbarui.', 'success')
    } else {
      await backend.createRoute(input)
      show(backend.provider === 'demo' ? 'Rute ditambahkan ke demo sementara.' : 'Rute berhasil dibuat.', 'success')
    }
    modalOpen.value = false
    page.value = 1
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Gagal menyimpan rute.'
  } finally {
    saving.value = false
  }
}
async function changeStatus(route: RouteRecord, value: RouteRecord['status']) {
  if (value === route.status) return
  try {
    await backend.updateRouteStatus(route.id, value)
    show(backend.provider === 'demo' ? 'Status rute diperbarui di demo.' : 'Status rute berhasil diperbarui.', 'success')
    await load()
  } catch (e) {
    show(e instanceof Error ? e.message : 'Gagal mengubah status rute.', 'error')
    await load()
  }
}
function exportCsv() {
  const headers = ['id','courier_code','courier_name','origin','destination','status','departure_at','arrival_at']
  const rows = filteredRoutes.value.map(r => [r.id,r.courierCode,r.courierName,r.origin,r.destination,r.status,r.departureAt || '',r.arrivalAt || ''])
  const esc = (v: string | number) => `"${String(v).replaceAll('"','""')}"`
  const csv = [headers,...rows].map(row => row.map(esc).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob(['\uFEFF',csv],{type:'text/csv;charset=utf-8'}))
  const a = document.createElement('a'); a.href = url; a.download = 'trackest-rutes.csv'; document.body.append(a); a.click(); a.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
</script>

<template>
  <PageHeading title="Rute pengiriman" description="Atur kurir, gudang asal dan tujuan, jadwal, serta status perjalanan." :info="backend.provider === 'supabase' ? 'Perubahan divalidasi PostgreSQL dan policy database. Jarak dan estimasi durasi belum tersedia pada skema.' : 'Mode demo: perubahan bersifat sementara. Jarak dan estimasi durasi belum tersedia.'">
    <button class="button button-secondary" :disabled="loading || !filteredRoutes.length" @click="exportCsv">Ekspor CSV</button>
    <button v-if="canManage" class="button button-primary" @click="openCreate">＋ Tambah rute</button>
  </PageHeading>

  <section class="panel route-directory">
    <div class="route-toolbar">
      <div><h2>Daftar rute</h2><p>{{ routes.length }} rute tercatat</p></div>
      <div class="route-controls">
        <label class="route-search"><span aria-hidden="true">⌕</span><input v-model="query" aria-label="Cari rute" placeholder="Cari kurir atau kota…" /></label>
        <select v-model="statusFilter" class="filter-select" aria-label="Filter status"><option value="all">Semua status</option><option value="planned">Terjadwal</option><option value="in_progress">Berjalan</option><option value="completed">Selesai</option><option value="cancelled">Dibatalkan</option></select>
        <button class="button button-secondary" :disabled="loading" @click="load">{{ loading ? 'Memuat…' : 'Muat ulang' }}</button>
      </div>
    </div>
    <div class="table-wrap"><table class="data-table route-table"><thead><tr><th>ID</th><th>Koridor</th><th>Kurir</th><th>Berangkat</th><th>Tiba</th><th>Status</th><th v-if="canManage">Aksi</th></tr></thead><tbody>
      <tr v-for="route in paginatedRoutes" :key="route.id">
        <td><span class="tracking-id">RTE-{{ route.id }}</span></td>
        <td><span class="route-cell">{{ route.origin }} <span>→</span> {{ route.destination }}</span></td>
        <td><span class="recipient-name">{{ route.courierName }}</span><small class="cell-subtext">{{ route.courierCode }}</small></td>
        <td>{{ route.departureAt ? new Date(route.departureAt).toLocaleString('id-ID') : 'Belum dijadwalkan' }}</td>
        <td>{{ route.arrivalAt ? new Date(route.arrivalAt).toLocaleString('id-ID') : 'Belum dijadwalkan' }}</td>
        <td><select v-if="canManage" class="status-select" :value="route.status" :aria-label="`Status rute ${route.id}`" @change="changeStatus(route, ($event.target as HTMLSelectElement).value as RouteRecord['status'])"><option v-for="(label,key) in statusLabels" :key="key" :value="key">{{ label }}</option></select><span v-else>{{ statusLabels[route.status] }}</span></td>
        <td v-if="canManage"><button class="button button-secondary button-compact" @click="openEdit(route)">Edit</button></td>
      </tr>
      <tr v-if="!loading && !filteredRoutes.length"><td :colspan="canManage ? 7 : 6" class="empty-cell">Tidak ada rute yang cocok.</td></tr>
      <tr v-if="loading"><td :colspan="canManage ? 7 : 6" class="empty-cell">Memuat data rute…</td></tr>
    </tbody></table></div>
    <TablePagination v-model:page="page" v-model:page-size="pageSize" :total="filteredRoutes.length" item-label="rute" />
  </section>


  <div v-if="modalOpen" class="route-modal-backdrop" @click.self="modalOpen = false">
    <section class="route-modal" role="dialog" aria-modal="true" aria-labelledby="route-modal-title">
      <div class="route-modal-heading"><div><h2 id="route-modal-title">{{ editingId !== null ? 'Edit rute' : 'Tambah rute' }}</h2><p>Gunakan kurir dan gudang yang sudah terdaftar.</p></div><button class="route-modal-close" aria-label="Tutup" :disabled="saving" @click="modalOpen = false">×</button></div>
      <form class="route-form" @submit.prevent="saveRoute">
        <label>Kurir<select v-model.number="form.courierId" required><option :value="0" disabled>Pilih kurir</option><option v-for="c in couriers" :key="c.id" :value="c.id">{{ c.fullName }} ({{ c.courierCode }})</option></select></label>
        <div class="route-form-grid"><label>Gudang asal<select v-model.number="form.originWarehouseId" required><option :value="0" disabled>Pilih gudang</option><option v-for="w in warehouses" :key="w.id" :value="w.id">{{ w.name }} — {{ w.city }}</option></select></label><label>Gudang tujuan<select v-model.number="form.destinationWarehouseId" required><option :value="0" disabled>Pilih gudang</option><option v-for="w in warehouses" :key="w.id" :value="w.id">{{ w.name }} — {{ w.city }}</option></select></label></div>
        <div class="route-form-grid"><label>Waktu berangkat<input v-model="form.departureAt" type="datetime-local" /></label><label>Waktu tiba<input v-model="form.arrivalAt" type="datetime-local" /></label></div>
        <label>Status<select v-model="form.status"><option value="planned">Terjadwal</option><option value="in_progress">Berjalan</option><option value="completed">Selesai</option><option value="cancelled">Dibatalkan</option></select></label>
        <p v-if="error" class="route-form-error" role="alert">{{ error }}</p>
        <div class="route-form-actions"><button type="button" class="button button-secondary" :disabled="saving" @click="modalOpen = false">Batal</button><button type="submit" class="button button-primary" :disabled="saving">{{ saving ? 'Menyimpan…' : editingId !== null ? 'Simpan perubahan' : 'Buat rute' }}</button></div>
      </form>
    </section>
  </div>
</template>
