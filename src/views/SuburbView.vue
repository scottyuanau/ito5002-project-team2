<template>
  <section class="w-full max-w-5xl space-y-8 text-left">
    <header class="space-y-2">
      <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Suburb</p>
      <h1 class="text-3xl font-semibold text-slate-900">{{ suburbName }}</h1>
      <p v-if="stateLabel" class="text-sm text-slate-500">State: {{ stateLabel }}</p>
    </header>

    <section class="rounded-2xl border border-slate-200 bg-white p-6">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="space-y-1">
          <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Local government area</p>
          <p class="text-lg font-semibold text-slate-900">
            {{ lgaName || 'Unavailable' }}
          </p>
          <p v-if="lgaLoading" class="text-sm text-slate-500">Looking up LGA details...</p>
          <p v-else-if="lgaError" class="text-sm text-red-600">{{ lgaError }}</p>
        </div>
        <div class="flex flex-col gap-2 sm:items-end">
          <Button
            v-if="authStore.isAuthenticated"
            :label="isSubscribed ? 'Unsubscribe' : 'Subscribe'"
            :severity="isSubscribed ? 'secondary' : 'primary'"
            :loading="isUpdatingSubscription"
            :disabled="!canToggleSubscription"
            @click="handleSubscriptionToggle"
          />
          <p v-else class="text-xs text-slate-500">Sign in to manage LGA subscriptions.</p>
        </div>
      </div>
    </section>

    <Tabs v-model:value="activeTab" class="w-full">
      <TabList>
        <Tab value="air">Air Quality</Tab>
        <Tab value="green">Green Space</Tab>
      </TabList>
      <TabPanels>
        <TabPanel value="air">
          <div class="space-y-4">
            <nav class="flex items-center gap-4 text-sm">
              <button
                type="button"
                class="font-medium transition-colors cursor-pointer"
                :class="
                  activeAirSubtab === 'summary'
                    ? 'text-slate-900 underline decoration-2 underline-offset-4'
                    : 'text-slate-500 hover:text-slate-900 hover:underline hover:decoration-2 hover:underline-offset-4'
                "
                :aria-current="activeAirSubtab === 'summary' ? 'page' : undefined"
                @click="activeAirSubtab = 'summary'"
              >
                Summary
              </button>
            </nav>
            <div v-if="activeAirSubtab === 'summary'" class="space-y-4">
              <p class="text-sm text-slate-500">Current air pollution levels.</p>
              <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>
              <DataTable :value="airQualityRows" stripedRows class="w-full" :loading="loading">
                <Column field="pollutant" header="Pollutant"></Column>
                <Column field="value" header="Current"></Column>
                <Column field="unit" header="Unit"></Column>
              </DataTable>
            </div>
          </div>
        </TabPanel>
        <TabPanel value="green">
          <div class="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
            Green space data coming soon.
          </div>
        </TabPanel>
      </TabPanels>
    </Tabs>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import Button from 'primevue/button'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import { db } from '../firebase'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const authStore = useAuthStore()
const activeTab = ref('air')
const activeAirSubtab = ref('summary')
const loading = ref(false)
const errorMessage = ref('')
const lgaName = ref('')
const lgaLoading = ref(false)
const lgaError = ref('')
const isSubscribed = ref(false)
const isUpdatingSubscription = ref(false)
const airQualityRows = ref([
  { pollutant: 'PM10', value: 'N/A', unit: 'ug/m3' },
  { pollutant: 'PM2.5', value: 'N/A', unit: 'ug/m3' },
  { pollutant: 'CO', value: 'N/A', unit: 'ug/m3' },
  { pollutant: 'NO2', value: 'N/A', unit: 'ug/m3' },
  { pollutant: 'SO2', value: 'N/A', unit: 'ug/m3' },
  { pollutant: 'O3', value: 'N/A', unit: 'ug/m3' },
])

const suburbName = computed(() => {
  const raw = typeof route.params.suburb === 'string' ? route.params.suburb : ''
  if (!raw) {
    return 'Unknown suburb'
  }
  return decodeURIComponent(raw)
    .replace(/-/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
})

const stateLabel = computed(() => {
  const state = typeof route.query.state === 'string' ? route.query.state : ''
  return state ? state.toUpperCase() : ''
})
const isDbReady = computed(() => Boolean(db))
const canToggleSubscription = computed(
  () =>
    authStore.isAuthenticated &&
    isDbReady.value &&
    Boolean(lgaName.value) &&
    !isUpdatingSubscription.value,
)

const slugToQuery = (slug) => slug.replace(/-/g, ' ').trim()
const CACHE_TTL_MS = 60 * 60 * 1000
const CACHE_PREFIX = 'airQualityCache:'

const getCacheKey = (suburbQuery, state) =>
  `${CACHE_PREFIX}${suburbQuery.toLowerCase()}|${state.toUpperCase()}`

const readCache = (cacheKey) => {
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
    if (Date.now() - parsed.fetchedAt > CACHE_TTL_MS) {
      localStorage.removeItem(cacheKey)
      return null
    }
    return parsed.data
  } catch {
    localStorage.removeItem(cacheKey)
    return null
  }
}

const writeCache = (cacheKey, data) => {
  const payload = JSON.stringify({ fetchedAt: Date.now(), data })
  localStorage.setItem(cacheKey, payload)
}

const getAirQualityUrl = () => import.meta.env.VITE_FIREBASE_FUNCTIONS_BASEURL || ''
const getLgaLookupUrl = () => import.meta.env.VITE_FIREBASE_LGA_LOOKUP_URL || ''

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

const buildAirQualityRows = (payload) => {
  if (!payload || typeof payload !== 'object') {
    return airQualityRows.value
  }

  const current = payload.current || null
  const currentUnits = payload.current_units || {}
  const hourly = payload.hourly || {}
  const hourlyUnits = payload.hourly_units || {}
  const timeList = hourly.time || []
  const lastIndex = timeList.length > 0 ? timeList.length - 1 : -1

  const getValue = (key) => {
    if (current && Object.prototype.hasOwnProperty.call(current, key)) {
      return current[key]
    }
    if (lastIndex >= 0 && Array.isArray(hourly[key])) {
      return hourly[key][lastIndex]
    }
    return null
  }

  const getUnit = (key) => {
    if (currentUnits && currentUnits[key]) {
      return currentUnits[key]
    }
    return hourlyUnits[key] || ''
  }

  const rows = [
    { key: 'pm10', label: 'PM10' },
    { key: 'pm2_5', label: 'PM2.5' },
    { key: 'carbon_monoxide', label: 'CO' },
    { key: 'nitrogen_dioxide', label: 'NO2' },
    { key: 'sulphur_dioxide', label: 'SO2' },
    { key: 'ozone', label: 'O3' },
  ]

  return rows.map(({ key, label }) => {
    const value = getValue(key)
    const unit = getUnit(key) || 'ug/m3'
    return {
      pollutant: label,
      value: value === null || value === undefined ? 'N/A' : value,
      unit,
    }
  })
}

const loadAirQuality = async () => {
  const rawSlug = typeof route.params.suburb === 'string' ? route.params.suburb : ''
  const state = typeof route.query.state === 'string' ? route.query.state : ''
  const suburbQuery = slugToQuery(rawSlug)
  const airQualityUrl = getAirQualityUrl()

  errorMessage.value = ''

  if (!suburbQuery || !state) {
    errorMessage.value = 'Missing suburb or state. Please search again.'
    return
  }

  if (!airQualityUrl) {
    errorMessage.value = 'Missing Firebase Functions base URL configuration.'
    return
  }

  const cacheKey = getCacheKey(suburbQuery, state)
  const cachedData = readCache(cacheKey)
  if (cachedData) {
    airQualityRows.value = buildAirQualityRows(cachedData)
    return
  }

  loading.value = true

  try {
    const airUrl = new URL(airQualityUrl)
    airUrl.searchParams.set('suburb', suburbQuery)
    airUrl.searchParams.set('state', state.toUpperCase())
    airUrl.searchParams.set(
      'current',
      'pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone',
    )
    airUrl.searchParams.set(
      'hourly',
      'pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone',
    )

    const airResponse = await fetch(airUrl)
    if (!airResponse.ok) {
      throw new Error('Failed to fetch air quality data.')
    }

    const airPayload = await airResponse.json()
    const data = airPayload.data || airPayload
    writeCache(cacheKey, data)
    airQualityRows.value = buildAirQualityRows(data)
  } catch (error) {
    airQualityRows.value = buildAirQualityRows(null)
    errorMessage.value = error instanceof Error ? error.message : 'Unexpected error.'
  } finally {
    loading.value = false
  }
}

// Lookup LGA details for the current suburb + state.
const loadLga = async () => {
  const rawSlug = typeof route.params.suburb === 'string' ? route.params.suburb : ''
  const state = typeof route.query.state === 'string' ? route.query.state : ''
  const suburbQuery = slugToQuery(rawSlug)
  const lgaLookupUrl = getLgaLookupUrl()

  lgaError.value = ''
  lgaName.value = ''

  if (!suburbQuery || !state) {
    lgaError.value = 'Missing suburb or state. Please search again.'
    return
  }

  if (!lgaLookupUrl) {
    lgaError.value = 'Missing LGA lookup configuration.'
    return
  }

  lgaLoading.value = true
  try {
    const lgaUrl = new URL(lgaLookupUrl)
    lgaUrl.searchParams.set('suburb', suburbQuery)
    lgaUrl.searchParams.set('state', state.toUpperCase())
    const response = await fetch(lgaUrl)
    if (!response.ok) {
      throw new Error('Failed to load LGA data.')
    }
    const payload = await response.json()
    lgaName.value = getLgaDisplayName(payload.data || payload)
    if (!lgaName.value) {
      lgaError.value = 'No LGA data found for this suburb.'
    }
  } catch (error) {
    lgaError.value = error instanceof Error ? error.message : 'Unable to load LGA data.'
  } finally {
    lgaLoading.value = false
  }
}

// Refresh subscription status for the current user/LGA.
const refreshSubscriptionStatus = async () => {
  if (!isDbReady.value || !authStore.user?.uid || !lgaName.value) {
    isSubscribed.value = false
    return
  }
  try {
    const docId = `${authStore.user.uid}_${toLgaSlug(lgaName.value)}`
    const snapshot = await getDoc(doc(db, 'lgaSubscriptions', docId))
    isSubscribed.value = snapshot.exists()
  } catch {
    isSubscribed.value = false
  }
}

// Toggle LGA subscription for the current user.
const handleSubscriptionToggle = async () => {
  if (!canToggleSubscription.value) {
    return
  }
  const userId = authStore.user?.uid
  const state = stateLabel.value
  if (!userId || !lgaName.value || !state) {
    return
  }
  const docId = `${userId}_${toLgaSlug(lgaName.value)}`
  isUpdatingSubscription.value = true
  try {
    const docRef = doc(db, 'lgaSubscriptions', docId)
    if (isSubscribed.value) {
      await deleteDoc(docRef)
      isSubscribed.value = false
      return
    }
    await setDoc(docRef, {
      userId,
      lgaName: lgaName.value,
      lgaSlug: toLgaSlug(lgaName.value),
      state,
      createdAt: serverTimestamp(),
    })
    isSubscribed.value = true
  } catch (error) {
    lgaError.value = error instanceof Error ? error.message : 'Unable to update subscription.'
  } finally {
    isUpdatingSubscription.value = false
  }
}

onMounted(loadAirQuality)
onMounted(loadLga)
onMounted(refreshSubscriptionStatus)
watch(
  () => [route.params.suburb, route.query.state],
  () => {
    loadAirQuality()
    loadLga()
  },
)
watch(
  () => [authStore.user?.uid, lgaName.value],
  () => {
    refreshSubscriptionStatus()
  },
)
</script>
