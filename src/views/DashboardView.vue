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
          <div class="space-y-4">
            <Message v-if="!authStore.isConfigured" severity="warn" :closable="false">
              Firebase auth is not configured. Check your .env settings.
            </Message>

            <Message v-if="passwordSuccess" severity="success" :closable="false">
              {{ passwordSuccess }}
            </Message>

            <Message v-if="passwordError" severity="error" :closable="false">
              {{ passwordError }}
            </Message>

            <div class="rounded-2xl border border-slate-200 bg-white p-6">
              <div class="space-y-1">
                <h2 class="text-lg font-semibold text-slate-900">Update password</h2>
                <p class="text-sm text-slate-500">
                  Keep your account secure by setting a new password.
                </p>
              </div>

              <form class="mt-5 space-y-4" @submit.prevent="handlePasswordUpdate">
                <div class="space-y-2">
                  <label class="text-sm font-medium text-slate-700" for="current-password">
                    Current password
                  </label>
                  <Password
                    v-model="currentPassword"
                    input-id="current-password"
                    class="w-full"
                    toggle-mask
                    :feedback="false"
                    autocomplete="current-password"
                    placeholder="Enter current password"
                  />
                </div>

                <div class="space-y-2">
                  <label class="text-sm font-medium text-slate-700" for="new-password">
                    New password
                  </label>
                  <Password
                    v-model="newPassword"
                    input-id="new-password"
                    class="w-full"
                    toggle-mask
                    autocomplete="new-password"
                    placeholder="Create a new password"
                  />
                </div>

                <div class="space-y-2">
                  <label class="text-sm font-medium text-slate-700" for="confirm-password">
                    Confirm new password
                  </label>
                  <Password
                    v-model="confirmPassword"
                    input-id="confirm-password"
                    class="w-full"
                    toggle-mask
                    :feedback="false"
                    autocomplete="new-password"
                    placeholder="Re-enter new password"
                  />
                </div>

                <p v-if="!canUpdatePassword" class="text-xs text-amber-600">
                  Password updates are only available for email/password accounts.
                </p>

                <Button
                  type="submit"
                  label="Update password"
                  class="w-full sm:w-auto"
                  :loading="isUpdatingPassword"
                  :disabled="!canSubmitPasswordUpdate"
                />
              </form>
            </div>
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
import Password from 'primevue/password'
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
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const passwordError = ref('')
const passwordSuccess = ref('')
const isUpdatingPassword = ref(false)
const enquiries = ref([])
const enquiriesLoading = ref(true)
const enquiriesError = ref('')
const deletingId = ref(null)
const isDbReady = computed(() => Boolean(db))
let unsubscribeEnquiries = null
const userEmail = computed(() => authStore.user?.email ?? '')
const canUpdatePassword = computed(
  () => authStore.user?.providerData?.some((provider) => provider.providerId === 'password')
)
const canSubmitPasswordUpdate = computed(
  () =>
    Boolean(currentPassword.value && newPassword.value && confirmPassword.value) &&
    canUpdatePassword.value &&
    !isUpdatingPassword.value
)

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

// Update the current user's password after basic client-side validation.
const handlePasswordUpdate = async () => {
  passwordError.value = ''
  passwordSuccess.value = ''

  if (!authStore.isConfigured) {
    passwordError.value = 'Firebase auth is not configured.'
    return
  }

  if (!canUpdatePassword.value) {
    passwordError.value = 'Password updates are not available for this account type.'
    return
  }

  if (!currentPassword.value || !newPassword.value || !confirmPassword.value) {
    passwordError.value = 'Please complete all password fields.'
    return
  }

  if (newPassword.value !== confirmPassword.value) {
    passwordError.value = 'New password entries do not match.'
    return
  }

  if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(newPassword.value)) {
    passwordError.value = 'Password must be 8+ characters with letters and numbers.'
    return
  }

  if (userEmail.value && newPassword.value === currentPassword.value) {
    passwordError.value = 'New password must be different from the current password.'
    return
  }

  isUpdatingPassword.value = true
  try {
    await authStore.updatePassword({
      currentPassword: currentPassword.value,
      newPassword: newPassword.value,
    })
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    passwordSuccess.value = 'Your password has been updated.'
  } catch (err) {
    const code = err?.code ?? ''
    if (code === 'auth/wrong-password') {
      passwordError.value = 'The current password you entered is incorrect.'
    } else if (code === 'auth/too-many-requests') {
      passwordError.value = 'Too many attempts. Please try again later.'
    } else if (code === 'auth/requires-recent-login') {
      passwordError.value = 'Please log in again before updating your password.'
    } else {
      passwordError.value = err?.message ?? 'Unable to update your password.'
    }
  } finally {
    isUpdatingPassword.value = false
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
