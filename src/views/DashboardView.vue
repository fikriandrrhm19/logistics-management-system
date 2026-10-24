<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import PageHeading from '@/components/PageHeading.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { backend } from '@/services/backend'
import type { DashboardSummary } from '@/services/contracts'
import type { Shipment } from '@/domain/shipment'
import { useToast } from '@/composables/useToast'

const summary = ref<DashboardSummary | null>(null)
const shipments = ref<Shipment[]>([])
const loading = ref(true)
const exporting = ref(false)
const error = ref('')
const { show } = useToast()

async function loadDashboard() {
  loading.value = true
  error.value = ''

  try {
    const [nextSummary, nextShipments] = await Promise.all([
      backend.getSummary(),
      backend.getShipments(),
    ])

    summary.value = nextSummary
    shipments.value = nextShipments
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Gagal memuat data dashboard.'
    show(error.value, 'error')
  } finally {
    loading.value = false
  }
}

onMounted(loadDashboard)

const cards = computed(() => [
  {
    label: 'Total pengiriman',
    value: summary.value?.total,
    note: 'Pengiriman yang dapat diakses',
    color: 'blue',
    icon: '▤',
  },
  {
    label: 'Dalam perjalanan',
    value: summary.value?.inTransit,
    note: 'Status pengiriman aktif',
    color: 'violet',
    icon: '⌁',
  },
  {
    label: 'Terkirim',
    value: summary.value?.delivered,
    note: 'Pengiriman selesai',
    color: 'green',
    icon: '✓',
  },
  {
    label: 'Perlu perhatian',
    value: summary.value?.exceptions,
    note: 'Dibatalkan atau bermasalah',
    color: 'amber',
    icon: '!',
  },
])

const dayLabels = computed(() => {
  const formatter = new Intl.DateTimeFormat('id-ID', { weekday: 'short' })
  const today = new Date()

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today)
    date.setHours(12, 0, 0, 0)
    date.setDate(today.getDate() - (6 - index))
    return formatter.format(date)
  })
})

const weeklyValues = computed(() => {
  const values = summary.value?.weekly
  if (!values || values.length !== 7) return null
  return values.map(value => Math.max(0, Number(value) || 0))
})

const weeklyPeak = computed(() => Math.max(1, ...(weeklyValues.value ?? [0])))
const chartAxisMax = computed(() => Math.max(5, Math.ceil(weeklyPeak.value / 5) * 5))

const chartAxisLabels = computed(() => {
  const max = chartAxisMax.value
  return [max, Math.round(max * 0.75), Math.round(max * 0.5), Math.round(max * 0.25), 0]
})

const chartTotal = computed(() =>
  weeklyValues.value?.reduce((total, value) => total + value, 0) ?? 0,
)

const pendingCount = computed(() =>
  shipments.value.filter(shipment => shipment.status === 'Pending').length,
)
const donutStyle = computed(() => {
  const total = summary.value?.total ?? 0
  if (!total) return { background: 'conic-gradient(#e5e7eb 0deg 360deg)' }
  const delivered = Math.max(0, summary.value?.delivered ?? 0)
  const moving = Math.max(0, summary.value?.inTransit ?? 0)
  const pending = Math.max(0, pendingCount.value)
  const exceptions = Math.max(0, summary.value?.exceptions ?? 0)
  const parts = [
    { value: delivered, color: '#249b72' },
    { value: moving, color: '#536fba' },
    { value: pending, color: '#c68b2e' },
    { value: exceptions, color: '#c64e59' },
  ]
  let cursor = 0
  const stops = parts.map(part => {
    const start = cursor
    cursor += (part.value / total) * 360
    return `${part.color} ${start}deg ${cursor}deg`
  })
  if (cursor < 360) stops.push(`#e5e7eb ${cursor}deg 360deg`)
  return { background: `conic-gradient(${stops.join(', ')})` }
})

const recentShipments = computed(() => shipments.value.slice(0, 5))

function csvCell(value: string | number | null | undefined): string {
  const text = String(value ?? '')
  return `"${text.replaceAll('"', '""')}"`
}

function downloadCsv(filename: string, headers: string[], rows: Array<Array<string | number>>) {
  const csv = [headers, ...rows]
    .map(row => row.map(csvCell).join(','))
    .join('\r\n')

  const blob = new Blob(['\uFEFF', csv], {
    type: 'text/csv;charset=utf-8;',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()

  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function exportReport() {
  if (loading.value || exporting.value) return

  if (!shipments.value.length) {
    show('Tidak ada data pengiriman yang dapat diekspor.', 'info')
    return
  }

  exporting.value = true

  try {
    const headers = [
      'tracking_number',
      'recipient',
      'origin',
      'destination',
      'courier',
      'status',
      'updated_at',
    ]

    const rows = shipments.value.map(shipment => [
      shipment.trackingNumber,
      shipment.recipient,
      shipment.origin,
      shipment.destination,
      shipment.courier,
      shipment.status,
      shipment.updatedAt,
    ])

    const date = new Date().toISOString().slice(0, 10)
    downloadCsv(`trackest-laporan-pengiriman-${date}.csv`, headers, rows)
    show(`Laporan ${rows.length} pengiriman berhasil dibuat.`, 'success')
  } catch (e) {
    show(
      e instanceof Error ? e.message : 'Gagal membuat laporan.',
      'error',
    )
  } finally {
    exporting.value = false
  }
}
</script>

<template>
  <PageHeading
    title="Ringkasan operasional"
    info="Data mengikuti akses akun. Ekspor hanya mencakup pengiriman yang berhasil dibaca. Grafik merangkum tujuh hari terakhir; ETA dan biaya belum tersedia pada skema."
    description="Pantau pengiriman dan aktivitas logistik dari data yang dapat diakses akun Anda."
  >
    <button
      class="button button-secondary"
      :disabled="loading || exporting || shipments.length === 0"
      @click="exportReport"
    >
      {{ exporting ? 'Menyiapkan laporan…' : '↓ Ekspor laporan CSV' }}
    </button>

    <RouterLink to="/shipments" class="button button-primary">
      ＋ Buat pengiriman
    </RouterLink>
  </PageHeading>

  <div v-if="error" class="notice notice-warning">
    <strong>Data belum berhasil dimuat.</strong>
    {{ error }}
    <button class="button button-secondary" @click="loadDashboard">
      Coba lagi
    </button>
  </div>

  <div class="metric-grid">
    <article
      v-for="(card, index) in cards"
      :key="card.label"
      class="metric-card"
      :style="{ animationDelay: `${index * 50}ms` }"
    >
      <div class="metric-top">
        <span class="metric-label">{{ card.label }}</span>
        <span class="metric-icon" :class="`metric-${card.color}`">
          {{ card.icon }}
        </span>
      </div>

      <div class="metric-number">
        {{ loading ? '—' : (card.value ?? 0).toLocaleString('id-ID') }}
      </div>

      <div class="metric-foot">
        <span>{{ card.note }}</span>
      </div>
    </article>
  </div>

  <div class="dashboard-grid">
    <section class="panel performance-panel">
      <div class="panel-heading">
        <div>
          <h2>Aktivitas pengiriman</h2>
          <p>Jumlah pengiriman yang dibuat dalam tujuh hari terakhir</p>
        </div>
      </div>

      <div class="chart-summary">
        <strong>{{ loading ? '—' : (chartTotal).toLocaleString('id-ID') }}</strong>
        <span>pengiriman selama periode</span>
      </div>

      <div v-if="loading" class="empty-cell">
        Memuat data aktivitas…
      </div>

      <div v-else-if="!weeklyValues" class="empty-cell">
        Data aktivitas mingguan belum tersedia dari backend.
      </div>

      <div v-else class="chart-area">
        <div class="chart-y-labels">
          <span v-for="label in chartAxisLabels" :key="label">
            {{ label }}
          </span>
        </div>

        <div class="chart-main">
          <div class="chart-gridlines">
            <i v-for="label in chartAxisLabels" :key="label"></i>
          </div>

          <div class="chart-bars">
            <div
              v-for="(value, index) in weeklyValues"
              :key="dayLabels[index]"
              class="chart-bar-column"
              :title="`${dayLabels[index]}: ${value} pengiriman`"
            >
              <div
                class="chart-bar"
                :style="{
                  height: `${value === 0 ? 0 : Math.max(3, (value / chartAxisMax) * 100)}%`,
                }"
              >
                <span>{{ value }}</span>
              </div>
              <small>{{ dayLabels[index] }}</small>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="panel distribution-panel">
      <div class="panel-heading">
        <div>
          <h2>Status pengiriman</h2>
          <p>Distribusi status pada data yang dapat diakses</p>
        </div>
      </div>

      <div class="donut-wrap">
        <div class="donut" :style="donutStyle">
          <div class="donut-center">
            <strong>{{ loading ? '—' : (summary?.total ?? 0) }}</strong>
            <span>Total</span>
          </div>
        </div>
      </div>

      <div class="distribution-legend">
        <div>
          <span class="legend-name"><i class="legend-green"></i>Terkirim</span>
          <strong>{{ loading ? '—' : (summary?.delivered ?? 0) }}</strong>
        </div>
        <div>
          <span class="legend-name"><i class="legend-violet"></i>Dalam perjalanan</span>
          <strong>{{ loading ? '—' : (summary?.inTransit ?? 0) }}</strong>
        </div>
        <div>
          <span class="legend-name"><i class="legend-amber"></i>Menunggu</span>
          <strong>{{ loading ? '—' : pendingCount }}</strong>
        </div>
        <div>
          <span class="legend-name"><i class="legend-red"></i>Bermasalah</span>
          <strong>{{ loading ? '—' : (summary?.exceptions ?? 0) }}</strong>
        </div>
      </div>
    </section>
  </div>

  <section class="panel recent-panel">
    <div class="panel-heading">
      <div>
        <h2>Pengiriman terbaru</h2>
        <p>Daftar pengiriman terbaru yang dapat diakses akun Anda.</p>
      </div>
      <RouterLink to="/shipments" class="link-button">
        Lihat semua pengiriman →
      </RouterLink>
    </div>

    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Nomor pelacakan</th>
            <th>Penerima</th>
            <th>Rute</th>
            <th>Kurir</th>
            <th>Status</th>
            <th>Diperbarui</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="item in recentShipments" :key="item.id">
            <td><span class="tracking-id">{{ item.trackingNumber }}</span></td>
            <td><span class="recipient-name">{{ item.recipient }}</span></td>
            <td>
              <span class="route-cell">
                {{ item.origin }} → {{ item.destination }}
              </span>
            </td>
            <td>{{ item.courier }}</td>
            <td><StatusBadge :status="item.status" /></td>
            <td class="muted-cell">{{ item.updatedAt }}</td>
          </tr>

          <tr v-if="!loading && !shipments.length">
            <td colspan="6" class="empty-cell">
              Belum ada pengiriman yang dapat ditampilkan.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="table-footer">
      <span>
        Menampilkan
        <strong>{{ Math.min(5, shipments.length) }}</strong>
        dari
        <strong>{{ shipments.length }}</strong>
        pengiriman
      </span>
      <RouterLink to="/shipments" class="link-button">
        Buka daftar pengiriman →
      </RouterLink>
    </div>
  </section>

</template>
