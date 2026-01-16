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
              <button
                type="button"
                class="font-medium transition-colors cursor-pointer"
                :class="
                  activeAirSubtab === 'trend'
                    ? 'text-slate-900 underline decoration-2 underline-offset-4'
                    : 'text-slate-500 hover:text-slate-900 hover:underline hover:decoration-2 hover:underline-offset-4'
                "
                :aria-current="activeAirSubtab === 'trend' ? 'page' : undefined"
                @click="activeAirSubtab = 'trend'"
              >
                Trend
              </button>
            </nav>
            <div v-if="activeAirSubtab === 'summary'" class="space-y-4">
              <p class="text-sm text-slate-500">Current air pollution levels.</p>
              <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>
              <DataTable
                :value="airQualitySummaryRows"
                stripedRows
                class="w-full"
                :loading="loading || trendLoading"
              >
                <Column field="pollutant" header="Pollutant"></Column>
                <Column field="value" header="Current"></Column>
                <Column field="unit" header="Unit"></Column>
                <Column field="median" header="Median"></Column>
                <Column field="average" header="Average"></Column>
                <Column field="minimum" header="Minimum"></Column>
                <Column field="maximum" header="Maximum"></Column>
              </DataTable>
            </div>
            <div v-else-if="activeAirSubtab === 'trend'" class="space-y-4">
              <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p class="text-sm font-medium text-slate-900">Three-month trend</p>
                  <p class="text-xs text-slate-500">
                    Daily averages over the last three months.
                  </p>
                </div>
                <Dropdown
                  v-model="selectedTrendMetric"
                  :options="trendMetricOptions"
                  optionLabel="label"
                  optionValue="key"
                  class="w-full sm:w-52"
                  placeholder="Select metric"
                  aria-label="Select metric"
                />
              </div>
              <p v-if="trendError" class="text-sm text-red-600">{{ trendError }}</p>
              <p v-else-if="trendLoading" class="text-sm text-slate-500">
                Loading trend data...
              </p>
              <p
                v-else-if="!trendSeries.labels.length"
                class="text-sm text-slate-500"
              >
                No trend data available for this suburb yet.
              </p>
              <div class="rounded-2xl border border-slate-200 bg-white p-4">
                <Chart
                  type="line"
                  :data="trendChartData"
                  :options="trendChartOptions"
                  class="h-80 w-full"
                />
              </div>
            </div>
          </div>
        </TabPanel>
        <TabPanel value="green">
          <div class="space-y-4">
            <nav class="flex items-center gap-4 text-sm">
              <button
                type="button"
                class="font-medium transition-colors cursor-pointer"
                :class="
                  activeGreenSubtab === 'summary'
                    ? 'text-slate-900 underline decoration-2 underline-offset-4'
                    : 'text-slate-500 hover:text-slate-900 hover:underline hover:decoration-2 hover:underline-offset-4'
                "
                :aria-current="activeGreenSubtab === 'summary' ? 'page' : undefined"
                @click="activeGreenSubtab = 'summary'"
              >
                Summary
              </button>
              <button
                type="button"
                class="font-medium transition-colors cursor-pointer"
                :class="
                  activeGreenSubtab === 'trend'
                    ? 'text-slate-900 underline decoration-2 underline-offset-4'
                    : 'text-slate-500 hover:text-slate-900 hover:underline hover:decoration-2 hover:underline-offset-4'
                "
                :aria-current="activeGreenSubtab === 'trend' ? 'page' : undefined"
                @click="activeGreenSubtab = 'trend'"
              >
                Trend
              </button>
            </nav>
            <div v-if="activeGreenSubtab === 'summary'" class="space-y-4">
              <p class="text-sm text-slate-500">
                Historical weather averages over the last 30 days.
              </p>
              <p v-if="greenError" class="text-sm text-red-600">{{ greenError }}</p>
              <DataTable :value="greenSummaryRows" stripedRows class="w-full" :loading="greenLoading">
                <Column field="metric" header="Metric"></Column>
                <Column field="value" header="Current"></Column>
                <Column field="unit" header="Unit"></Column>
                <Column field="median" header="Median"></Column>
                <Column field="average" header="Average"></Column>
                <Column field="minimum" header="Minimum"></Column>
                <Column field="maximum" header="Maximum"></Column>
              </DataTable>
            </div>
            <div v-else-if="activeGreenSubtab === 'trend'" class="space-y-4">
              <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p class="text-sm font-medium text-slate-900">Three-month trend</p>
                  <p class="text-xs text-slate-500">
                    Daily averages over the last three months.
                  </p>
                </div>
                <Dropdown
                  v-model="selectedGreenTrendMetric"
                  :options="greenTrendMetricOptions"
                  optionLabel="label"
                  optionValue="key"
                  class="w-full sm:w-72"
                  placeholder="Select metric"
                  aria-label="Select metric"
                />
              </div>
              <p v-if="greenTrendError" class="text-sm text-red-600">{{ greenTrendError }}</p>
              <p v-else-if="greenTrendLoading" class="text-sm text-slate-500">
                Loading trend data...
              </p>
              <p
                v-else-if="!greenTrendSeries.labels.length"
                class="text-sm text-slate-500"
              >
                No trend data available for this suburb yet.
              </p>
              <div class="rounded-2xl border border-slate-200 bg-white p-4">
                <Chart
                  type="line"
                  :data="greenTrendChartData"
                  :options="greenTrendChartOptions"
                  class="h-80 w-full"
                />
              </div>
            </div>
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
import Dropdown from 'primevue/dropdown'
import Chart from 'primevue/chart'
import { db } from '../firebase'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const authStore = useAuthStore()
const activeTab = ref('air')
const activeAirSubtab = ref('summary')
const activeGreenSubtab = ref('summary')
const loading = ref(false)
const errorMessage = ref('')
const trendLoading = ref(false)
const trendError = ref('')
const greenLoading = ref(false)
const greenError = ref('')
const greenTrendLoading = ref(false)
const greenTrendError = ref('')
const lgaName = ref('')
const lgaLoading = ref(false)
const lgaError = ref('')
const isSubscribed = ref(false)
const isUpdatingSubscription = ref(false)
const trendLoaded = ref(false)
const greenTrendLoaded = ref(false)
const airQualityRows = ref([
  { key: 'pm10', pollutant: 'PM10', value: 'N/A', unit: 'ug/m3' },
  { key: 'pm2_5', pollutant: 'PM2.5', value: 'N/A', unit: 'ug/m3' },
  { key: 'carbon_monoxide', pollutant: 'CO', value: 'N/A', unit: 'ug/m3' },
  { key: 'nitrogen_dioxide', pollutant: 'NO2', value: 'N/A', unit: 'ug/m3' },
  { key: 'sulphur_dioxide', pollutant: 'SO2', value: 'N/A', unit: 'ug/m3' },
  { key: 'ozone', pollutant: 'O3', value: 'N/A', unit: 'ug/m3' },
])
const trendMetricOptions = [
  { key: 'pm10', label: 'PM10' },
  { key: 'pm2_5', label: 'PM2.5' },
  { key: 'carbon_monoxide', label: 'CO' },
  { key: 'nitrogen_dioxide', label: 'NO2' },
  { key: 'sulphur_dioxide', label: 'SO2' },
  { key: 'ozone', label: 'O3' },
]
const selectedTrendMetric = ref('pm2_5')
const trendSeries = ref({ labels: [], series: {}, units: {} })
const greenSummaryRows = ref([])
const greenTrendSeries = ref({ labels: [], series: {}, units: {} })

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
const TREND_CACHE_PREFIX = 'airQualityTrendCache:'
const HISTORICAL_WEATHER_CACHE_PREFIX = 'historicalWeatherCache:'
const HISTORICAL_WEATHER_TREND_CACHE_PREFIX = 'historicalWeatherTrendCache:'
const HISTORICAL_WEATHER_ENDPOINT =
  'https://lookuphistoricalweather-lz6cdeni5a-uc.a.run.app'
const HISTORICAL_DAYS = 30
const HISTORICAL_TREND_DAYS = 92

const getCacheKey = (suburbQuery, state) =>
  `${CACHE_PREFIX}${suburbQuery.toLowerCase()}|${state.toUpperCase()}`
const getTrendCacheKey = (suburbQuery, state) =>
  `${TREND_CACHE_PREFIX}${suburbQuery.toLowerCase()}|${state.toUpperCase()}`
const getHistoricalWeatherCacheKey = (suburbQuery, state) =>
  `${HISTORICAL_WEATHER_CACHE_PREFIX}${suburbQuery.toLowerCase()}|${state.toUpperCase()}`
const getHistoricalWeatherTrendCacheKey = (suburbQuery, state) =>
  `${HISTORICAL_WEATHER_TREND_CACHE_PREFIX}${suburbQuery.toLowerCase()}|${state.toUpperCase()}`

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
      key,
      pollutant: label,
      value: value === null || value === undefined ? 'N/A' : value,
      unit,
    }
  })
}

const greenMetricOptions = [
  { key: 'temperature_2m', label: 'Temperature (2 m)', unitFallback: '°C' },
  { key: 'rain', label: 'Rain', unitFallback: 'mm' },
  { key: 'vapour_pressure_deficit', label: 'Vapour Pressure Deficit', unitFallback: 'kPa' },
  { key: 'soil_temperature_0_to_7cm', label: 'Soil Temperature (0-7 cm)', unitFallback: '°C' },
  { key: 'soil_moisture_0_to_7cm', label: 'Soil Moisture (0-7 cm)', unitFallback: 'm³/m³' },
]
const greenTrendMetricOptions = [
  { key: 'temperature_2m', label: 'Temperature (2 m)' },
  { key: 'rain', label: 'Rain' },
  { key: 'vapour_pressure_deficit', label: 'Vapour Pressure Deficit' },
  { key: 'soil_temperature_0_to_7cm', label: 'Soil Temperature (0-7 cm)' },
  { key: 'soil_moisture_0_to_7cm', label: 'Soil Moisture (0-7 cm)' },
]
const selectedGreenTrendMetric = ref('temperature_2m')

const formatStatValue = (value) => {
  if (!Number.isFinite(value)) {
    return 'N/A'
  }
  return Number(value.toFixed(2))
}

const computeSeriesStats = (values) => {
  if (!Array.isArray(values) || values.length === 0) {
    return null
  }
  const cleaned = values.filter((value) => Number.isFinite(value))
  if (cleaned.length === 0) {
    return null
  }
  const sorted = [...cleaned].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  const median =
    sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
  const sum = cleaned.reduce((total, value) => total + value, 0)
  return {
    median,
    average: sum / cleaned.length,
    minimum: sorted[0],
    maximum: sorted[sorted.length - 1],
  }
}

const formatIsoDate = (date) => date.toISOString().slice(0, 10)

const getHistoricalDateRange = (days) => {
  const now = new Date()
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const startDate = new Date(todayUtc)
  startDate.setUTCDate(todayUtc.getUTCDate() - (days - 1))
  return {
    startDate: formatIsoDate(startDate),
    endDate: formatIsoDate(todayUtc),
  }
}

const getLatestValue = (values) => {
  if (!Array.isArray(values)) {
    return null
  }
  for (let index = values.length - 1; index >= 0; index -= 1) {
    const value = values[index]
    const numericValue = Number(value)
    if (Number.isFinite(numericValue)) {
      return numericValue
    }
  }
  return null
}

const buildGreenSummaryRows = (payload) => {
  const fallback = greenMetricOptions.map(({ key, label, unitFallback }) => ({
    key,
    metric: label,
    value: 'N/A',
    unit: unitFallback,
    median: 'N/A',
    average: 'N/A',
    minimum: 'N/A',
    maximum: 'N/A',
  }))

  if (!payload || typeof payload !== 'object') {
    return fallback
  }

  const hourly = payload.hourly || {}
  const hourlyUnits = payload.hourly_units || {}

  return greenMetricOptions.map(({ key, label, unitFallback }) => {
    const values = Array.isArray(hourly[key]) ? hourly[key] : []
    const current = getLatestValue(values)
    const stats = computeSeriesStats(values)
    return {
      key,
      metric: label,
      value: current === null ? 'N/A' : formatStatValue(current),
      unit: hourlyUnits[key] || unitFallback,
      median: stats ? formatStatValue(stats.median) : 'N/A',
      average: stats ? formatStatValue(stats.average) : 'N/A',
      minimum: stats ? formatStatValue(stats.minimum) : 'N/A',
      maximum: stats ? formatStatValue(stats.maximum) : 'N/A',
    }
  })
}

const buildGreenTrendSeries = (payload) => {
  const fallback = { labels: [], series: {}, units: {} }
  if (!payload || typeof payload !== 'object') {
    return fallback
  }

  const hourly = payload.hourly || {}
  const hourlyUnits = payload.hourly_units || {}
  const timeList = Array.isArray(hourly.time) ? hourly.time : []
  if (timeList.length === 0) {
    return fallback
  }

  const labels = []
  const labelIndex = new Map()
  const sums = {}
  const counts = {}
  const units = {}

  greenTrendMetricOptions.forEach(({ key }) => {
    sums[key] = []
    counts[key] = []
    units[key] = hourlyUnits[key] || ''
  })

  timeList.forEach((timeValue, index) => {
    if (typeof timeValue !== 'string') {
      return
    }
    const day = timeValue.split('T')[0]
    if (!day) {
      return
    }
    let dayIndex = labelIndex.get(day)
    if (dayIndex === undefined) {
      dayIndex = labels.length
      labelIndex.set(day, dayIndex)
      labels.push(day)
      greenTrendMetricOptions.forEach(({ key }) => {
        sums[key][dayIndex] = 0
        counts[key][dayIndex] = 0
      })
    }

    greenTrendMetricOptions.forEach(({ key }) => {
      const series = hourly[key]
      if (!Array.isArray(series)) {
        return
      }
      const value = series[index]
      if (value === null || value === undefined) {
        return
      }
      const numericValue = Number(value)
      if (!Number.isFinite(numericValue)) {
        return
      }
      sums[key][dayIndex] += numericValue
      counts[key][dayIndex] += 1
    })
  })

  const series = {}
  greenTrendMetricOptions.forEach(({ key }) => {
    series[key] = sums[key].map((total, idx) => {
      const count = counts[key][idx]
      if (!count) {
        return null
      }
      return Number((total / count).toFixed(2))
    })
  })

  return { labels, series, units }
}

// Format a YYYY-MM-DD string into a compact label.
const formatDateLabel = (dateValue) => {
  if (typeof dateValue !== 'string') {
    return ''
  }
  const [year, month, day] = dateValue.split('-')
  if (!year || !month || !day) {
    return dateValue
  }
  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const monthIndex = Number.parseInt(month, 10) - 1
  const monthLabel = monthLabels[monthIndex] || month
  return `${day} ${monthLabel}`
}

// Build daily averages from hourly air quality data.
const buildTrendSeries = (payload) => {
  const fallback = { labels: [], series: {}, units: {} }
  if (!payload || typeof payload !== 'object') {
    return fallback
  }

  const hourly = payload.hourly || {}
  const hourlyUnits = payload.hourly_units || {}
  const timeList = Array.isArray(hourly.time) ? hourly.time : []
  if (timeList.length === 0) {
    return fallback
  }

  const labels = []
  const labelIndex = new Map()
  const sums = {}
  const counts = {}
  const units = {}

  trendMetricOptions.forEach(({ key }) => {
    sums[key] = []
    counts[key] = []
    units[key] = hourlyUnits[key] || 'ug/m3'
  })

  timeList.forEach((timeValue, index) => {
    if (typeof timeValue !== 'string') {
      return
    }
    const day = timeValue.split('T')[0]
    if (!day) {
      return
    }
    let dayIndex = labelIndex.get(day)
    if (dayIndex === undefined) {
      dayIndex = labels.length
      labelIndex.set(day, dayIndex)
      labels.push(day)
      trendMetricOptions.forEach(({ key }) => {
        sums[key][dayIndex] = 0
        counts[key][dayIndex] = 0
      })
    }

    trendMetricOptions.forEach(({ key }) => {
      const series = hourly[key]
      if (!Array.isArray(series)) {
        return
      }
      const value = series[index]
      if (value === null || value === undefined) {
        return
      }
      const numericValue = Number(value)
      if (!Number.isFinite(numericValue)) {
        return
      }
      sums[key][dayIndex] += numericValue
      counts[key][dayIndex] += 1
    })
  })

  const series = {}
  trendMetricOptions.forEach(({ key }) => {
    series[key] = sums[key].map((total, idx) => {
      const count = counts[key][idx]
      if (!count) {
        return null
      }
      return Number((total / count).toFixed(2))
    })
  })

  return { labels, series, units }
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

// Fetch and cache the three-month air quality trend.
const loadAirQualityTrend = async () => {
  const rawSlug = typeof route.params.suburb === 'string' ? route.params.suburb : ''
  const state = typeof route.query.state === 'string' ? route.query.state : ''
  const suburbQuery = slugToQuery(rawSlug)
  const airQualityUrl = getAirQualityUrl()

  trendError.value = ''

  if (!suburbQuery || !state) {
    trendError.value = 'Missing suburb or state. Please search again.'
    return
  }

  if (!airQualityUrl) {
    trendError.value = 'Missing Firebase Functions base URL configuration.'
    return
  }

  const cacheKey = getTrendCacheKey(suburbQuery, state)
  const cachedData = readCache(cacheKey)
  if (cachedData) {
    trendSeries.value = buildTrendSeries(cachedData)
    trendLoaded.value = true
    return
  }

  trendLoading.value = true

  try {
    const airUrl = new URL(airQualityUrl)
    airUrl.searchParams.set('suburb', suburbQuery)
    airUrl.searchParams.set('state', state.toUpperCase())
    airUrl.searchParams.set(
      'hourly',
      'pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone',
    )
    airUrl.searchParams.set('past_days', '92')
    airUrl.searchParams.set('timezone', 'auto')

    const airResponse = await fetch(airUrl)
    if (!airResponse.ok) {
      throw new Error('Failed to fetch air quality trend data.')
    }

    const airPayload = await airResponse.json()
    const data = airPayload.data || airPayload
    writeCache(cacheKey, data)
    trendSeries.value = buildTrendSeries(data)
    trendLoaded.value = true
  } catch (error) {
    trendSeries.value = { labels: [], series: {}, units: {} }
    trendError.value = error instanceof Error ? error.message : 'Unexpected error.'
  } finally {
    trendLoading.value = false
  }
}

const loadHistoricalWeather = async () => {
  const rawSlug = typeof route.params.suburb === 'string' ? route.params.suburb : ''
  const state = typeof route.query.state === 'string' ? route.query.state : ''
  const suburbQuery = slugToQuery(rawSlug)

  greenError.value = ''

  if (!suburbQuery || !state) {
    greenError.value = 'Missing suburb or state. Please search again.'
    greenSummaryRows.value = buildGreenSummaryRows(null)
    return
  }

  const cacheKey = getHistoricalWeatherCacheKey(suburbQuery, state)
  const cachedData = readCache(cacheKey)
  if (cachedData) {
    greenSummaryRows.value = buildGreenSummaryRows(cachedData)
    return
  }

  greenLoading.value = true

  try {
    const { startDate, endDate } = getHistoricalDateRange(HISTORICAL_DAYS)
    const weatherUrl = new URL(HISTORICAL_WEATHER_ENDPOINT)
    weatherUrl.searchParams.set('suburb', suburbQuery)
    weatherUrl.searchParams.set('state', state.toUpperCase())
    weatherUrl.searchParams.set('start_date', startDate)
    weatherUrl.searchParams.set('end_date', endDate)
    weatherUrl.searchParams.set(
      'hourly',
      'temperature_2m,rain,vapour_pressure_deficit,soil_temperature_0_to_7cm,soil_moisture_0_to_7cm',
    )
    weatherUrl.searchParams.set('timezone', 'auto')

    const response = await fetch(weatherUrl)
    if (!response.ok) {
      throw new Error('Failed to fetch historical weather data.')
    }

    const payload = await response.json()
    const data = payload.data || payload
    writeCache(cacheKey, data)
    greenSummaryRows.value = buildGreenSummaryRows(data)
  } catch (error) {
    greenSummaryRows.value = buildGreenSummaryRows(null)
    greenError.value = error instanceof Error ? error.message : 'Unexpected error.'
  } finally {
    greenLoading.value = false
  }
}

const loadHistoricalWeatherTrend = async () => {
  const rawSlug = typeof route.params.suburb === 'string' ? route.params.suburb : ''
  const state = typeof route.query.state === 'string' ? route.query.state : ''
  const suburbQuery = slugToQuery(rawSlug)

  greenTrendError.value = ''

  if (!suburbQuery || !state) {
    greenTrendError.value = 'Missing suburb or state. Please search again.'
    greenTrendSeries.value = { labels: [], series: {}, units: {} }
    return
  }

  const cacheKey = getHistoricalWeatherTrendCacheKey(suburbQuery, state)
  const cachedData = readCache(cacheKey)
  if (cachedData) {
    greenTrendSeries.value = buildGreenTrendSeries(cachedData)
    greenTrendLoaded.value = true
    return
  }

  greenTrendLoading.value = true

  try {
    const { startDate, endDate } = getHistoricalDateRange(HISTORICAL_TREND_DAYS)
    const weatherUrl = new URL(HISTORICAL_WEATHER_ENDPOINT)
    weatherUrl.searchParams.set('suburb', suburbQuery)
    weatherUrl.searchParams.set('state', state.toUpperCase())
    weatherUrl.searchParams.set('start_date', startDate)
    weatherUrl.searchParams.set('end_date', endDate)
    weatherUrl.searchParams.set(
      'hourly',
      'temperature_2m,rain,vapour_pressure_deficit,soil_temperature_0_to_7cm,soil_moisture_0_to_7cm',
    )
    weatherUrl.searchParams.set('timezone', 'auto')

    const response = await fetch(weatherUrl)
    if (!response.ok) {
      throw new Error('Failed to fetch historical weather trend data.')
    }

    const payload = await response.json()
    const data = payload.data || payload
    writeCache(cacheKey, data)
    greenTrendSeries.value = buildGreenTrendSeries(data)
    greenTrendLoaded.value = true
  } catch (error) {
    greenTrendSeries.value = { labels: [], series: {}, units: {} }
    greenTrendError.value = error instanceof Error ? error.message : 'Unexpected error.'
  } finally {
    greenTrendLoading.value = false
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

const trendChartData = computed(() => {
  const series = trendSeries.value.series || {}
  const labels = (trendSeries.value.labels || []).map(formatDateLabel)
  const metric = trendMetricOptions.find((item) => item.key === selectedTrendMetric.value)
  const label = metric ? metric.label : selectedTrendMetric.value
  const unit = trendSeries.value.units?.[selectedTrendMetric.value] || 'ug/m3'
  const data = Array.isArray(series[selectedTrendMetric.value])
    ? series[selectedTrendMetric.value]
    : []

  return {
    labels,
    datasets: [
      {
        label: `${label} (${unit})`,
        data,
        fill: false,
        tension: 0.35,
        borderColor: '#0f766e',
        backgroundColor: 'rgba(15, 118, 110, 0.2)',
        pointRadius: 0,
        borderWidth: 2,
      },
    ],
  }
})

const greenTrendChartData = computed(() => {
  const series = greenTrendSeries.value.series || {}
  const labels = (greenTrendSeries.value.labels || []).map(formatDateLabel)
  const metric = greenTrendMetricOptions.find(
    (item) => item.key === selectedGreenTrendMetric.value,
  )
  const label = metric ? metric.label : selectedGreenTrendMetric.value
  const unit = greenTrendSeries.value.units?.[selectedGreenTrendMetric.value] || ''
  const data = Array.isArray(series[selectedGreenTrendMetric.value])
    ? series[selectedGreenTrendMetric.value]
    : []

  return {
    labels,
    datasets: [
      {
        label: unit ? `${label} (${unit})` : label,
        data,
        fill: false,
        tension: 0.35,
        borderColor: '#0f766e',
        backgroundColor: 'rgba(15, 118, 110, 0.2)',
        pointRadius: 0,
        borderWidth: 2,
      },
    ],
  }
})

const trendChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      labels: {
        color: '#334155',
      },
    },
  },
  scales: {
    x: {
      ticks: {
        color: '#64748b',
        maxTicksLimit: 10,
      },
      grid: {
        color: '#e2e8f0',
      },
    },
    y: {
      ticks: {
        color: '#64748b',
      },
      grid: {
        color: '#e2e8f0',
      },
    },
  },
}))

const greenTrendChartOptions = computed(() => trendChartOptions.value)

const airQualitySummaryRows = computed(() => {
  const statsByMetric = {}
  const series = trendSeries.value.series || {}
  trendMetricOptions.forEach(({ key }) => {
    statsByMetric[key] = computeSeriesStats(series[key])
  })

  return airQualityRows.value.map((row) => {
    const stats = statsByMetric[row.key]
    return {
      ...row,
      median: stats ? formatStatValue(stats.median) : 'N/A',
      average: stats ? formatStatValue(stats.average) : 'N/A',
      minimum: stats ? formatStatValue(stats.minimum) : 'N/A',
      maximum: stats ? formatStatValue(stats.maximum) : 'N/A',
    }
  })
})

onMounted(loadAirQuality)
onMounted(loadAirQualityTrend)
onMounted(loadHistoricalWeather)
onMounted(loadHistoricalWeatherTrend)
onMounted(loadLga)
onMounted(refreshSubscriptionStatus)
watch(
  () => [route.params.suburb, route.query.state],
  () => {
    loadAirQuality()
    trendLoaded.value = false
    loadAirQualityTrend()
    loadHistoricalWeather()
    greenTrendLoaded.value = false
    loadHistoricalWeatherTrend()
    loadLga()
  },
)
watch(
  () => [authStore.user?.uid, lgaName.value],
  () => {
    refreshSubscriptionStatus()
  },
)
watch(
  () => activeAirSubtab.value,
  (value) => {
    if (value === 'trend' && !trendLoaded.value && !trendLoading.value) {
      loadAirQualityTrend()
    }
  },
)
watch(
  () => activeGreenSubtab.value,
  (value) => {
    if (value === 'trend' && !greenTrendLoaded.value && !greenTrendLoading.value) {
      loadHistoricalWeatherTrend()
    }
  },
)
</script>
