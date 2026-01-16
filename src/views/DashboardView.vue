<template>
  <section class="w-full max-w-5xl space-y-8 self-start text-left">
    <header class="space-y-2">
      <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Dashboard</p>
      <h1 class="text-3xl font-semibold text-slate-900">Welcome {{ username }}</h1>
      <p class="text-sm text-slate-500">Manage your updates and preferences.</p>
    </header>

    <Tabs v-model:value="activeTab" class="w-full">
      <TabList>
        <Tab value="newsletter">Newsletter</Tab>
        <Tab value="settings">Settings</Tab>
      </TabList>
      <TabPanels>
        <TabPanel value="newsletter">
          <div class="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
            More contents to be added to the Newsletter tab.
          </div>
        </TabPanel>
        <TabPanel value="settings">
          <div class="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
            More contents to be added to the Settings tab.
          </div>
        </TabPanel>
      </TabPanels>
    </Tabs>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const activeTab = ref('newsletter')
// Keep the welcome header resilient for users without a display name.
const username = computed(() => authStore.displayName || 'there')
</script>
