<script setup lang="ts">
import type { ShipmentStatus } from '@/domain/shipment'
import { statusTone } from '@/domain/shipment'

const props = defineProps<{ status: ShipmentStatus }>()
const labels: Record<ShipmentStatus, string> = {
  Pending: 'Menunggu',
  'Picked up': 'Dijemput',
  'In transit': 'Dalam perjalanan',
  'At transit warehouse': 'Di gudang transit',
  'Out for delivery': 'Dalam pengantaran',
  Delivered: 'Terkirim',
  Cancelled: 'Dibatalkan',
  Exception: 'Perlu pemeriksaan',
}
</script>
<template><span class="status-badge" :class="`tone-${statusTone[props.status]}`"><i></i>{{ labels[props.status] }}</span></template>
