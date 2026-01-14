<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MegaMenu from 'primevue/megamenu'

const router = useRouter()
const route = useRoute()

const items = computed(() => [
  {
    label: 'Home',
    icon: 'pi pi-home',
    command: () => {
      if (route.path !== '/') {
        router.push('/')
      }
    },
  },
  {
    label: 'About',
    icon: 'pi pi-info-circle',
    command: () => {
      if (route.path !== '/about') {
        router.push('/about')
      }
    },
  },
])
</script>

<template>
  <MegaMenu
    class="rounded-full border border-black/10 bg-white/90 px-4 py-2 shadow-xl backdrop-blur"
    :model="items"
    :pt="{
      root: { class: 'rounded-full border-none bg-transparent' },
      menu: { class: 'gap-2' },
      submenu: { class: 'rounded-2xl border border-black/10 bg-white shadow-lg' },
      item: { class: 'rounded-full' },
      action: {
        class:
          'rounded-full px-3 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-900/10',
      },
      icon: { class: 'text-sm' },
    }"
  >
    <template #start>
      <span class="px-3 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-900">
        Logo
      </span>
    </template>
  </MegaMenu>
</template>
