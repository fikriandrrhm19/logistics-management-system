<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import PageHeading from '@/components/PageHeading.vue'
import TablePagination from '@/components/TablePagination.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { backend } from '@/services/backend'
import type { Shipment } from '@/domain/shipment'
import type { TrackingEvent } from '@/services/contracts'
import { useToast } from '@/composables/useToast'
const rows = ref<Shipment[]>([]); const query = ref(''); const page = ref(1); const pageSize = ref(10); const selected = ref<Shipment | null>(null); const events = ref<TrackingEvent[]>([]); const loadingEvents = ref(false); const { show } = useToast()
onMounted(async () => { try { rows.value = await backend.getShipments(); selected.value = rows.value[0] || null } catch (e) { show(e instanceof Error ? e.message : 'Gagal memuat tracking', 'error') } })
const filtered = computed(() => rows.value.filter(r => `${r.trackingNumber} ${r.recipient} ${r.destination}`.toLowerCase().includes(query.value.trim().toLowerCase())))
const paginatedShipments = computed(() => pageSize.value === 0 ? filtered.value : filtered.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value))
watch(query, () => { page.value = 1 })
watch(filtered, (items) => { if (!selected.value || !items.some(item => item.id === selected.value?.id)) selected.value = items[0] || null })
watch(() => selected.value?.id, async (id) => { events.value = []; if (!id) return; loadingEvents.value = true; try { events.value = await backend.getTrackingEvents(id) } catch (e) { show(e instanceof Error ? e.message : 'Gagal memuat event tracking.', 'error') } finally { loadingEvents.value = false } }, { immediate: true })
</script>
<template>
  <PageHeading title="Pelacakan pengiriman" description="Cari nomor tracking dan lihat riwayat event yang tercatat." :info="backend.provider === 'supabase' ? 'Riwayat diambil dari tracking_events sesuai hak akses akun.' : 'Data tracking demo hanya ilustrasi dan tidak persisten.'" />
  <div class="tracking-layout">
    <section class="panel tracking-search-panel"><div class="search-field full-search"><span>⌕</span><input v-model="query" placeholder="Nomor tracking atau nama penerima" aria-label="Cari tracking" /></div><button v-for="item in paginatedShipments" :key="item.id" class="tracking-result" :class="{ 'tracking-selected': selected?.id === item.id }" @click="selected = item"><span class="tracking-result-icon">↗</span><span class="tracking-result-copy"><strong>{{ item.trackingNumber }}</strong><small>{{ item.recipient }} · {{ item.destination }}</small></span><StatusBadge :status="item.status" /></button><div v-if="!filtered.length" class="empty-cell">Tidak ada shipment yang cocok.</div><TablePagination v-model:page="page" v-model:page-size="pageSize" :total="filtered.length" item-label="pengiriman" /></section>
    <section class="panel tracking-detail" v-if="selected"><div class="panel-heading"><div><p class="eyebrow">SHIPMENT DETAILS</p><h2>{{ selected.trackingNumber }}</h2></div><StatusBadge :status="selected.status" /></div><div class="route-visual"><div class="route-node"><span>●</span><small>ASAL</small><strong>{{ selected.origin }}</strong></div><div class="route-line"><span>→</span></div><div class="route-node destination-node"><span>◎</span><small>TUJUAN</small><strong>{{ selected.destination }}</strong></div></div><div class="detail-list"><div><span>Penerima</span><strong>{{ selected.recipient }}</strong></div><div><span>Kurir</span><strong>{{ selected.courier }}</strong></div><div><span>Update terakhir</span><strong>{{ selected.updatedAt }}</strong></div></div><h3 class="timeline-heading">Riwayat tracking</h3><div v-if="loadingEvents" class="empty-cell">Memuat event…</div><div v-else-if="events.length" class="timeline"><div v-for="event in events" :key="event.id" class="timeline-item complete"><span></span><div><strong>{{ event.status }}</strong><small>{{ event.description || 'Tidak ada deskripsi' }} · {{ event.warehouse }} · {{ event.eventTime }}</small></div></div></div><div v-else class="empty-cell">Belum ada event tracking yang dapat ditampilkan.</div></section>
    <section v-else class="panel tracking-detail empty-state"><span class="empty-illustration">◎</span><h2>Cari shipment</h2><p>Pilih shipment untuk melihat detail tracking.</p></section>
  </div>
</template>
