<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import PageHeading from '@/components/PageHeading.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import TablePagination from '@/components/TablePagination.vue'
import { backend } from '@/services/backend'
import { useToast } from '@/composables/useToast'
import type { Shipment, ShipmentStatus } from '@/domain/shipment'
import type { CustomerOption, WarehouseOption, AppProfile, RouteRecord } from '@/services/contracts'

const rows = ref<Shipment[]>([])
const customers = ref<CustomerOption[]>([])
const warehouses = ref<WarehouseOption[]>([])
const routes = ref<RouteRecord[]>([])
const query = ref('')
const status = ref('All statuses')
const page = ref(1)
const pageSize = ref(10)
const loading = ref(true)
const saving = ref(false)
const modalOpen = ref(false)
const assignmentOpen = ref(false)
const formError = ref('')
const assignmentError = ref('')
const assignmentLoading = ref(false)
const currentProfile = ref<AppProfile | null>(null)
const assignmentShipment = ref<Shipment | null>(null)
const assignmentRouteId = ref(0)
const busyShipmentId = ref<number | null>(null)
const canCreate = computed(() => backend.provider === 'demo' || currentProfile.value?.role === 'admin' || currentProfile.value?.role === 'staff')
const canAssign = computed(() => backend.provider === 'demo' || currentProfile.value?.role === 'admin' || currentProfile.value?.role === 'staff')
const form = reactive({ trackingNumber: '', senderId: 0, receiverId: 0, originWarehouseId: 0, weightKg: 1 })
const { show } = useToast()
const statuses = ['All statuses', 'Pending', 'Picked up', 'In transit', 'At transit warehouse', 'Out for delivery', 'Delivered', 'Cancelled', 'Exception']
const statusLabels: Record<string, string> = { 'All statuses': 'Semua status', Pending: 'Menunggu', 'Picked up': 'Dijemput', 'In transit': 'Dalam perjalanan', 'At transit warehouse': 'Di gudang transit', 'Out for delivery': 'Dalam pengantaran', Delivered: 'Terkirim', Cancelled: 'Dibatalkan', Exception: 'Perlu pemeriksaan' }
const filtered = computed(() => rows.value.filter(r => (status.value === 'All statuses' || r.status === status.value) && `${r.trackingNumber} ${r.recipient} ${r.destination} ${r.origin} ${r.courier}`.toLowerCase().includes(query.value.trim().toLowerCase())))
const paginatedRows = computed(() => pageSize.value === 0 ? filtered.value : filtered.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value))
const assignmentRoutes = computed(() => {
  const shipment = assignmentShipment.value
  if (!shipment) return []
  return routes.value.filter(route => route.originWarehouseId === shipment.originWarehouseId && !['completed', 'cancelled'].includes(route.status))
})
watch([query, status], () => { page.value = 1 })
const nextStatuses: Record<ShipmentStatus, ShipmentStatus[]> = {
  Pending: ['Picked up', 'Cancelled'],
  'Picked up': ['In transit', 'Cancelled'],
  'In transit': ['At transit warehouse'],
  'At transit warehouse': ['Out for delivery'],
  'Out for delivery': ['Delivered'],
  Delivered: [], Cancelled: [], Exception: [],
}
function canUpdateStatus(row: Shipment) {
  const role = currentProfile.value?.role
  if (backend.provider === 'demo' || role === 'admin' || role === 'staff') return true
  return role === 'courier' && Boolean(currentProfile.value?.id && row.courierProfileId === currentProfile.value.id)
}
async function load() {
  loading.value = true
  try { [rows.value, currentProfile.value] = await Promise.all([backend.getShipments(), backend.getProfile()]) }
  catch (e) { show(e instanceof Error ? e.message : 'Gagal memuat shipment.', 'error') }
  finally { loading.value = false }
}
onMounted(load)
async function openCreateForm() {
  if (!canCreate.value) { show('Pembuatan shipment hanya tersedia untuk admin/staff.', 'error'); return }
  formError.value = ''
  form.trackingNumber = `TRK-${new Date().toISOString().slice(2,10).replaceAll('-', '')}-${Math.random().toString(36).slice(2,6).toUpperCase()}`
  form.senderId = 0; form.receiverId = 0; form.originWarehouseId = 0; form.weightKg = 1
  try {
    [customers.value, warehouses.value] = await Promise.all([backend.getCustomers(), backend.getWarehouses()])
    if (!customers.value.length || !warehouses.value.length) { show('Customer atau gudang belum tersedia untuk akun ini.', 'error'); return }
    form.senderId = customers.value[0].id
    form.receiverId = customers.value.find(c => c.id !== form.senderId)?.id || 0
    form.originWarehouseId = warehouses.value[0].id
    modalOpen.value = true
  } catch (e) { show(e instanceof Error ? e.message : 'Gagal memuat pilihan form.', 'error') }
}
async function createShipment() {
  formError.value = ''
  if (!form.trackingNumber.trim() || !form.senderId || !form.receiverId || !form.originWarehouseId || !Number.isFinite(form.weightKg) || form.weightKg <= 0) { formError.value = 'Lengkapi seluruh field dengan nilai yang valid.'; return }
  if (form.senderId === form.receiverId) { formError.value = 'Pengirim dan penerima harus berbeda.'; return }
  saving.value = true
  try {
    await backend.createShipment({ trackingNumber: form.trackingNumber.trim(), senderId: Number(form.senderId), receiverId: Number(form.receiverId), originWarehouseId: Number(form.originWarehouseId), weightKg: Number(form.weightKg) })
    modalOpen.value = false
    page.value = 1
    show(backend.provider === 'demo' ? 'Pengiriman ditambahkan ke data demo sementara.' : 'Pengiriman berhasil dibuat dan event awal dicatat.', 'success')
    await load()
  } catch (e) { formError.value = e instanceof Error ? e.message : 'Shipment gagal dibuat.' }
  finally { saving.value = false }
}
async function update(row: Shipment, next: ShipmentStatus) {
  const allowed = nextStatuses[row.status]
  if (!canUpdateStatus(row)) { show('Anda hanya dapat memperbarui status shipment yang ditugaskan kepada Anda.', 'error'); await load(); return }
  if (!allowed.includes(next)) { show(`Transisi ${row.status} ke ${next} tidak diizinkan.`, 'error'); await load(); return }
  busyShipmentId.value = row.id
  try {
    await backend.updateShipmentStatus(row.id, next, `Status changed from ${row.status} to ${next}`)
    show(backend.provider === 'demo' ? 'Status berubah di data demo sementara.' : 'Status tersimpan. Event pelacakan dan audit diproses database.', 'success')
    await load()
  } catch (e) { show(e instanceof Error ? e.message : 'Status gagal diperbarui.', 'error'); await load() }
  finally { busyShipmentId.value = null }
}
async function openAssignment(row: Shipment) {
  if (!canAssign.value) return
  assignmentError.value = ''
  assignmentShipment.value = row
  assignmentRouteId.value = row.currentRouteId || 0
  assignmentOpen.value = true
  assignmentLoading.value = true
  try { routes.value = await backend.getRoutes() }
  catch (e) { assignmentError.value = e instanceof Error ? e.message : 'Daftar rute gagal dimuat.' }
  finally { assignmentLoading.value = false }
}
async function saveAssignment() {
  if (!assignmentShipment.value || !assignmentRouteId.value) { assignmentError.value = 'Pilih rute yang tersedia.'; return }
  assignmentError.value = ''
  assignmentLoading.value = true
  try {
    await backend.assignShipmentRoute(assignmentShipment.value.id, Number(assignmentRouteId.value))
    assignmentOpen.value = false
    show(backend.provider === 'demo' ? 'Rute ditetapkan pada data demo.' : 'Rute berhasil ditetapkan. Riwayat tracking diperbarui oleh backend.', 'success')
    await load()
  } catch (e) { assignmentError.value = e instanceof Error ? e.message : 'Penetapan rute gagal.' }
  finally { assignmentLoading.value = false }
}
function exportCsv() {
  const headers = ['tracking_number','recipient','origin','destination','courier','status','updated_at']
  const data = filtered.value.map(r => [r.trackingNumber,r.recipient,r.origin,r.destination,r.courier,r.status,r.updatedAt])
  const esc = (v: string | number) => `"${String(v).replaceAll('"','""')}"`
  const csv = [headers,...data].map(row => row.map(esc).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob(['\uFEFF',csv],{type:'text/csv;charset=utf-8'}))
  const a = document.createElement('a'); a.href = url; a.download = 'trackest-shipments.csv'; document.body.append(a); a.click(); a.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
</script>

<template>
  <PageHeading title="Pengiriman" description="Kelola pengiriman dan perbarui status melalui alur yang diizinkan." :info="backend.provider === 'firebase' ? 'Data pengiriman disimpan di Firebase Realtime Database; status dan riwayat mengikuti validasi aplikasi serta Firebase Security Rules. ETA dan biaya belum tersedia.' : backend.provider === 'supabase' ? 'Perubahan status dikirim melalui RPC dan divalidasi database. ETA dan biaya belum tersedia pada skema.' : 'Mode demo: data pengiriman bersifat sementara. ETA dan biaya belum tersedia.'">
    <button class="button button-secondary" @click="exportCsv">Ekspor CSV</button>
    <button v-if="canCreate" class="button button-primary" @click="openCreateForm">＋ Buat shipment</button>
  </PageHeading>
  <section class="panel list-panel">
    <div class="list-toolbar">
      <div class="search-field"><span>⌕</span><input v-model="query" placeholder="Cari nomor tracking, penerima, kota, atau kurir…" aria-label="Cari shipment" /></div>
      <select v-model="status" class="filter-select" aria-label="Filter status"><option v-for="s in statuses" :key="s" :value="s">{{ statusLabels[s] || s }}</option></select>
      <button class="button button-secondary" :disabled="loading" @click="load">{{ loading ? 'Memuat…' : 'Muat ulang' }}</button>
    </div>
    <div class="table-wrap"><table class="data-table"><thead><tr><th>Nomor tracking</th><th>Penerima</th><th>Asal → tujuan</th><th>Kurir</th><th>Status saat ini</th><th v-if="canAssign">Penugasan</th><th>Update terakhir</th></tr></thead><tbody>
      <tr v-for="item in paginatedRows" :key="item.id">
        <td><span class="tracking-id">{{ item.trackingNumber }}</span><small class="cell-subtext">ID {{ item.id }}</small></td>
        <td><span class="recipient-name">{{ item.recipient }}</span></td>
        <td><span class="route-cell">{{ item.origin }} <span>→</span> {{ item.destination }}</span></td>
        <td>{{ item.courier }}</td>
        <td><div class="status-action-cell"><StatusBadge :status="item.status" /><select v-if="canUpdateStatus(item)" class="status-select" :value="item.status" :disabled="nextStatuses[item.status].length === 0 || busyShipmentId === item.id" :aria-label="`Ubah status ${item.trackingNumber}`" @change="update(item, ($event.target as HTMLSelectElement).value as ShipmentStatus)"><option :value="item.status">{{ statusLabels[item.status] || item.status }}</option><option v-for="s in nextStatuses[item.status]" :key="s" :value="s">→ {{ statusLabels[s] || s }}</option></select><span v-else class="muted-cell" :title="currentProfile?.role === 'courier' ? 'Status hanya dapat diubah untuk shipment yang ditugaskan kepada kurir ini.' : 'Role ini tidak memiliki izin mengubah status.'">{{ nextStatuses[item.status].length ? 'Tidak tersedia' : 'Status akhir' }}</span></div></td>
        <td v-if="canAssign"><button class="button button-secondary button-compact" :disabled="loading || busyShipmentId === item.id || ['Delivered','Cancelled'].includes(item.status)" @click="openAssignment(item)">{{ item.currentRouteId ? 'Ubah rute' : 'Tetapkan rute' }}</button></td>
        <td>{{ item.updatedAt }}</td>
      </tr>
      <tr v-if="!loading && !filtered.length"><td :colspan="canAssign ? 7 : 6" class="empty-cell">Tidak ada shipment yang cocok dengan pencarian atau filter.</td></tr>
      <tr v-if="loading && !filtered.length"><td :colspan="canAssign ? 7 : 6" class="empty-cell">Memuat shipment…</td></tr>
    </tbody></table></div>
    <TablePagination v-model:page="page" v-model:page-size="pageSize" :total="filtered.length" item-label="pengiriman" />
  </section>

  <div v-if="modalOpen" class="route-modal-backdrop" @click.self="modalOpen = false">
    <section class="route-modal" role="dialog" aria-modal="true" aria-labelledby="shipment-modal-title">
      <div class="route-modal-heading"><div><h2 id="shipment-modal-title">Buat shipment</h2><p>Nomor tracking dan event awal dibuat bersama oleh operasi backend.</p></div><button class="route-modal-close" aria-label="Tutup" @click="modalOpen = false">×</button></div>
      <form class="route-form" @submit.prevent="createShipment">
        <label>Nomor tracking<input v-model="form.trackingNumber" maxlength="30" required /></label>
        <label>Pengirim<select v-model.number="form.senderId" required><option :value="0" disabled>Pilih pengirim</option><option v-for="c in customers" :key="c.id" :value="c.id">{{ c.fullName }} · #{{ c.id }}</option></select></label>
        <label>Penerima<select v-model.number="form.receiverId" required><option :value="0" disabled>Pilih penerima</option><option v-for="c in customers" :key="c.id" :value="c.id">{{ c.fullName }} · #{{ c.id }}</option></select></label>
        <label>Gudang asal<select v-model.number="form.originWarehouseId" required><option :value="0" disabled>Pilih gudang</option><option v-for="w in warehouses" :key="w.id" :value="w.id">{{ w.name }} — {{ w.city }}</option></select></label>
        <label>Berat (kg)<input v-model.number="form.weightKg" type="number" min="0.01" step="0.01" required /></label>
        <p v-if="formError" class="route-form-error" role="alert">{{ formError }}</p>
        <div class="route-form-actions"><button type="button" class="button button-secondary" :disabled="saving" @click="modalOpen = false">Batal</button><button type="submit" class="button button-primary" :disabled="saving">{{ saving ? 'Menyimpan…' : 'Simpan shipment' }}</button></div>
        <p class="route-form-note">{{ backend.provider === 'demo' ? 'Mode demo: data tidak persisten.' : backend.provider === 'firebase' ? 'Firebase: shipment dan event tracking awal disimpan ke Realtime Database.' : 'Supabase: RPC create_shipment akan memvalidasi input dan membuat tracking event pertama.' }}</p>
      </form>
    </section>
  </div>


  <div v-if="assignmentOpen" class="route-modal-backdrop" @click.self="!assignmentLoading && (assignmentOpen = false)">
    <section class="route-modal" role="dialog" aria-modal="true" aria-labelledby="assignment-modal-title">
      <div class="route-modal-heading"><div><h2 id="assignment-modal-title">{{ assignmentShipment?.currentRouteId ? 'Ubah penugasan rute' : 'Tetapkan rute' }}</h2><p>{{ assignmentShipment?.trackingNumber }} · {{ assignmentShipment?.origin }}</p></div><button class="route-modal-close" aria-label="Tutup" :disabled="assignmentLoading" @click="assignmentOpen = false">×</button></div>
      <form class="route-form" @submit.prevent="saveAssignment">
        <p class="route-form-note">Pilih rute yang memiliki gudang asal sama dengan shipment. Nama kurir berasal dari rute yang dipilih.</p>
        <div v-if="assignmentLoading && !routes.length" class="notice">Memuat rute yang tersedia…</div>
        <label>Rute pengiriman
          <select v-model.number="assignmentRouteId" required :disabled="assignmentLoading || !assignmentRoutes.length">
            <option :value="0" disabled>Pilih rute</option>
            <option v-for="route in assignmentRoutes" :key="route.id" :value="route.id">RTE-{{ route.id }} · {{ route.origin }} → {{ route.destination }} · {{ route.courierName }} ({{ route.courierCode }}) · {{ route.status === 'planned' ? 'Terjadwal' : 'Berjalan' }}</option>
          </select>
        </label>
        <p v-if="!assignmentLoading && !assignmentRoutes.length && !assignmentError" class="route-form-note">Belum ada rute aktif dengan gudang asal yang cocok. Buat atau periksa rute terlebih dahulu di halaman Rute.</p>
        <p v-if="assignmentError" class="route-form-error" role="alert">{{ assignmentError }}</p>
        <div class="route-form-actions"><button type="button" class="button button-secondary" :disabled="assignmentLoading" @click="assignmentOpen = false">Batal</button><button type="submit" class="button button-primary" :disabled="assignmentLoading || !assignmentRoutes.length || !assignmentRouteId">{{ assignmentLoading ? 'Menyimpan…' : 'Simpan penugasan' }}</button></div>
      </form>
    </section>
  </div>
</template>
