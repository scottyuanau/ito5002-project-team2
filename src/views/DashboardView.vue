<template>
  <section class="w-full max-w-5xl space-y-8 self-start px-4 text-left sm:px-6">
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
          <div class="space-y-4">
            <Message v-if="!authStore.isAuthenticated" severity="warn" :closable="false">
              Sign in to manage your LGA subscriptions.
            </Message>

            <Message v-else-if="!isDbReady" severity="warn" :closable="false">
              Firestore is not configured. Check your .env settings.
            </Message>

            <Message v-if="subscriptionsError" severity="error" :closable="false">
              {{ subscriptionsError }}
            </Message>

            <Message v-if="notificationError" severity="error" :closable="false">
              {{ notificationError }}
            </Message>

            <Message v-if="notificationStatus" severity="success" :closable="false">
              {{ notificationStatus }}
            </Message>

            <div v-if="authStore.isAuthenticated" class="space-y-3">
              <div class="flex flex-wrap items-center gap-3">
                <Button
                  label="Send notification"
                  severity="secondary"
                  size="small"
                  :disabled="!canSendNotification"
                  :loading="notificationSending"
                  @click="handleSendNotification"
                />
                <div class="flex items-center gap-2 text-xs text-slate-600">
                  <Checkbox v-model="sendEmailEnabled" :binary="true" input-id="send-email" />
                  <label for="send-email">Also email me this notification</label>
                </div>
                <p v-if="!canSendNotification" class="text-xs text-slate-500">
                  {{ notificationHelperText }}
                </p>
                <p v-else-if="sendEmailEnabled" class="text-xs text-slate-500">
                  {{ emailDailyHelperText }}
                </p>
              </div>
              <div class="flex flex-wrap items-center justify-between gap-3">
                <p class="text-xs text-slate-500">Manage your subscribed suburbs below.</p>
                <Button
                  label="Add suburb"
                  size="small"
                  class="w-full sm:w-auto"
                  @click="openAddSuburbDialog"
                />
              </div>
              <div
                v-if="subscriptionsLoading"
                class="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500"
              >
                Loading subscriptions...
              </div>

              <div
                v-else-if="subscriptions.length === 0"
                class="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500"
              >
                <p>No LGA subscriptions yet. Add a suburb to get started.</p>
              </div>

              <div v-else class="space-y-3">
                <div
                  v-for="subscription in subscriptions"
                  :key="subscription.id"
                  class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div class="space-y-1">
                      <p class="text-sm font-semibold text-slate-900">{{ subscription.lgaName }}</p>
                      <p class="text-xs text-slate-500">
                        {{ subscription.state }} ·
                        {{ formatTimestamp(subscription.createdAt) }}
                      </p>
                    </div>
                    <Button
                      label="Unsubscribe"
                      severity="secondary"
                      size="small"
                      :loading="unsubscribingId === subscription.id"
                      :disabled="unsubscribingId === subscription.id"
                      @click="handleUnsubscribe(subscription.id)"
                    />
                  </div>
                </div>
              </div>
            </div>
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

            <Message v-if="profileSuccess" severity="success" :closable="false">
              {{ profileSuccess }}
            </Message>

            <Message v-if="profileError" severity="error" :closable="false">
              {{ profileError }}
            </Message>

            <div class="rounded-2xl border border-slate-200 bg-white p-6">
              <div class="space-y-1">
                <h2 class="text-lg font-semibold text-slate-900">Update name</h2>
                <p class="text-sm text-slate-500">
                  This name is used in greetings on your home page.
                </p>
              </div>

              <form class="mt-5 space-y-4" @submit.prevent="handleProfileUpdate">
                <div class="space-y-2">
                  <label class="text-sm font-medium text-slate-700" for="display-name">
                    Display name
                  </label>
                  <InputText
                    v-model="displayNameInput"
                    input-id="display-name"
                    class="w-full"
                    placeholder="Enter your name"
                    autocomplete="name"
                  />
                </div>

                <Button
                  type="submit"
                  label="Update name"
                  class="w-full sm:w-auto"
                  :loading="isUpdatingProfile"
                  :disabled="!canSubmitProfileUpdate"
                />
              </form>
            </div>

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
              {{ enquiriesEmptyText }}
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

    <Dialog
      v-model:visible="addSuburbDialogVisible"
      modal
      header="Add a suburb"
      class="add-suburb-dialog"
      :style="{ width: 'min(560px, 92vw)' }"
    >
      <div class="space-y-4">
        <p class="text-sm text-slate-600">
          Search for your suburb and subscribe to daily air quality updates.
        </p>

        <div class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8.5rem]">
          <div ref="suburbInputWrap" class="relative w-full min-w-0">
            <InputText
              v-model="suburbSearch"
              class="w-full min-w-0"
              placeholder="Enter suburb name"
              aria-label="Suburb name"
              aria-autocomplete="list"
              :aria-expanded="suburbSuggestionsOpen"
              :aria-controls="
                suburbSuggestionsOpen ? 'dashboard-suburb-autocomplete-list' : undefined
              "
              @focus="handleSuburbFocus"
              @keydown.esc="closeSuburbSuggestions"
            />
          </div>
          <Dropdown
            v-model="selectedState"
            :options="states"
            class="w-full"
            placeholder="State"
            aria-label="State"
          />
        </div>

        <Message v-if="addSuburbError" severity="error" :closable="false">
          {{ addSuburbError }}
        </Message>

        <Message v-if="addSuburbStatus" severity="success" :closable="false">
          {{ addSuburbStatus }}
        </Message>

        <div class="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button label="Cancel" severity="secondary" @click="closeAddSuburbDialog" />
          <Button
            label="Subscribe"
            :disabled="!canSubmitAddSuburb"
            :loading="addSuburbLoading"
            @click="handleAddSuburb"
          />
        </div>
      </div>
    </Dialog>
  </section>
  <Teleport to="body">
    <div
      v-if="suburbSuggestionsOpen"
      id="dashboard-suburb-autocomplete-list"
      class="fixed z-[9999] max-h-64 overflow-auto rounded-2xl border border-white/70 bg-white/95 p-2 text-left text-sm shadow-lg backdrop-blur"
      role="listbox"
      aria-label="Suburb suggestions"
      :style="suburbSuggestionStyle"
    >
      <p v-if="suburbSuggestionsLoading" class="px-3 py-2 text-sm text-slate-500">
        Searching suburbs...
      </p>
      <p v-else-if="suburbSuggestionsError" class="px-3 py-2 text-sm text-red-600">
        {{ suburbSuggestionsError }}
      </p>
      <p v-else-if="!suburbSuggestions.length" class="px-3 py-2 text-sm text-slate-500">
        No matches found.
      </p>
      <button
        v-for="item in suburbSuggestions"
        :key="item.place_id || item.formatted"
        type="button"
        class="flex w-full flex-col gap-1 rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-emerald-50 focus-visible:bg-emerald-50 focus-visible:outline-none"
        role="option"
        @mousedown.prevent="selectSuburbSuggestion(item)"
      >
        <span class="font-medium text-slate-900">
          {{ item.address_line1 || item.suburb || item.city || item.formatted }}
        </span>
        <span class="text-xs text-slate-500">
          {{ item.formatted || item.address_line2 || item.state }}
        </span>
      </button>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import Dialog from 'primevue/dialog'
import Dropdown from 'primevue/dropdown'
import InputText from 'primevue/inputtext'
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
const displayNameInput = ref('')
const passwordError = ref('')
const passwordSuccess = ref('')
const profileError = ref('')
const profileSuccess = ref('')
const isUpdatingProfile = ref(false)
const isUpdatingPassword = ref(false)
const enquiries = ref([])
const enquiriesLoading = ref(true)
const enquiriesError = ref('')
const deletingId = ref(null)
const isDbReady = computed(() => Boolean(db))
let unsubscribeEnquiries = null
const subscriptions = ref([])
const subscriptionsLoading = ref(true)
const subscriptionsError = ref('')
const unsubscribingId = ref(null)
const addSuburbDialogVisible = ref(false)
const suburbInputWrap = ref(null)
const suburbSuggestionStyle = ref({})
const suburbSearch = ref('')
const selectedState = ref('')
const states = ['NSW', 'VIC', 'TAS', 'NT', 'SA', 'WA', 'QLD', 'ACT']
const suburbSuggestions = ref([])
const suburbSuggestionsOpen = ref(false)
const suburbSuggestionsLoading = ref(false)
const suburbSuggestionsError = ref('')
const lastAutocompleteQuery = ref('')
const autocompleteTimer = ref(null)
const autocompleteAbortController = ref(null)
const suppressAutocomplete = ref(false)
const addSuburbError = ref('')
const addSuburbStatus = ref('')
const addSuburbLoading = ref(false)
const notificationError = ref('')
const notificationStatus = ref('')
const notificationSending = ref(false)
const lastNotificationSentAt = ref(0)
const notificationNow = ref(Date.now())
const sendEmailEnabled = ref(false)
const emailNotificationCount = ref(0)
const emailNotificationDate = ref('')
let unsubscribeSubscriptions = null
let notificationIntervalId = null
const userEmail = computed(() => authStore.user?.email ?? '')
const ADMIN_EMAIL = 'admin@gmail.com'
const isAdminUser = computed(
  () => userEmail.value.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase()
)
const enquiriesEmptyText = computed(() =>
  isAdminUser.value
    ? 'No enquiries have been submitted yet.'
    : 'You have not submitted any enquiries yet.'
)
const NOTIFICATION_LAST_SENT_KEY = 'notifications:lastSent'
const NOTIFICATION_SEND_COOLDOWN_MS = 60 * 60 * 1000
const EMAIL_NOTIFICATION_COUNT_KEY = 'notifications:emailCount'
const EMAIL_NOTIFICATION_DATE_KEY = 'notifications:emailDate'
const EMAIL_DAILY_LIMIT = 5
const canUpdatePassword = computed(
  () => authStore.user?.providerData?.some((provider) => provider.providerId === 'password')
)
const canSubmitPasswordUpdate = computed(
  () =>
    Boolean(currentPassword.value && newPassword.value && confirmPassword.value) &&
    canUpdatePassword.value &&
    !isUpdatingPassword.value
)
const canSubmitProfileUpdate = computed(
  () =>
    Boolean(displayNameInput.value.trim()) &&
    displayNameInput.value.trim() !== authStore.displayName &&
    !isUpdatingProfile.value &&
    authStore.isConfigured
)
const canSubmitAddSuburb = computed(
  () =>
    authStore.isAuthenticated &&
    isDbReady.value &&
    suburbSearch.value.trim().length > 0 &&
    Boolean(selectedState.value) &&
    !addSuburbLoading.value
)
const canSendNotification = computed(
  () =>
    authStore.isAuthenticated &&
    isDbReady.value &&
    subscriptions.value.length > 0 &&
    !subscriptionsLoading.value &&
    !notificationSending.value &&
    notificationCooldownRemaining.value === 0
)

const notificationCooldownRemaining = computed(() => {
  if (!lastNotificationSentAt.value) {
    return 0
  }
  const elapsed = notificationNow.value - lastNotificationSentAt.value
  if (elapsed >= NOTIFICATION_SEND_COOLDOWN_MS) {
    return 0
  }
  return NOTIFICATION_SEND_COOLDOWN_MS - elapsed
})

const notificationHelperText = computed(() => {
  if (notificationSending.value) {
    return 'Sending notification...'
  }
  if (subscriptionsLoading.value) {
    return 'Loading subscriptions...'
  }
  if (!subscriptions.value.length) {
    return 'Subscribe to at least one suburb to send notifications.'
  }
  if (notificationCooldownRemaining.value > 0) {
    return `You can send another notification in ${formatCooldown(
      notificationCooldownRemaining.value,
    )}.`
  }
  return ''
})

const emailDailyRemaining = computed(() =>
  Math.max(EMAIL_DAILY_LIMIT - emailNotificationCount.value, 0),
)

const emailDailyResetMs = computed(() => {
  const today = getTodayKey()
  if (emailNotificationDate.value !== today) {
    return 0
  }
  const now = new Date(notificationNow.value)
  const nextMidnight = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  )
  return Math.max(nextMidnight.getTime() - notificationNow.value, 0)
})

const emailDailyHelperText = computed(() => {
  if (emailDailyRemaining.value === 0) {
    const resetLabel = emailDailyResetMs.value
      ? `Resets in ${formatCooldown(emailDailyResetMs.value)}.`
      : 'Resets soon.'
    return `Daily email limit reached. ${resetLabel}`
  }
  return `${emailDailyRemaining.value} email sends remaining today.`
})

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

// Sort enquiry records by newest first, handling Firestore Timestamp and plain values.
const sortByCreatedAtDesc = (items) =>
  [...items].sort((a, b) => {
    const aTime = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0)
    const bTime = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0)
    return bTime - aTime
  })

const MAILGUN_DOMAIN = 'breezevalleycafe.com.au'
const MAILGUN_FROM = `Mailgun Sandbox <postmaster@${MAILGUN_DOMAIN}>`
const MAILGUN_ENDPOINT = `https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`
const getMailgunApiKey = () => (import.meta.env.VITE_MAILGUN_API || '').trim()
const getAirQualityUrl = () => import.meta.env.VITE_FIREBASE_FUNCTIONS_BASEURL || ''
const getLgaLookupUrl = () => import.meta.env.VITE_FIREBASE_LGA_LOOKUP_URL || ''
const NOTIFICATION_AIR_CACHE_PREFIX = 'notificationAirQualityCache:v2:'
const NOTIFICATION_AIR_CACHE_TTL_MS = 60 * 60 * 1000
const SUBURB_AUTOCOMPLETE_CACHE_PREFIX = 'geoapify:suburbAutocomplete:v1:'
const SUBURB_AUTOCOMPLETE_MIN_CHARS = 2
const SUBURB_AUTOCOMPLETE_LIMIT = 8

// Normalize an LGA name for deterministic subscription document IDs.
const toLgaSlug = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

// Extract a display-friendly LGA name from lookup results.
const getLgaDisplayName = (results) => {
  if (!Array.isArray(results) || results.length === 0) {
    return ''
  }
  const first = results[0]
  const raw = typeof first?.name === 'string' ? first.name : ''
  if (!raw) {
    return ''
  }
  const primary = raw.split(',')[0]?.trim()
  return primary || raw
}

const readAutocompleteCache = (cacheKey) => {
  let raw
  try {
    raw = localStorage.getItem(cacheKey)
  } catch {
    return null
  }
  if (!raw) {
    return null
  }
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') {
      return null
    }
    if (!Array.isArray(parsed.data)) {
      return null
    }
    return parsed.data
  } catch {
    return null
  }
}

const writeAutocompleteCache = (cacheKey, data) => {
  const payload = JSON.stringify({ data })
  try {
    localStorage.setItem(cacheKey, payload)
  } catch {
    // Skip caching when localStorage is unavailable.
  }
}

const getSuburbAutocompleteCacheKey = (query) =>
  `${SUBURB_AUTOCOMPLETE_CACHE_PREFIX}${query.toLowerCase()}`

const normalizeSuburbQuery = (value) => value.trim()

const closeSuburbSuggestions = () => {
  suburbSuggestionsOpen.value = false
}

const openSuburbSuggestions = () => {
  suburbSuggestionsOpen.value = true
}

// Fetch and cache suburb autocomplete results.
const loadSuburbSuggestions = async (rawQuery) => {
  const query = normalizeSuburbQuery(rawQuery)
  if (query.length < SUBURB_AUTOCOMPLETE_MIN_CHARS) {
    suburbSuggestions.value = []
    suburbSuggestionsError.value = ''
    suburbSuggestionsLoading.value = false
    closeSuburbSuggestions()
    return
  }

  const cacheKey = getSuburbAutocompleteCacheKey(query)
  const cached = readAutocompleteCache(cacheKey)
  if (cached) {
    suburbSuggestions.value = cached
    suburbSuggestionsError.value = ''
    suburbSuggestionsLoading.value = false
    openSuburbSuggestions()
    return
  }

  const apiKey = import.meta.env.VITE_GEOAPIFY_API || ''
  if (!apiKey) {
    suburbSuggestionsError.value = 'Missing Geoapify API key.'
    suburbSuggestionsLoading.value = false
    openSuburbSuggestions()
    return
  }

  if (autocompleteAbortController.value) {
    autocompleteAbortController.value.abort()
  }
  const controller = new AbortController()
  autocompleteAbortController.value = controller

  suburbSuggestionsLoading.value = true
  suburbSuggestionsError.value = ''
  openSuburbSuggestions()

  try {
    const url = new URL('https://api.geoapify.com/v1/geocode/autocomplete')
    url.searchParams.set('text', query)
    url.searchParams.set('format', 'json')
    url.searchParams.set('filter', 'countrycode:au')
    url.searchParams.set('type', 'city')
    url.searchParams.set('limit', String(SUBURB_AUTOCOMPLETE_LIMIT))
    url.searchParams.set('apiKey', apiKey)

    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) {
      throw new Error('Unable to load suburb suggestions.')
    }
    const payload = await response.json()
    const results = Array.isArray(payload?.results) ? payload.results : []
    suburbSuggestions.value = results
    writeAutocompleteCache(cacheKey, results)
  } catch (error) {
    if (error?.name === 'AbortError') {
      return
    }
    suburbSuggestionsError.value =
      error instanceof Error ? error.message : 'Unable to load suburb suggestions.'
    suburbSuggestions.value = []
  } finally {
    suburbSuggestionsLoading.value = false
  }
}

const scheduleSuburbAutocomplete = (value) => {
  if (autocompleteTimer.value) {
    clearTimeout(autocompleteTimer.value)
  }
  const query = normalizeSuburbQuery(value)
  if (query.length < SUBURB_AUTOCOMPLETE_MIN_CHARS) {
    suburbSuggestions.value = []
    suburbSuggestionsError.value = ''
    suburbSuggestionsLoading.value = false
    closeSuburbSuggestions()
    return
  }
  autocompleteTimer.value = setTimeout(() => {
    if (query === lastAutocompleteQuery.value) {
      return
    }
    lastAutocompleteQuery.value = query
    loadSuburbSuggestions(query)
  }, 250)
}

const handleSuburbFocus = () => {
  if (suburbSearch.value.trim().length >= SUBURB_AUTOCOMPLETE_MIN_CHARS) {
    openSuburbSuggestions()
  }
}

const updateSuburbSuggestionPosition = async () => {
  await nextTick()
  const el = suburbInputWrap.value
  if (!el) {
    return
  }
  const rect = el.getBoundingClientRect()
  suburbSuggestionStyle.value = {
    left: `${rect.left}px`,
    top: `${rect.bottom + 8}px`,
    width: `${rect.width}px`,
  }
}

const selectSuburbSuggestion = (item) => {
  const label =
    item?.address_line1 ||
    item?.suburb ||
    item?.city ||
    item?.town ||
    item?.village ||
    item?.formatted ||
    ''
  if (label) {
    suppressAutocomplete.value = true
    lastAutocompleteQuery.value = label
    suburbSearch.value = label
  }
  if (!selectedState.value && item?.state_code && states.includes(item.state_code)) {
    selectedState.value = item.state_code
  }
  closeSuburbSuggestions()
  setTimeout(() => {
    suppressAutocomplete.value = false
  }, 0)
}

const resetAddSuburbForm = () => {
  suburbSearch.value = ''
  selectedState.value = ''
  suburbSuggestions.value = []
  suburbSuggestionsError.value = ''
  suburbSuggestionsOpen.value = false
  addSuburbError.value = ''
  addSuburbStatus.value = ''
}

const openAddSuburbDialog = () => {
  resetAddSuburbForm()
  addSuburbDialogVisible.value = true
}

const closeAddSuburbDialog = () => {
  addSuburbDialogVisible.value = false
  resetAddSuburbForm()
}

// Create a subscription doc for the selected suburb.
const handleAddSuburb = async () => {
  if (!canSubmitAddSuburb.value) {
    return
  }
  addSuburbError.value = ''
  addSuburbStatus.value = ''
  addSuburbLoading.value = true

  const suburbQuery = suburbSearch.value.trim()
  const state = selectedState.value.trim()
  const userId = authStore.user?.uid

  if (!userId) {
    addSuburbError.value = 'Sign in to subscribe to a suburb.'
    addSuburbLoading.value = false
    return
  }

  const lgaLookupUrl = getLgaLookupUrl()
  if (!lgaLookupUrl) {
    addSuburbError.value = 'Missing LGA lookup configuration.'
    addSuburbLoading.value = false
    return
  }

  try {
    const lgaUrl = new URL(lgaLookupUrl)
    lgaUrl.searchParams.set('suburb', suburbQuery)
    lgaUrl.searchParams.set('state', state.toUpperCase())
    const response = await fetch(lgaUrl)
    if (!response.ok) {
      throw new Error('Failed to load LGA data.')
    }
    const payload = await response.json()
    const results = payload.data || payload
    const lgaName = getLgaDisplayName(results)
    if (!lgaName) {
      throw new Error('No LGA data found for this suburb.')
    }

    const docId = `${userId}_${toLgaSlug(lgaName)}`
    const docRef = doc(db, 'lgaSubscriptions', docId)
    const existing = await getDoc(docRef)
    if (existing.exists()) {
      addSuburbError.value = 'You are already subscribed to this suburb.'
      return
    }
    await setDoc(docRef, {
      userId,
      lgaName,
      lgaSlug: toLgaSlug(lgaName),
      state,
      createdAt: serverTimestamp(),
    })
    addSuburbStatus.value = `Subscribed to ${lgaName}.`
    addSuburbDialogVisible.value = false
  } catch (error) {
    addSuburbError.value = error instanceof Error ? error.message : 'Unable to subscribe.'
  } finally {
    addSuburbLoading.value = false
  }
}

// Format a cooldown duration for the send notification helper text.
const formatCooldown = (durationMs) => {
  const totalMinutes = Math.ceil(durationMs / 60000)
  if (totalMinutes < 60) {
    return `${totalMinutes} minute${totalMinutes === 1 ? '' : 's'}`
  }
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (!minutes) {
    return `${hours} hour${hours === 1 ? '' : 's'}`
  }
  return `${hours} hour${hours === 1 ? '' : 's'} ${minutes} minute${minutes === 1 ? '' : 's'}`
}

const getTodayKey = () => new Date(notificationNow.value).toISOString().slice(0, 10)

const refreshEmailDailyCount = () => {
  const todayKey = getTodayKey()
  const storedDate = localStorage.getItem(EMAIL_NOTIFICATION_DATE_KEY) || ''
  if (storedDate !== todayKey) {
    localStorage.setItem(EMAIL_NOTIFICATION_DATE_KEY, todayKey)
    localStorage.setItem(EMAIL_NOTIFICATION_COUNT_KEY, '0')
    emailNotificationDate.value = todayKey
    emailNotificationCount.value = 0
    return
  }
  emailNotificationDate.value = storedDate
  const storedCount = Number(localStorage.getItem(EMAIL_NOTIFICATION_COUNT_KEY)) || 0
  emailNotificationCount.value = storedCount
}

const incrementEmailDailyCount = () => {
  const nextCount = Math.min(emailNotificationCount.value + 1, EMAIL_DAILY_LIMIT)
  emailNotificationCount.value = nextCount
  localStorage.setItem(EMAIL_NOTIFICATION_COUNT_KEY, String(nextCount))
  localStorage.setItem(EMAIL_NOTIFICATION_DATE_KEY, getTodayKey())
}

// Read cached air quality payloads with a fixed TTL.
const readAirQualityCache = (cacheKey) => {
  const raw = localStorage.getItem(cacheKey)
  if (!raw) {
    return null
  }
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') {
      return null
    }
    if (typeof parsed.fetchedAt !== 'number' || !parsed.data) {
      return null
    }
    if (notificationNow.value - parsed.fetchedAt > NOTIFICATION_AIR_CACHE_TTL_MS) {
      localStorage.removeItem(cacheKey)
      return null
    }
    return parsed.data
  } catch {
    localStorage.removeItem(cacheKey)
    return null
  }
}

// Cache air quality payloads for reuse in emails.
const writeAirQualityCache = (cacheKey, data) => {
  const payload = JSON.stringify({ fetchedAt: notificationNow.value, data })
  localStorage.setItem(cacheKey, payload)
}

// Extract the most recent PM2.5 value from an air quality payload.
const extractCurrentPm25 = (payload) => {
  const current = payload?.current?.pm2_5
  if (Number.isFinite(Number(current))) {
    return Number(current)
  }
  const hourlyValues = Array.isArray(payload?.hourly?.pm2_5) ? payload.hourly.pm2_5 : []
  for (let index = hourlyValues.length - 1; index >= 0; index -= 1) {
    const value = Number(hourlyValues[index])
    if (Number.isFinite(value)) {
      return value
    }
  }
  return null
}

// Map PM2.5 values to the same recommendations used in the app UI.
const getPm25Tier = (value) => {
  if (!Number.isFinite(value)) {
    return {
      label: 'Unavailable',
      summary: 'No recent PM2.5 data',
      guidance: 'Check back later for updated readings',
      emoji: '⚪',
    }
  }
  if (value < 5) {
    return {
      label: 'Very Good',
      summary: 'Clean air',
      guidance: 'Safe for everyone',
      emoji: '🟢',
    }
  }
  if (value < 15) {
    return {
      label: 'Good',
      summary: 'Low pollution',
      guidance: 'Safe for most people',
      emoji: '🟢',
    }
  }
  if (value < 25) {
    return {
      label: 'Moderate',
      summary: 'Noticeable pollution',
      guidance: 'Sensitive people may feel effects',
      emoji: '🟡',
    }
  }
  if (value < 35) {
    return {
      label: 'Poor',
      summary: 'Above safe limit',
      guidance: 'Reduce outdoor activity',
      emoji: '🟠',
    }
  }
  if (value < 55) {
    return {
      label: 'Very Poor',
      summary: 'Unhealthy',
      guidance: 'Health effects likely',
      emoji: '🔴',
    }
  }
  return {
    label: 'Hazardous',
    summary: 'Dangerous',
    guidance: 'Avoid outdoor activity',
    emoji: '🛑',
  }
}

const getPm25Recommendations = (tierLabel) => {
  const base = [
    { emoji: '🚶', text: 'If commuting, choose routes away from main roads' },
    { emoji: '🪟', text: 'Keep windows closed during heavy traffic' },
  ]
  if (tierLabel === 'Very Good') {
    return [
      { emoji: '🟢', text: 'Air quality is clear' },
      { emoji: '🌿', text: 'Enjoy outdoor activities' },
      ...base,
    ]
  }
  if (tierLabel === 'Good') {
    return [
      { emoji: '🟢', text: 'Air quality is generally safe' },
      { emoji: '🏃', text: 'Outdoor activity is fine for most people' },
      ...base,
    ]
  }
  if (tierLabel === 'Moderate') {
    return [
      { emoji: '🟡', text: 'Air quality is noticeable at times' },
      { emoji: '😷', text: 'Sensitive people may feel effects outdoors' },
      { emoji: '🏃', text: 'Limit extended outdoor exercise if you feel symptoms' },
      ...base,
    ]
  }
  if (tierLabel === 'Poor') {
    return [
      { emoji: '🟠', text: 'Air quality is above safe limits' },
      { emoji: '🏃', text: 'Reduce outdoor activity' },
      { emoji: '🏠', text: 'Keep strenuous exercise indoors' },
      ...base,
    ]
  }
  if (tierLabel === 'Very Poor') {
    return [
      { emoji: '🔴', text: 'Air quality is unhealthy' },
      { emoji: '🏠', text: 'Stay indoors if possible' },
      { emoji: '😷', text: 'Wear a mask outdoors' },
      ...base,
    ]
  }
  if (tierLabel === 'Hazardous') {
    return [
      { emoji: '🛑', text: 'Air quality is hazardous' },
      { emoji: '🏠', text: 'Avoid outdoor activity' },
      { emoji: '😷', text: 'Use air purifiers indoors' },
      ...base,
    ]
  }
  return [
    { emoji: '⚪', text: 'Air quality data is currently unavailable' },
    ...base,
  ]
}

// Keep mask guidance aligned with PM2.5 tiers used across UI and notifications.
const getPm25MaskAdvice = (tierLabel) => {
  if (tierLabel === 'Very Good' || tierLabel === 'Good') {
    return { emoji: '😌', text: 'Mask advice: No mask needed for most people.' }
  }
  if (tierLabel === 'Moderate') {
    return {
      emoji: '😷',
      text: 'Mask advice: Consider a mask if you are sensitive or outdoors for long periods.',
    }
  }
  if (tierLabel === 'Poor' || tierLabel === 'Very Poor' || tierLabel === 'Hazardous') {
    return { emoji: '😷', text: 'Mask advice: Wear a well-fitted mask outdoors.' }
  }
  return { emoji: '⚪', text: 'Mask advice: Unavailable without recent PM2.5 data.' }
}

// Fetch air quality data for a subscription with caching.
const fetchAirQualityForSubscription = async (subscription) => {
  const suburbName = subscription.lgaName || 'Unknown suburb'
  const state = subscription.state || ''
  const cacheKey = `${NOTIFICATION_AIR_CACHE_PREFIX}${suburbName}|${state}`
  const cached = readAirQualityCache(cacheKey)
  if (cached) {
    return { suburbName, state, payload: cached }
  }

  const baseUrl = getAirQualityUrl()
  if (!baseUrl) {
    throw new Error('Missing Firebase Functions base URL configuration.')
  }

  const airUrl = new URL(baseUrl)
  airUrl.searchParams.set('suburb', suburbName)
  airUrl.searchParams.set('state', state)
  airUrl.searchParams.set('current', 'pm2_5')
  airUrl.searchParams.set('hourly', 'pm2_5')
  airUrl.searchParams.set('past_days', '92')
  airUrl.searchParams.set('timezone', 'auto')

  const response = await fetch(airUrl)
  if (!response.ok) {
    throw new Error(`Unable to load air quality for ${suburbName}.`)
  }
  const payload = await response.json()
  const data = payload.data || payload
  writeAirQualityCache(cacheKey, data)
  return { suburbName, state, payload: data }
}

// Build the notification message used for both in-app and email.
const buildNotificationMessage = async () => {
  if (!subscriptions.value.length) {
    return 'Your subscribed cities are not available yet.'
  }

  const entries = await Promise.all(
    subscriptions.value.map(async (subscription) => {
      try {
        const result = await fetchAirQualityForSubscription(subscription)
        const currentValue = extractCurrentPm25(result.payload)
        const tier = getPm25Tier(currentValue)
        const recommendations = getPm25Recommendations(tier.label)
        const maskAdvice = getPm25MaskAdvice(tier.label)
        return {
          suburbName: result.suburbName,
          currentValue,
          unit: 'ug/m3',
          tier,
          maskAdvice,
          recommendations,
        }
      } catch (error) {
        return {
          suburbName: subscription.lgaName || 'Unknown suburb',
          currentValue: null,
          unit: 'ug/m3',
          tier: getPm25Tier(null),
          maskAdvice: getPm25MaskAdvice('Unavailable'),
          recommendations: getPm25Recommendations('Unavailable'),
          error,
        }
      }
    }),
  )

  return entries
    .map((entry) => {
      const currentLabel = Number.isFinite(entry.currentValue)
        ? entry.currentValue.toFixed(2)
        : 'N/A'
      const lines = [
        `${entry.suburbName}, PM2.5: ${currentLabel} ${entry.unit}`,
        `Today in ${entry.suburbName}`,
        '',
        entry.tier.emoji,
        `PM2.5 is ${entry.tier.label} right now`,
        '📍',
        entry.tier.summary,
        '✅',
        entry.tier.guidance,
        entry.maskAdvice.emoji,
        entry.maskAdvice.text,
      ]
      entry.recommendations.forEach((recommendation) => {
        lines.push(recommendation.emoji)
        lines.push(recommendation.text)
      })
      return lines.join('\n')
    })
    .join('\n\n')
}

// Listen for enquiry updates in Firestore.
const setupEnquiriesListener = () => {
  if (!db) {
    enquiriesLoading.value = false
    enquiriesError.value = 'Firestore is not configured.'
    return
  }
  if (!authStore.user?.uid) {
    enquiries.value = []
    enquiriesLoading.value = false
    return
  }
  const baseEnquiriesCollection = collection(db, 'enquiries')
  const enquiriesQuery = isAdminUser.value
    ? query(baseEnquiriesCollection, orderBy('createdAt', 'desc'))
    : query(baseEnquiriesCollection, where('userId', '==', authStore.user.uid))
  unsubscribeEnquiries = onSnapshot(
    enquiriesQuery,
    (snapshot) => {
      const items = snapshot.docs.map((docRef) => ({
        id: docRef.id,
        ...docRef.data(),
      }))
      enquiries.value = isAdminUser.value ? items : sortByCreatedAtDesc(items)
      enquiriesLoading.value = false
    },
    (err) => {
      enquiriesError.value = err?.message ?? 'Unable to load enquiries.'
      enquiriesLoading.value = false
    }
  )
}

// Rebuild the enquiries listener when auth context changes.
const refreshEnquiriesListener = () => {
  if (unsubscribeEnquiries) {
    unsubscribeEnquiries()
    unsubscribeEnquiries = null
  }
  enquiriesError.value = ''
  enquiries.value = []
  enquiriesLoading.value = true
  setupEnquiriesListener()
}

// Listen for LGA subscription updates for the current user.
const setupSubscriptionListener = () => {
  if (!db || !authStore.user?.uid) {
    subscriptionsLoading.value = false
    subscriptions.value = []
    return
  }
  subscriptionsLoading.value = true
  const subscriptionQuery = query(
    collection(db, 'lgaSubscriptions'),
    where('userId', '==', authStore.user.uid)
  )
  unsubscribeSubscriptions = onSnapshot(
    subscriptionQuery,
    (snapshot) => {
      const items = snapshot.docs.map((docRef) => ({
        id: docRef.id,
        ...docRef.data(),
      }))
      subscriptions.value = items.sort((a, b) => {
        const aTime = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0)
        const bTime = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0)
        return bTime - aTime
      })
      subscriptionsLoading.value = false
    },
    (err) => {
      subscriptionsError.value = err?.message ?? 'Unable to load subscriptions.'
      subscriptionsLoading.value = false
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

// Unsubscribe from an LGA by deleting the subscription document.
const handleUnsubscribe = async (subscriptionId) => {
  if (!db || unsubscribingId.value) {
    return
  }
  unsubscribingId.value = subscriptionId
  try {
    await deleteDoc(doc(db, 'lgaSubscriptions', subscriptionId))
  } catch (err) {
    subscriptionsError.value = err?.message ?? 'Unable to unsubscribe.'
  } finally {
    unsubscribingId.value = null
  }
}

// Send the daily notification and optionally email it through Mailgun.
const handleSendNotification = async () => {
  if (!authStore.user) {
    notificationError.value = 'Please sign in to send notifications.'
    return
  }

  notificationError.value = ''
  notificationStatus.value = ''
  notificationSending.value = true

  try {
    const message = await buildNotificationMessage()
    const shouldSendEmail = sendEmailEnabled.value
    let emailSent = false

    if (shouldSendEmail) {
      refreshEmailDailyCount()
      if (emailDailyRemaining.value === 0) {
        notificationError.value = 'Daily email limit reached. Sent in-app only.'
      } else {
        const mailgunApiKey = getMailgunApiKey()
        if (!mailgunApiKey) {
          throw new Error('Missing Mailgun API key configuration.')
        }
        if (!userEmail.value) {
          throw new Error('No email is associated with this account.')
        }
        const auth = btoa(`api:${mailgunApiKey}`)
        const payload = new URLSearchParams()
        payload.set('from', MAILGUN_FROM)
        payload.set('to', userEmail.value)
        payload.set('subject', '[Airscape Notification] Your subscribed cities')
        payload.set('text', message)
        const response = await fetch(MAILGUN_ENDPOINT, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: payload,
        })

        if (!response.ok) {
          const errorText = await response.text().catch(() => '')
          throw new Error(errorText || 'Unable to send notification email.')
        }
        incrementEmailDailyCount()
        emailSent = true
      }
    }

    const now = Date.now()
    localStorage.setItem(NOTIFICATION_LAST_SENT_KEY, String(now))
    lastNotificationSentAt.value = now
    notificationNow.value = now
    if (shouldSendEmail && emailSent) {
      notificationStatus.value = `${message} Email sent.`
    } else {
      notificationStatus.value = message
    }
    window.dispatchEvent(new CustomEvent('notifications:sent'))
  } catch (err) {
    notificationError.value = err?.message ?? 'Unable to send notification email.'
  } finally {
    notificationSending.value = false
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

// Update the current user's display name used by greetings.
const handleProfileUpdate = async () => {
  profileError.value = ''
  profileSuccess.value = ''

  if (!authStore.isConfigured) {
    profileError.value = 'Firebase auth is not configured.'
    return
  }

  const trimmedName = displayNameInput.value.trim()
  if (!trimmedName) {
    profileError.value = 'Please enter your name.'
    return
  }

  if (trimmedName === authStore.displayName) {
    profileError.value = 'Your name is already up to date.'
    return
  }

  isUpdatingProfile.value = true
  try {
    await authStore.updateDisplayName({ displayName: trimmedName })
    displayNameInput.value = trimmedName
    profileSuccess.value = 'Your name has been updated.'
  } catch (err) {
    profileError.value = err?.message ?? 'Unable to update your name.'
  } finally {
    isUpdatingProfile.value = false
  }
}

onMounted(() => {
  refreshEnquiriesListener()
  setupSubscriptionListener()
  lastNotificationSentAt.value = Number(localStorage.getItem(NOTIFICATION_LAST_SENT_KEY)) || 0
  notificationNow.value = Date.now()
  refreshEmailDailyCount()
  notificationIntervalId = setInterval(() => {
    notificationNow.value = Date.now()
    refreshEmailDailyCount()
  }, 60000)
  displayNameInput.value = authStore.displayName || ''
})

onBeforeUnmount(() => {
  if (unsubscribeEnquiries) {
    unsubscribeEnquiries()
  }
  if (unsubscribeSubscriptions) {
    unsubscribeSubscriptions()
  }
  if (notificationIntervalId) {
    clearInterval(notificationIntervalId)
    notificationIntervalId = null
  }
  if (autocompleteTimer.value) {
    clearTimeout(autocompleteTimer.value)
    autocompleteTimer.value = null
  }
  if (autocompleteAbortController.value) {
    autocompleteAbortController.value.abort()
  }
  window.removeEventListener('resize', updateSuburbSuggestionPosition)
  window.removeEventListener('scroll', updateSuburbSuggestionPosition, true)
})

watch(
  () => authStore.user?.uid,
  () => {
    refreshEnquiriesListener()
    if (unsubscribeSubscriptions) {
      unsubscribeSubscriptions()
    }
    subscriptionsError.value = ''
    subscriptions.value = []
    setupSubscriptionListener()
  }
)
watch(
  () => suburbSearch.value,
  (value) => {
    if (addSuburbStatus.value) {
      addSuburbStatus.value = ''
    }
    if (addSuburbError.value) {
      addSuburbError.value = ''
    }
    if (suppressAutocomplete.value) {
      return
    }
    scheduleSuburbAutocomplete(value)
  }
)
watch(
  () => suburbSuggestionsOpen.value,
  (value) => {
    if (value) {
      updateSuburbSuggestionPosition()
      window.addEventListener('resize', updateSuburbSuggestionPosition)
      window.addEventListener('scroll', updateSuburbSuggestionPosition, true)
    } else {
      window.removeEventListener('resize', updateSuburbSuggestionPosition)
      window.removeEventListener('scroll', updateSuburbSuggestionPosition, true)
    }
  }
)
watch(
  () => addSuburbDialogVisible.value,
  (value) => {
    if (!value) {
      resetAddSuburbForm()
    } else {
      updateSuburbSuggestionPosition()
    }
  }
)
watch(
  () => authStore.displayName,
  (value) => {
    displayNameInput.value = value || ''
  }
)
</script>

<style scoped>
:deep(.add-suburb-dialog.p-dialog) {
  overflow: visible;
}

:deep(.add-suburb-dialog .p-dialog-content) {
  overflow: visible;
}
</style>
