<script setup lang="ts">
import { computed, watch } from 'vue'

const props = withDefaults(defineProps<{
  total: number
  page: number
  pageSize: number
  itemLabel?: string
}>(), {
  itemLabel: 'baris',
})

const emit = defineEmits<{
  'update:page': [value: number]
  'update:pageSize': [value: number]
}>()

const pageCount = computed(() =>
  props.pageSize === 0 ? 1 : Math.max(1, Math.ceil(props.total / props.pageSize)),
)
const start = computed(() => {
  if (props.total === 0) return 0
  return props.pageSize === 0 ? 1 : ((props.page - 1) * props.pageSize) + 1
})
const end = computed(() =>
  props.pageSize === 0 ? props.total : Math.min(props.total, props.page * props.pageSize),
)
const summary = computed(() => {
  if (props.total === 0) return `Tidak ada ${props.itemLabel}`
  if (props.pageSize === 0) return `Menampilkan semua ${props.total} ${props.itemLabel}`
  return `Menampilkan ${start.value}–${end.value} dari ${props.total} ${props.itemLabel}`
})

watch(pageCount, (count) => {
  if (props.page > count) emit('update:page', count)
})

function changePageSize(event: Event) {
  const target = event.target as HTMLSelectElement
  const value = Number(target.value)
  emit('update:pageSize', value)
  emit('update:page', 1)
}
</script>

<template>
  <div class="table-pagination" :class="{ 'table-pagination-empty': total === 0 }">
    <span class="table-pagination-summary" aria-live="polite">{{ summary }}</span>
    <div class="table-pagination-controls">
      <label class="table-page-size">
        <span>Baris per halaman</span>
        <select :value="pageSize" aria-label="Jumlah baris per halaman" @change="changePageSize">
          <option :value="10">10</option>
          <option :value="50">50</option>
          <option :value="100">100</option>
          <option :value="0">Semua</option>
        </select>
      </label>
      <div v-if="pageSize !== 0" class="table-page-buttons">
        <button
          type="button"
          class="button button-secondary button-compact"
          :disabled="page <= 1 || total === 0"
          aria-label="Halaman sebelumnya"
          @click="emit('update:page', Math.max(1, page - 1))"
        >‹</button>
        <span class="table-page-indicator">{{ page }} / {{ pageCount }}</span>
        <button
          type="button"
          class="button button-secondary button-compact"
          :disabled="page >= pageCount || total === 0"
          aria-label="Halaman berikutnya"
          @click="emit('update:page', Math.min(pageCount, page + 1))"
        >›</button>
      </div>
    </div>
  </div>
</template>
