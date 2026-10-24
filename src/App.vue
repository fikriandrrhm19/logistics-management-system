<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router'
import DashboardLayout from './layouts/DashboardLayout.vue'
const route = useRoute()
</script>

<template>
  <RouterView v-if="route.meta.public" />
  <DashboardLayout v-else><RouterView /></DashboardLayout>
</template>
