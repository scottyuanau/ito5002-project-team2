<template>
  <section class="w-full max-w-5xl space-y-8 text-left">
    <header class="space-y-2">
      <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Suburb</p>
      <h1 class="text-3xl font-semibold text-slate-900">{{ suburbName }}</h1>
      <p v-if="stateLabel" class="text-sm text-slate-500">State: {{ stateLabel }}</p>
    </header>

    <Tabs v-model:value="activeTab" class="w-full">
      <TabList>
        <Tab value="air">Air Quality</Tab>
        <Tab value="green">Green Space</Tab>
      </TabList>
      <TabPanels>
        <TabPanel value="air">
          <div class="space-y-4">
            <p class="text-sm text-slate-500">Current air pollution levels.</p>
            <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>
            <DataTable :value="airQualityRows" stripedRows class="w-full" :loading="loading">
              <Column field="pollutant" header="Pollutant"></Column>
              <Column field="value" header="Current"></Column>
              <Column field="unit" header="Unit"></Column>
            </DataTable>
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
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'

const route = useRoute()
const activeTab = ref('air')
const loading = ref(false)
const errorMessage = ref('')
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

onMounted(loadAirQuality)
watch(
  () => [route.params.suburb, route.query.state],
  () => {
    loadAirQuality()
  },
)
</script>
