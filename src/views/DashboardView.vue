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
        <Tab value="enquiries">Enquiries</Tab>
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
        <TabPanel value="enquiries">
          <div class="space-y-4">
            <Message v-if="!isDbReady" severity="warn" :closable="false">
              Firestore is not configured. Check your .env settings.
            </Message>

            <Message v-if="enquiriesError" severity="error" :closable="false">
              {{ enquiriesError }}
            </Message>

            <div
              v-if="enquiriesLoading"
              class="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500"
            >
              Loading enquiries...
            </div>

            <div
              v-else-if="enquiries.length === 0"
              class="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500"
            >
              No enquiries have been submitted yet.
            </div>

            <div v-else class="space-y-4">
              <div
                v-for="enquiry in enquiries"
                :key="enquiry.id"
                class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div class="space-y-1">
                    <p class="text-sm font-semibold text-slate-900">{{ enquiry.title }}</p>
                    <p class="text-xs text-slate-500">
                      {{ enquiry.name }} · {{ enquiry.email }} ·
                      {{ formatTimestamp(enquiry.createdAt) }}
                    </p>
                  </div>
                  <Button
                    label="Delete"
                    severity="danger"
                    size="small"
                    class="sm:ml-4"
                    :loading="deletingId === enquiry.id"
                    :disabled="deletingId === enquiry.id"
                    @click="handleDeleteEnquiry(enquiry.id)"
                  />
                </div>
                <p class="mt-3 whitespace-pre-line text-sm text-slate-600">
                  {{ enquiry.content }}
                </p>
              </div>
            </div>
          </div>
        </TabPanel>
      </TabPanels>
    </Tabs>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { collection, deleteDoc, doc, onSnapshot, orderBy, query } from 'firebase/firestore'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import { db } from '../firebase'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const activeTab = ref('newsletter')
// Keep the welcome header resilient for users without a display name.
const username = computed(() => authStore.displayName || 'there')
const enquiries = ref([])
const enquiriesLoading = ref(true)
const enquiriesError = ref('')
const deletingId = ref(null)
const isDbReady = computed(() => Boolean(db))
let unsubscribeEnquiries = null

// Format Firestore timestamps for the enquiries list.
const formatTimestamp = (value) => {
  if (!value) {
    return 'Pending time'
  }
  const date = typeof value.toDate === 'function' ? value.toDate() : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'Pending time'
  }
  return date.toLocaleString()
}

// Listen for enquiry updates in Firestore.
const setupEnquiriesListener = () => {
  if (!db) {
    enquiriesLoading.value = false
    enquiriesError.value = 'Firestore is not configured.'
    return
  }
  const enquiriesQuery = query(collection(db, 'enquiries'), orderBy('createdAt', 'desc'))
  unsubscribeEnquiries = onSnapshot(
    enquiriesQuery,
    (snapshot) => {
      enquiries.value = snapshot.docs.map((docRef) => ({
        id: docRef.id,
        ...docRef.data(),
      }))
      enquiriesLoading.value = false
    },
    (err) => {
      enquiriesError.value = err?.message ?? 'Unable to load enquiries.'
      enquiriesLoading.value = false
    }
  )
}

// Delete a specific enquiry document by id.
const handleDeleteEnquiry = async (enquiryId) => {
  if (!db || deletingId.value) {
    return
  }
  deletingId.value = enquiryId
  try {
    await deleteDoc(doc(db, 'enquiries', enquiryId))
  } catch (err) {
    enquiriesError.value = err?.message ?? 'Unable to delete the enquiry.'
  } finally {
    deletingId.value = null
  }
}

onMounted(() => {
  setupEnquiriesListener()
})

onBeforeUnmount(() => {
  if (unsubscribeEnquiries) {
    unsubscribeEnquiries()
  }
})
</script>
