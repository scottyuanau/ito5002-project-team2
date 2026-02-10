<template>
  <section class="w-full max-w-5xl space-y-8 px-4 text-left sm:px-6">
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
                  activeAirSubtab === 'recommendations'
                    ? 'text-slate-900 underline decoration-2 underline-offset-4'
                    : 'text-slate-500 hover:text-slate-900 hover:underline hover:decoration-2 hover:underline-offset-4'
                "
                :aria-current="activeAirSubtab === 'recommendations' ? 'page' : undefined"
                @click="activeAirSubtab = 'recommendations'"
              >
                Recommendations
              </button>
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
            <div v-if="activeAirSubtab === 'recommendations'" class="space-y-4">
              <p class="text-sm text-slate-500">
                Recommended actions based on PM2.5 readings for the last three months.
              </p>
              <p v-if="trendError" class="text-sm text-red-600">{{ trendError }}</p>
              <p v-else-if="trendLoading" class="text-sm text-slate-500">
                Loading air quality trend data...
              </p>
              <p v-if="trendNotice" class="text-sm text-amber-700">
                {{ trendNotice }}
              </p>
              <Pm25RecommendationsPanel
                :title="`Today in ${suburbName}`"
                :current-value="pm25CurrentValue"
                :trend-values="pm25TrendValues"
                :unit="pm25Unit"
                :hourly-series="pm25HourlySeries"
              />
              <div class="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
                <div>
                  <p class="text-sm font-medium text-slate-900">Hourly trend (PM2.5)</p>
                  <p class="text-xs text-slate-500">
                    Last 12 hours and forecast for next 12 hours.
                  </p>
                </div>
                <p v-if="pm25HourlyError" class="text-sm text-red-600">{{ pm25HourlyError }}</p>
                <p v-else-if="pm25HourlyLoading" class="text-sm text-slate-500">
                  Loading hourly PM2.5 data...
                </p>
                <p v-if="pm25HourlyNotice" class="text-sm text-amber-700">
                  {{ pm25HourlyNotice }}
                </p>
                <p
                  v-if="
                    !pm25HourlyLoading &&
                    !pm25HourlyError &&
                    !pm25HourlyChartData.labels.length
                  "
                  class="text-sm text-slate-500"
                >
                  No hourly PM2.5 data available right now.
                </p>
                <div v-else class="h-72 w-full">
                  <Chart
                    type="line"
                    :data="pm25HourlyChartData"
                    :options="pm25HourlyChartOptions"
                    class="h-full w-full"
                  />
                </div>
              </div>
            </div>
            <div v-else-if="activeAirSubtab === 'summary'" class="space-y-4">
              <p class="text-sm text-slate-500">Current air pollution levels.</p>
              <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>
              <p v-if="airQualityNotice" class="text-sm text-amber-700">
                {{ airQualityNotice }}
              </p>
              <div class="rounded-2xl border border-slate-200 bg-white p-4">
                <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p class="text-sm font-medium text-slate-900">Air quality heatmap</p>
                    <p class="text-xs text-slate-500">
                      Current pollutant levels around the suburb.
                    </p>
                  </div>
                  <Dropdown
                    v-model="selectedHeatmapMetric"
                    :options="heatmapMetricOptions"
                    optionLabel="label"
                    optionValue="key"
                    class="w-full sm:w-48"
                    placeholder="Select pollutant"
                    aria-label="Select pollutant"
                  />
                </div>
                <p v-if="heatmapError" class="mt-2 text-sm text-red-600">{{ heatmapError }}</p>
                <p v-else-if="heatmapLoading" class="mt-2 text-sm text-slate-500">
                  Loading heatmap data...
                </p>
                <p v-if="heatmapNotice" class="mt-2 text-sm text-amber-700">
                  {{ heatmapNotice }}
                </p>
                <div
                  class="mt-3 h-72 w-full overflow-hidden rounded-xl border border-slate-100 bg-slate-50"
                >
                  <div ref="heatmapContainer" class="h-full w-full"></div>
                </div>
              </div>
              <DataTable
                :value="airQualitySummaryRows"
                stripedRows
                class="w-full"
                :loading="loading || trendLoading"
              >
                <Column field="pollutant" header="Pollutant">
                  <template #body="{ data }">
                    <div class="flex items-center gap-2">
                      <span>{{ data.pollutant }}</span>
                      <i
                        v-if="pollutantDescriptions[data.key]"
                        v-tooltip.bottom="pollutantDescriptions[data.key]"
                        class="pi pi-question-circle text-slate-400 cursor-pointer"
                        aria-hidden="true"
                      />
                    </div>
                  </template>
                </Column>
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
              <p v-if="trendNotice" class="text-sm text-amber-700">
                {{ trendNotice }}
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
                <Column field="metric" header="Metric">
                  <template #body="{ data }">
                    <div class="flex items-center gap-2">
                      <span>{{ data.metric }}</span>
                      <i
                        v-if="greenMetricDescriptions[data.key]"
                        v-tooltip.bottom="greenMetricDescriptions[data.key]"
                        class="pi pi-question-circle text-slate-400 cursor-pointer"
                        aria-hidden="true"
                      />
                    </div>
                  </template>
                </Column>
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
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
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
import mapboxgl from 'mapbox-gl'
import { db } from '../firebase'
import { useAuthStore } from '../stores/auth'
import Pm25RecommendationsPanel from '../components/Pm25RecommendationsPanel.vue'

const route = useRoute()
const authStore = useAuthStore()
const activeTab = ref('air')
const activeAirSubtab = ref('recommendations')
const activeGreenSubtab = ref('summary')
const loading = ref(false)
const errorMessage = ref('')
const airQualityNotice = ref('')
const trendLoading = ref(false)
const trendError = ref('')
const trendNotice = ref('')
const greenLoading = ref(false)
const greenError = ref('')
const greenTrendLoading = ref(false)
const greenTrendError = ref('')
const lgaName = ref('')
const lgaLoading = ref(false)
const lgaError = ref('')
const lgaCoordinates = ref(null)
const isSubscribed = ref(false)
const isUpdatingSubscription = ref(false)
const trendLoaded = ref(false)
const greenTrendLoaded = ref(false)
const heatmapContainer = ref(null)
const heatmapMap = ref(null)
const heatmapLoading = ref(false)
const heatmapError = ref('')
const heatmapNotice = ref('')
const heatmapLoaded = ref(false)
const heatmapPoints = ref([])
const pm25HourlyLoading = ref(false)
const pm25HourlyError = ref('')
const pm25HourlyNotice = ref('')
const pm25HourlyLoaded = ref(false)
const pm25HourlySeries = ref({ labels: [], historical: [], forecast: [], unit: 'ug/m3' })
const selectedHeatmapMetric = ref('pm2_5')
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
const pollutantDescriptions = {
  pm2_5:
    'PM2.5: Fine particles from exhaust, smoke and industry that can travel deep into lungs and blood.',
  pm10:
    'PM10: Larger particles like dust, pollen and smoke that can irritate airways and trigger asthma symptoms.',
  carbon_monoxide:
    'CO: A colorless, odorless gas from incomplete fuel burning that reduces oxygen delivery in the body.',
  nitrogen_dioxide:
    'NO2: A traffic-related gas that inflames lungs and worsens asthma and respiratory infections.',
  sulphur_dioxide:
    'SO2: A gas from fossil fuels and industry that can quickly trigger breathing difficulty and chest tightness.',
  ozone:
    'O3: Ground-level ozone formed in sunlight from emissions; it irritates lungs and makes exercise harder.',
}
const heatmapMetricOptions = trendMetricOptions
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
const CACHE_STALE_MS = 24 * 60 * 60 * 1000
const HEATMAP_CACHE_TTL_MS = 24 * 60 * 60 * 1000
const CACHE_PREFIX = 'airQualityCache:'
const TREND_CACHE_PREFIX = 'airQualityTrendCache:'
const HISTORICAL_WEATHER_CACHE_PREFIX = 'historicalWeatherCache:'
const HISTORICAL_WEATHER_TREND_CACHE_PREFIX = 'historicalWeatherTrendCache:'
const HEATMAP_CACHE_PREFIX = 'airHeatmapCache:v2:'
const PM25_HOURLY_CACHE_PREFIX = 'pm25HourlyTrendCache:v1:'
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
const getHeatmapCacheKey = (suburbQuery, state) =>
  `${HEATMAP_CACHE_PREFIX}${suburbQuery.toLowerCase()}|${state.toUpperCase()}`
const getPm25HourlyCacheKey = (suburbQuery, state) =>
  `${PM25_HOURLY_CACHE_PREFIX}${suburbQuery.toLowerCase()}|${state.toUpperCase()}`

const readCache = (cacheKey) => {
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
    if (typeof parsed.fetchedAt !== 'number' || !parsed.data) {
      return null
    }
    if (Date.now() - parsed.fetchedAt > CACHE_TTL_MS) {
      return null
    }
    return parsed.data
  } catch {
    try {
      localStorage.removeItem(cacheKey)
    } catch {
      // Ignore storage failures in restricted browser modes.
    }
    return null
  }
}

// Read cached entries with a custom TTL for heatmap data.
const readCacheWithTtl = (cacheKey, ttlMs) => {
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
    if (typeof parsed.fetchedAt !== 'number' || !parsed.data) {
      return null
    }
    if (Date.now() - parsed.fetchedAt > ttlMs) {
      return null
    }
    return parsed.data
  } catch {
    try {
      localStorage.removeItem(cacheKey)
    } catch {
      // Ignore storage failures in restricted browser modes.
    }
    return null
  }
}

// Read cached entries without enforcing a TTL (used for stale fallback messaging).
const readCacheEntry = (cacheKey) => {
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
    if (typeof parsed.fetchedAt !== 'number' || !parsed.data) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

const writeCache = (cacheKey, data) => {
  const payload = JSON.stringify({ fetchedAt: Date.now(), data })
  try {
    localStorage.setItem(cacheKey, payload)
  } catch {
    // Some browsers (Safari private mode) throw QuotaExceededError; skip caching.
  }
}

const formatFetchedAt = (timestamp) => {
  if (!timestamp) {
    return 'an earlier time'
  }
  return new Date(timestamp).toLocaleString()
}

const buildStaleNotice = (timestamp) =>
  `Data provider limit reached. Showing last saved data from ${formatFetchedAt(timestamp)}.`

// Pull a readable error message from failed API responses.
const getApiErrorMessage = async (response, fallbackMessage) => {
  let message = fallbackMessage
  try {
    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      const payload = await response.json()
      if (payload?.error) {
        message = payload.error
      }
    } else {
      const text = await response.text()
      if (text) {
        message = text
      }
    }
  } catch {
    message = fallbackMessage
  }
  if (response.status === 429 && !/quota/i.test(message)) {
    message = 'The data provider quota has been exceeded. Please try again later.'
  }
  return message
}

const getAirQualityUrl = () => import.meta.env.VITE_FIREBASE_FUNCTIONS_BASEURL || ''
const getLgaLookupUrl = () => import.meta.env.VITE_FIREBASE_LGA_LOOKUP_URL || ''
const getMapboxToken = () => import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || ''

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

// Extract suburb coordinates for map rendering from LGA lookup results.
const getLgaCoordinates = (results) => {
  if (!Array.isArray(results) || results.length === 0) {
    return null
  }
  const first = results[0]
  const lat = Number.parseFloat(first?.lat)
  const lon = Number.parseFloat(first?.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null
  }
  const boundingBox = Array.isArray(first?.boundingBox)
    ? first.boundingBox.map((value) => Number.parseFloat(value))
    : []
  return { lat, lon, boundingBox }
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
const greenMetricDescriptions = {
  temperature_2m:
    'Air temperature at 2 meters above ground, a standard reference for local ambient conditions.',
  rain: 'Rainfall amount accumulated over the measurement interval.',
  vapour_pressure_deficit:
    'Dryness of the air; higher VPD means air pulls more moisture from soil and plants.',
  soil_temperature_0_to_7cm:
    'Soil temperature near the surface (0-7 cm), useful for root-zone and germination conditions.',
  soil_moisture_0_to_7cm:
    'Water content in topsoil (0-7 cm), indicating near-surface moisture availability.',
}
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

const pm25CurrentValue = computed(() => {
  const row = airQualityRows.value.find((item) => item.key === 'pm2_5')
  const value = Number(row?.value)
  return Number.isFinite(value) ? value : null
})

const pm25TrendValues = computed(() => trendSeries.value.series?.pm2_5 || [])

const pm25Unit = computed(() => trendSeries.value.units?.pm2_5 || 'ug/m3')

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

// Format ISO hour values into compact labels for short-range charts.
const formatHourLabel = (dateValue) => {
  if (typeof dateValue !== 'string') {
    return ''
  }
  const parsed = new Date(dateValue)
  if (Number.isNaN(parsed.getTime())) {
    return dateValue
  }
  return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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

// Build a PM2.5 series split into last 12 historical hours and next 12 forecast hours.
const buildPm25HourlySeries = (payload) => {
  const fallback = { labels: [], historical: [], forecast: [], unit: 'ug/m3' }
  if (!payload || typeof payload !== 'object') {
    return fallback
  }

  const hourly = payload.hourly || {}
  const hourlyUnits = payload.hourly_units || {}
  const timeList = Array.isArray(hourly.time) ? hourly.time : []
  const values = Array.isArray(hourly.pm2_5) ? hourly.pm2_5 : []
  if (!timeList.length || !values.length) {
    return fallback
  }

  const entries = []
  timeList.forEach((timeValue, index) => {
    const parsed = new Date(timeValue)
    if (Number.isNaN(parsed.getTime())) {
      return
    }
    const numericValue = Number(values[index])
    entries.push({
      index,
      timeValue,
      timestamp: parsed.getTime(),
      value: Number.isFinite(numericValue) ? Number(numericValue.toFixed(2)) : null,
    })
  })

  if (!entries.length) {
    return fallback
  }

  const now = Date.now()
  let anchorPosition = 0
  let minDistance = Number.POSITIVE_INFINITY

  entries.forEach((entry, entryIndex) => {
    const distance = Math.abs(entry.timestamp - now)
    if (distance < minDistance) {
      minDistance = distance
      anchorPosition = entryIndex
    }
  })

  const historicalEntries = entries.slice(Math.max(0, anchorPosition - 11), anchorPosition + 1)
  const forecastEntries = entries.slice(anchorPosition + 1, anchorPosition + 13)
  const combinedEntries = [...historicalEntries, ...forecastEntries]

  return {
    labels: combinedEntries.map((entry) => formatHourLabel(entry.timeValue)),
    historical: combinedEntries.map((entry, index) =>
      index < historicalEntries.length ? entry.value : null,
    ),
    forecast: combinedEntries.map((entry, index) =>
      index >= historicalEntries.length ? entry.value : null,
    ),
    unit: hourlyUnits.pm2_5 || 'ug/m3',
  }
}

const normalizeSeedValue = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const hashSeed = (value) => {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

const seededRandom = (seed) => {
  let value = seed >>> 0
  return () => {
    value |= 0
    value = (value + 0x6d2b79f5) | 0
    let t = Math.imul(value ^ (value >>> 15), 1 | value)
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const buildHeatmapPoints = (center, seedKey) => {
  if (!center || !Number.isFinite(center.lat) || !Number.isFinite(center.lon)) {
    return []
  }
  const random = seededRandom(hashSeed(normalizeSeedValue(seedKey)))
  const radiusKm = 100

  const points = [
    {
      lat: center.lat,
      lon: center.lon,
    },
  ]

  for (let index = 0; index < 9; index += 1) {
    const angle = random() * Math.PI * 2
    const distanceKm = Math.sqrt(random()) * radiusKm
    const latOffset = (distanceKm * Math.cos(angle)) / 111
    const lonOffset =
      (distanceKm * Math.sin(angle)) / (111 * Math.cos((center.lat * Math.PI) / 180))
    points.push({
      lat: center.lat + latOffset,
      lon: center.lon + lonOffset,
    })
  }

  return points
}

// Pull current pollutant values from an air quality payload.
const extractCurrentMetrics = (payload) => {
  const data = payload?.data || payload
  const current = data?.current || null
  const hourly = data?.hourly || {}
  const timeList = Array.isArray(hourly.time) ? hourly.time : []
  const lastIndex = timeList.length > 0 ? timeList.length - 1 : -1

  const metricKeys = trendMetricOptions.map(({ key }) => key)
  const metrics = {}

  metricKeys.forEach((key) => {
    let value = null
    if (current && Object.prototype.hasOwnProperty.call(current, key)) {
      value = current[key]
    } else if (lastIndex >= 0 && Array.isArray(hourly[key])) {
      value = hourly[key][lastIndex]
    }
    const numericValue = Number(value)
    metrics[key] = Number.isFinite(numericValue) ? numericValue : null
  })

  return metrics
}

const buildHeatmapGeojson = (metricKey) => {
  const features = heatmapPoints.value
    .map((point) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [point.lon, point.lat],
      },
      properties: {
        value: point.metrics?.[metricKey] ?? null,
      },
    }))
    .filter((feature) => Number.isFinite(feature.properties.value))

  return {
    type: 'FeatureCollection',
    features,
  }
}

const getHeatmapMaxValue = (metricKey) => {
  const values = heatmapPoints.value
    .map((point) => point.metrics?.[metricKey])
    .filter((value) => Number.isFinite(value))
  return values.length ? Math.max(...values) : 1
}

const buildHeatmapWeightExpression = (maxValue) => [
  'interpolate',
  ['linear'],
  ['get', 'value'],
  0,
  0,
  maxValue || 1,
  1,
]

const updateHeatmapSource = () => {
  const map = heatmapMap.value
  if (!map || !map.isStyleLoaded()) {
    return
  }
  const source = map.getSource('air-heatmap')
  if (source) {
    source.setData(buildHeatmapGeojson(selectedHeatmapMetric.value))
  }
}

const updateHeatmapPaint = () => {
  const map = heatmapMap.value
  if (!map || !map.isStyleLoaded()) {
    return
  }
  const maxValue = getHeatmapMaxValue(selectedHeatmapMetric.value)
  map.setPaintProperty(
    'air-heatmap-layer',
    'heatmap-weight',
    buildHeatmapWeightExpression(maxValue),
  )
  map.setPaintProperty('air-heatmap-layer', 'heatmap-intensity', 1.25)
  map.setPaintProperty(
    'air-heatmap-layer',
    'heatmap-radius',
    ['interpolate', ['linear'], ['zoom'], 9, 30, 12, 55],
  )
}

const applyHeatmapUpdates = () => {
  const map = heatmapMap.value
  if (!map) {
    return
  }
  if (map.isStyleLoaded()) {
    updateHeatmapSource()
    updateHeatmapPaint()
    return
  }
  map.once('load', () => {
    updateHeatmapSource()
    updateHeatmapPaint()
  })
}

const fitHeatmapBounds = () => {
  const map = heatmapMap.value
  if (!map || !map.isStyleLoaded()) {
    return
  }
  let hasPoint = false
  const bounds = new mapboxgl.LngLatBounds()
  heatmapPoints.value.forEach((point) => {
    if (!Number.isFinite(point?.lat) || !Number.isFinite(point?.lon)) {
      return
    }
    bounds.extend([point.lon, point.lat])
    hasPoint = true
  })
  if (hasPoint) {
    map.fitBounds(bounds, { padding: 40, duration: 0 })
    return
  }
  if (lgaCoordinates.value) {
    map.flyTo({ center: [lgaCoordinates.value.lon, lgaCoordinates.value.lat], zoom: 11 })
  }
}

const destroyHeatmapMap = () => {
  if (heatmapMap.value) {
    heatmapMap.value.remove()
    heatmapMap.value = null
  }
}

const ensureHeatmapMap = async () => {
  const token = getMapboxToken()
  if (!token) {
    heatmapError.value = 'Missing Mapbox access token configuration.'
    return
  }
  mapboxgl.accessToken = token
  await nextTick()
  if (heatmapMap.value || !heatmapContainer.value) {
    return
  }
  const center = lgaCoordinates.value
  heatmapMap.value = new mapboxgl.Map({
    container: heatmapContainer.value,
    style: 'mapbox://styles/mapbox/light-v11',
    center: center ? [center.lon, center.lat] : [0, 0],
    zoom: 11,
  })
  heatmapMap.value.addControl(
    new mapboxgl.NavigationControl({ showCompass: false }),
  )
  heatmapMap.value.on('load', () => {
    if (!heatmapMap.value) {
      return
    }
    heatmapMap.value.addSource('air-heatmap', {
      type: 'geojson',
      data: buildHeatmapGeojson(selectedHeatmapMetric.value),
    })
    heatmapMap.value.addLayer({
      id: 'air-heatmap-layer',
      type: 'heatmap',
      source: 'air-heatmap',
      paint: {
        'heatmap-weight': buildHeatmapWeightExpression(
          getHeatmapMaxValue(selectedHeatmapMetric.value),
        ),
        'heatmap-intensity': 1.25,
        'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 9, 30, 12, 55],
        'heatmap-opacity': 0.95,
        'heatmap-color': [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0,
          'rgba(148, 163, 184, 0)',
          0.2,
          '#a7f3d0',
          0.4,
          '#34d399',
          0.6,
          '#fbbf24',
          0.8,
          '#f97316',
          1,
          '#ef4444',
        ],
      },
    })
    fitHeatmapBounds()
  })
}

const loadHeatmapData = async () => {
  const rawSlug = typeof route.params.suburb === 'string' ? route.params.suburb : ''
  const state = typeof route.query.state === 'string' ? route.query.state : ''
  const suburbQuery = slugToQuery(rawSlug)
  const airQualityUrl = getAirQualityUrl()

  heatmapError.value = ''
  heatmapNotice.value = ''

  if (!suburbQuery || !state) {
    heatmapError.value = 'Missing suburb or state. Please search again.'
    return
  }

  if (!airQualityUrl) {
    heatmapError.value = 'Missing Firebase Functions base URL configuration.'
    return
  }

  if (!lgaCoordinates.value) {
    heatmapError.value = 'No coordinate data available for this suburb.'
    return
  }

  const cacheKey = getHeatmapCacheKey(suburbQuery, state)
  const cachedData = readCacheWithTtl(cacheKey, HEATMAP_CACHE_TTL_MS)
  if (cachedData && Array.isArray(cachedData.points)) {
    heatmapPoints.value = cachedData.points
    heatmapLoaded.value = true
    applyHeatmapUpdates()
    fitHeatmapBounds()
    return
  }
  const staleCache = readCacheEntry(cacheKey)

  heatmapLoading.value = true
  heatmapNotice.value = ''

  try {
    const seedKey = `${suburbQuery}|${state.toUpperCase()}`
    const points = buildHeatmapPoints(lgaCoordinates.value, seedKey)
    const responses = await Promise.all(
      points.map(async (point) => {
        const airUrl = new URL(airQualityUrl)
        airUrl.searchParams.set('latitude', point.lat.toFixed(5))
        airUrl.searchParams.set('longitude', point.lon.toFixed(5))
        airUrl.searchParams.set(
          'current',
          'pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone',
        )
        const response = await fetch(airUrl)
        if (!response.ok) {
          const message = await getApiErrorMessage(
            response,
            'Failed to fetch heatmap air quality data.',
          )
          throw new Error(message)
        }
        const payload = await response.json()
        return {
          ...point,
          metrics: extractCurrentMetrics(payload),
        }
      }),
    )
    heatmapPoints.value = responses
    writeCache(cacheKey, { points: responses })
    heatmapLoaded.value = true
    applyHeatmapUpdates()
    fitHeatmapBounds()
  } catch (error) {
    if (
      staleCache?.data &&
      Array.isArray(staleCache.data.points) &&
      Date.now() - staleCache.fetchedAt <= CACHE_STALE_MS
    ) {
      heatmapPoints.value = staleCache.data.points
      heatmapLoaded.value = true
      heatmapNotice.value = buildStaleNotice(staleCache.fetchedAt)
      applyHeatmapUpdates()
      fitHeatmapBounds()
    } else {
      heatmapError.value = error instanceof Error ? error.message : 'Unexpected error.'
    }
  } finally {
    heatmapLoading.value = false
  }
}

const maybeLoadHeatmap = async () => {
  if (activeAirSubtab.value !== 'summary') {
    return
  }
  if (!lgaCoordinates.value) {
    return
  }
  if (!getMapboxToken()) {
    return
  }
  if (!heatmapLoaded.value && !heatmapLoading.value) {
    await loadHeatmapData()
  }
  await ensureHeatmapMap()
}

const resetHeatmapState = () => {
  heatmapLoaded.value = false
  heatmapPoints.value = []
  heatmapError.value = ''
  heatmapNotice.value = ''
  applyHeatmapUpdates()
}

const loadAirQuality = async () => {
  const rawSlug = typeof route.params.suburb === 'string' ? route.params.suburb : ''
  const state = typeof route.query.state === 'string' ? route.query.state : ''
  const suburbQuery = slugToQuery(rawSlug)
  const airQualityUrl = getAirQualityUrl()

  errorMessage.value = ''
  airQualityNotice.value = ''

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
  const staleCache = readCacheEntry(cacheKey)

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
      const message = await getApiErrorMessage(airResponse, 'Failed to fetch air quality data.')
      throw new Error(message)
    }

    const airPayload = await airResponse.json()
    const data = airPayload.data || airPayload
    writeCache(cacheKey, data)
    airQualityRows.value = buildAirQualityRows(data)
  } catch (error) {
    if (staleCache?.data && Date.now() - staleCache.fetchedAt <= CACHE_STALE_MS) {
      airQualityRows.value = buildAirQualityRows(staleCache.data)
      airQualityNotice.value = buildStaleNotice(staleCache.fetchedAt)
    } else {
      airQualityRows.value = buildAirQualityRows(null)
      errorMessage.value = error instanceof Error ? error.message : 'Unexpected error.'
    }
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
  trendNotice.value = ''

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
  const staleCache = readCacheEntry(cacheKey)

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
      const message = await getApiErrorMessage(
        airResponse,
        'Failed to fetch air quality trend data.',
      )
      throw new Error(message)
    }

    const airPayload = await airResponse.json()
    const data = airPayload.data || airPayload
    writeCache(cacheKey, data)
    trendSeries.value = buildTrendSeries(data)
    trendLoaded.value = true
  } catch (error) {
    if (staleCache?.data && Date.now() - staleCache.fetchedAt <= CACHE_STALE_MS) {
      trendSeries.value = buildTrendSeries(staleCache.data)
      trendLoaded.value = true
      trendNotice.value = buildStaleNotice(staleCache.fetchedAt)
    } else {
      trendSeries.value = { labels: [], series: {}, units: {} }
      trendError.value = error instanceof Error ? error.message : 'Unexpected error.'
    }
  } finally {
    trendLoading.value = false
  }
}

// Fetch and cache PM2.5 hourly history (last 12h) and forecast (next 12h) using suburb coordinates.
const loadPm25HourlyTrend = async () => {
  const rawSlug = typeof route.params.suburb === 'string' ? route.params.suburb : ''
  const state = typeof route.query.state === 'string' ? route.query.state : ''
  const suburbQuery = slugToQuery(rawSlug)

  pm25HourlyError.value = ''
  pm25HourlyNotice.value = ''

  if (!suburbQuery || !state) {
    pm25HourlyError.value = 'Missing suburb or state. Please search again.'
    pm25HourlySeries.value = { labels: [], historical: [], forecast: [], unit: 'ug/m3' }
    return
  }

  if (!lgaCoordinates.value) {
    if (!lgaLoading.value) {
      pm25HourlyError.value = 'No coordinate data available for this suburb.'
    }
    return
  }

  const cacheKey = getPm25HourlyCacheKey(suburbQuery, state)
  const cachedData = readCache(cacheKey)
  if (cachedData) {
    pm25HourlySeries.value = cachedData
    pm25HourlyLoaded.value = true
    return
  }
  const staleCache = readCacheEntry(cacheKey)

  pm25HourlyLoading.value = true

  try {
    const hourlyUrl = new URL('https://air-quality-api.open-meteo.com/v1/air-quality')
    hourlyUrl.searchParams.set('latitude', lgaCoordinates.value.lat.toFixed(5))
    hourlyUrl.searchParams.set('longitude', lgaCoordinates.value.lon.toFixed(5))
    hourlyUrl.searchParams.set('hourly', 'pm2_5')
    hourlyUrl.searchParams.set('past_days', '1')
    hourlyUrl.searchParams.set('forecast_days', '1')
    hourlyUrl.searchParams.set('timezone', 'auto')

    const response = await fetch(hourlyUrl)
    if (!response.ok) {
      const message = await getApiErrorMessage(response, 'Failed to fetch hourly PM2.5 data.')
      throw new Error(message)
    }

    const payload = await response.json()
    const data = payload.data || payload
    const series = buildPm25HourlySeries(data)
    pm25HourlySeries.value = series
    writeCache(cacheKey, series)
    pm25HourlyLoaded.value = true
  } catch (error) {
    if (staleCache?.data && Date.now() - staleCache.fetchedAt <= CACHE_STALE_MS) {
      pm25HourlySeries.value = staleCache.data
      pm25HourlyLoaded.value = true
      pm25HourlyNotice.value = buildStaleNotice(staleCache.fetchedAt)
    } else {
      pm25HourlySeries.value = { labels: [], historical: [], forecast: [], unit: 'ug/m3' }
      pm25HourlyError.value = error instanceof Error ? error.message : 'Unexpected error.'
    }
  } finally {
    pm25HourlyLoading.value = false
  }
}

const resetPm25HourlyState = () => {
  pm25HourlyLoaded.value = false
  pm25HourlyError.value = ''
  pm25HourlyNotice.value = ''
  pm25HourlySeries.value = { labels: [], historical: [], forecast: [], unit: 'ug/m3' }
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
  lgaCoordinates.value = null

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
    const results = payload.data || payload
    lgaName.value = getLgaDisplayName(results)
    lgaCoordinates.value = getLgaCoordinates(results)
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

const pm25HourlyChartData = computed(() => ({
  labels: pm25HourlySeries.value.labels,
  datasets: [
    {
      label: `Historical PM2.5 (${pm25HourlySeries.value.unit})`,
      data: pm25HourlySeries.value.historical,
      fill: false,
      tension: 0.25,
      borderColor: '#0f766e',
      backgroundColor: '#0f766e',
      borderWidth: 2,
      pointRadius: 2,
      pointHoverRadius: 4,
      spanGaps: false,
    },
    {
      label: `Forecast PM2.5 (${pm25HourlySeries.value.unit})`,
      data: pm25HourlySeries.value.forecast,
      fill: false,
      tension: 0.25,
      borderColor: '#f97316',
      backgroundColor: '#f97316',
      borderDash: [6, 4],
      borderWidth: 2,
      pointRadius: 2,
      pointHoverRadius: 4,
      spanGaps: false,
    },
  ],
}))

const pm25HourlyChartOptions = computed(() => ({
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
        maxTicksLimit: 12,
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
onMounted(maybeLoadHeatmap)
onBeforeUnmount(destroyHeatmapMap)
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
    resetHeatmapState()
    resetPm25HourlyState()
    maybeLoadHeatmap()
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
    if (value === 'recommendations' && !pm25HourlyLoaded.value && !pm25HourlyLoading.value) {
      loadPm25HourlyTrend()
    }
    if (value === 'trend' && !trendLoaded.value && !trendLoading.value) {
      loadAirQualityTrend()
    }
    if (value === 'summary') {
      maybeLoadHeatmap()
      return
    }
    destroyHeatmapMap()
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
watch(
  () => lgaCoordinates.value,
  (coords) => {
    if (coords && activeAirSubtab.value === 'recommendations' && !pm25HourlyLoaded.value) {
      loadPm25HourlyTrend()
    }
    if (!coords || activeAirSubtab.value !== 'summary') {
      return
    }
    if (heatmapMap.value) {
      heatmapMap.value.flyTo({ center: [coords.lon, coords.lat], zoom: 11 })
    }
    maybeLoadHeatmap()
  },
)
watch(
  () => selectedHeatmapMetric.value,
  () => {
    applyHeatmapUpdates()
  },
)
</script>
