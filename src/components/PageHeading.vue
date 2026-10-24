<script setup lang="ts">
defineProps<{ title: string; description?: string; info?: string }>()
</script>
<template>
  <div class="page-heading">
    <div class="page-heading-copy"><div class="page-title-row"><h1>{{ title }}</h1><button v-if="info" class="heading-info" type="button" :data-tooltip="info" :aria-label="`Informasi: ${info}`" title="Informasi halaman">i</button></div><p v-if="description" class="page-description">{{ description }}</p></div>
    <div class="heading-actions"><slot /></div>
  </div>
</template>
