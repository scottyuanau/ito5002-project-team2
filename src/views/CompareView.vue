<template>
  <section class="w-full max-w-6xl self-start space-y-8 py-6 text-left">
    <header class="space-y-2">
      <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Compare</p>
      <h1 class="text-3xl font-semibold text-slate-900">Compare suburb metrics</h1>
      <p class="text-sm text-slate-500">Compare air quality metrics across up to three suburbs.</p>
    </header>

    <form class="flex w-full flex-col gap-3 sm:flex-row" @submit.prevent="handleAdd">
      <InputText
        v-model="suburbInput"
        class="w-full"
        placeholder="Enter suburb name"
        aria-label="Suburb name"
      />
      <Dropdown
        v-model="selectedState"
        :options="states"
        class="w-full sm:w-40"
        placeholder="State"
        aria-label="State"
      />
      <Button type="submit" label="Add" class="w-full sm:w-auto" :disabled="!canAdd" />
    </form>

    <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>

    <div class="space-y-3">
      <h2 class="text-sm font-semibold text-slate-700">Selected suburbs</h2>
      <div class="flex flex-wrap gap-2">
        <div
          v-for="suburb in compareSuburbs"
          :key="suburb.key"
          class="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-sm"
        >
          <span class="font-medium text-slate-800">{{ suburb.label }}</span>
          <button
            type="button"
            class="rounded-full border border-transparent px-2 text-slate-500 hover:border-slate-200 hover:text-slate-900"
            aria-label="Remove suburb"
            @click="removeSuburb(suburb.key)"
          >
            ✕
          </button>
        </div>
        <p v-if="compareSuburbs.length === 0" class="text-sm text-slate-500">
          No suburbs added yet.
        </p>
      </div>
    </div>

    <div v-if="compareSuburbs.length < 2" class="rounded-2xl border border-slate-200 bg-white p-6">
      <p class="text-sm text-slate-600">Add at least 2 suburbs to compare.</p>
    </div>

    <Tabs v-else v-model:value="activeTab" class="w-full">
      <TabList>
        <Tab value="current">Current</Tab>
        <Tab value="historical">Historical</Tab>
      </TabList>
      <TabPanels>
        <TabPanel value="current">
          <div class="space-y-4 pt-4">
            <div class="flex items-center justify-between">
              <h2 class="text-base font-semibold text-slate-800">Air quality comparison</h2>
              <p v-if="loading" class="text-sm text-slate-500">Loading latest metrics...</p>
            </div>

            <div v-if="comparisonErrors.length" class="space-y-1">
              <p class="text-sm text-red-600">Some suburbs could not be loaded:</p>
              <ul class="list-disc pl-5 text-sm text-red-600">
                <li v-for="error in comparisonErrors" :key="error.key">{{ error.label }}</li>
              </ul>
            </div>

            <div class="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table class="min-w-full text-sm">
                <thead class="border-b border-slate-200 bg-slate-50 text-left">
                  <tr v-if="loading">
                    <th v-for="(cell, index) in skeletonHeader" :key="index" class="px-4 py-3">
                      <Skeleton height="1.1rem" width="80%" />
                    </th>
                  </tr>
                  <tr v-else>
                    <th class="px-4 py-3 font-semibold text-slate-600">Metric</th>
                    <th class="px-4 py-3 font-semibold text-slate-600">Unit</th>
                    <th
                      v-for="suburb in compareSuburbs"
                      :key="suburb.key"
                      class="px-4 py-3 font-semibold text-slate-700"
                    >
                      {{ suburb.label }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="row in loading ? pollutants : comparisonRows"
                    :key="row.key || row.metric"
                    class="border-b border-slate-200 last:border-b-0"
                  >
                    <template v-if="loading">
                      <td v-for="(cell, index) in skeletonHeader" :key="index" class="px-4 py-3">
                        <Skeleton height="1.1rem" width="100%" />
                      </td>
                    </template>
                    <template v-else>
                      <td class="px-4 py-3 font-medium text-slate-700">
                        <div class="flex items-center gap-2">
                          <span>{{ row.metric }}</span>
                          <i
                            v-if="pollutantDescriptions[row.key]"
                            v-tooltip.bottom="pollutantDescriptions[row.key]"
                            class="pi pi-question-circle cursor-pointer text-slate-400"
                            aria-hidden="true"
                          />
                        </div>
                      </td>
                      <td class="px-4 py-3 text-slate-500">{{ row.unit || '—' }}</td>
                      <td
                        v-for="value in row.values"
                        :key="value.key"
                        class="px-4 py-3 text-slate-700"
                      >
                        {{ value.value }}
                      </td>
                    </template>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="flex items-center justify-between pt-4">
              <h2 class="text-base font-semibold text-slate-800">Green space comparison</h2>
              <p v-if="greenLoading" class="text-sm text-slate-500">Loading latest metrics...</p>
            </div>

            <div v-if="greenComparisonErrors.length" class="space-y-1">
              <p class="text-sm text-red-600">Some suburbs could not be loaded:</p>
              <ul class="list-disc pl-5 text-sm text-red-600">
                <li v-for="error in greenComparisonErrors" :key="error.key">{{ error.label }}</li>
              </ul>
            </div>

            <div class="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table class="min-w-full text-sm">
                <thead class="border-b border-slate-200 bg-slate-50 text-left">
                  <tr v-if="greenLoading">
                    <th v-for="(cell, index) in skeletonHeader" :key="index" class="px-4 py-3">
                      <Skeleton height="1.1rem" width="80%" />
                    </th>
                  </tr>
                  <tr v-else>
                    <th class="px-4 py-3 font-semibold text-slate-600">Metric</th>
                    <th class="px-4 py-3 font-semibold text-slate-600">Unit</th>
                    <th
                      v-for="suburb in compareSuburbs"
                      :key="suburb.key"
                      class="px-4 py-3 font-semibold text-slate-700"
                    >
                      {{ suburb.label }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="row in greenLoading ? greenMetrics : greenComparisonRows"
                    :key="row.key || row.metric"
                    class="border-b border-slate-200 last:border-b-0"
                  >
                    <template v-if="greenLoading">
                      <td v-for="(cell, index) in skeletonHeader" :key="index" class="px-4 py-3">
                        <Skeleton height="1.1rem" width="100%" />
                      </td>
                    </template>
                    <template v-else>
                      <td class="px-4 py-3 font-medium text-slate-700">
                        <div class="flex items-center gap-2">
                          <span>{{ row.metric }}</span>
                          <i
                            v-if="greenMetricDescriptions[row.key]"
                            v-tooltip.bottom="greenMetricDescriptions[row.key]"
                            class="pi pi-question-circle cursor-pointer text-slate-400"
                            aria-hidden="true"
                          />
                        </div>
                      </td>
                      <td class="px-4 py-3 text-slate-500">{{ row.unit || '—' }}</td>
                      <td
                        v-for="value in row.values"
                        :key="value.key"
                        class="px-4 py-3 text-slate-700"
                      >
                        {{ value.value }}
                      </td>
                    </template>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </TabPanel>

        <TabPanel value="historical">
          <div class="space-y-4 pt-4">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 class="text-base font-semibold text-slate-800">Air quality trend comparison</h2>
                <p class="text-sm text-slate-500">Compare the last 3 months across suburbs.</p>
              </div>
              <div class="w-full sm:w-56">
                <Dropdown
                  v-model="selectedHistoricalMetric"
                  :options="trendMetricOptions"
                  option-label="label"
                  option-value="key"
                  placeholder="Select metric"
                  class="w-full"
                  aria-label="Trend metric"
                />
              </div>
            </div>

            <p v-if="trendLoading" class="text-sm text-slate-500">Loading trend data...</p>

            <div v-if="trendComparisonErrors.length" class="space-y-1">
              <p class="text-sm text-red-600">Some suburbs could not be loaded:</p>
              <ul class="list-disc pl-5 text-sm text-red-600">
                <li v-for="error in trendComparisonErrors" :key="error.key">{{ error.label }}</li>
              </ul>
            </div>

            <p v-if="!trendLoading && !trendLabelKeys.length" class="text-sm text-slate-500">
              No trend data available for the selected suburbs.
            </p>

            <div v-else class="rounded-2xl border border-slate-200 bg-white p-4">
              <Chart
                type="line"
                :data="historicalChartData"
                :options="historicalChartOptions"
                class="h-80 w-full"
              />
              <p class="pt-2 text-xs text-slate-500">
                Metric: {{ selectedHistoricalMetricLabel }}
                <span v-if="historicalMetricUnit">({{ historicalMetricUnit }})</span>
              </p>
            </div>
          </div>
        </TabPanel>
      </TabPanels>
    </Tabs>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import Button from 'primevue/button'
import Dropdown from 'primevue/dropdown'
import InputText from 'primevue/inputtext'
import Skeleton from 'primevue/skeleton'
import Chart from 'primevue/chart'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'

const states = ['NSW', 'VIC', 'TAS', 'NT', 'SA', 'WA', 'QLD', 'ACT']
const activeTab = ref('current')
const suburbInput = ref('')
const selectedState = ref('')
const errorMessage = ref('')
const loading = ref(false)
const greenLoading = ref(false)
const trendLoading = ref(false)
const reloadCurrentPending = ref(false)
const reloadGreenPending = ref(false)
const reloadTrendPending = ref(false)
const compareSuburbs = ref([])
const comparisonResults = ref({})
const greenComparisonResults = ref({})
const trendComparisonResults = ref({})

const MAX_COMPARE = 3
const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const CACHE_PREFIX = 'airQualityCache:'
const GREEN_CACHE_PREFIX = 'historicalWeatherCompareCache:'
const TREND_CACHE_PREFIX = 'airQualityTrendCompareCache:'
const COMPARE_STORAGE_KEY = 'compare:suburbs'
const HISTORICAL_WEATHER_ENDPOINT = 'https://lookuphistoricalweather-lz6cdeni5a-uc.a.run.app'
const HISTORICAL_DAYS = 30
const HISTORICAL_TREND_DAYS = 92
const CACHE_PREFIXES = [CACHE_PREFIX, GREEN_CACHE_PREFIX, TREND_CACHE_PREFIX]
const runtimeCache = new Map()

const pollutants = [
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

const trendMetricOptions = pollutants
const selectedHistoricalMetric = ref('pm2_5')

const greenMetrics = [
  { key: 'temperature_2m', label: 'Temperature (2 m)' },
  { key: 'rain', label: 'Rain' },
  { key: 'vapour_pressure_deficit', label: 'Vapour Pressure Deficit' },
  { key: 'soil_temperature_0_to_7cm', label: 'Soil Temperature (0-7 cm)' },
  { key: 'soil_moisture_0_to_7cm', label: 'Soil Moisture (0-7 cm)' },
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

const canAdd = computed(() => suburbInput.value.trim().length > 0 && selectedState.value)

// Normalize suburb and state into a unique storage key.
const getSuburbKey = (suburbName, state) =>
  `${suburbName.trim().toLowerCase()}|${state.toUpperCase()}`

// Build a human-friendly suburb label for display.
const toTitleCase = (value) =>
  value
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

// Persist compare selections and loaded metrics in local storage.
const saveCompareState = () => {
  try {
    const payload = {
      suburbs: compareSuburbs.value,
      results: comparisonResults.value,
      greenResults: greenComparisonResults.value,
      trendResults: trendComparisonResults.value,
      selectedHistoricalMetric: selectedHistoricalMetric.value,
      activeTab: activeTab.value,
    }
    localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // Ignore storage failures (e.g. private mode) to keep the UI responsive.
  }
}

// Load compare selections and loaded metrics from local storage.
const loadCompareState = () => {
  try {
    const raw = localStorage.getItem(COMPARE_STORAGE_KEY)
    if (!raw) {
      return
    }
    const parsed = JSON.parse(raw)
    if (parsed?.suburbs && Array.isArray(parsed.suburbs)) {
      compareSuburbs.value = parsed.suburbs
    }
    if (parsed?.results && typeof parsed.results === 'object') {
      comparisonResults.value = parsed.results
    }
    if (parsed?.greenResults && typeof parsed.greenResults === 'object') {
      greenComparisonResults.value = parsed.greenResults
    }
    if (parsed?.trendResults && typeof parsed.trendResults === 'object') {
      trendComparisonResults.value = parsed.trendResults
    }
    if (
      typeof parsed?.selectedHistoricalMetric === 'string' &&
      trendMetricOptions.some((metric) => metric.key === parsed.selectedHistoricalMetric)
    ) {
      selectedHistoricalMetric.value = parsed.selectedHistoricalMetric
    }
    if (parsed?.activeTab === 'current' || parsed?.activeTab === 'historical') {
      activeTab.value = parsed.activeTab
    }
  } catch {
    compareSuburbs.value = []
    comparisonResults.value = {}
    greenComparisonResults.value = {}
    trendComparisonResults.value = {}
  }
}

// Read cached entries from runtime memory first, then browser storage.
const readCache = (cacheKey) => {
  const runtimeEntry = runtimeCache.get(cacheKey)
  if (runtimeEntry && Date.now() - runtimeEntry.fetchedAt <= CACHE_TTL_MS) {
    return runtimeEntry.data
  }
  if (runtimeEntry) {
    runtimeCache.delete(cacheKey)
  }

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
      runtimeCache.delete(cacheKey)
      return null
    }
    runtimeCache.set(cacheKey, { fetchedAt: parsed.fetchedAt, data: parsed.data })
    return parsed.data
  } catch {
    localStorage.removeItem(cacheKey)
    runtimeCache.delete(cacheKey)
    return null
  }
}

const isQuotaExceededError = (error) =>
  error instanceof DOMException &&
  (error.name === 'QuotaExceededError' ||
    error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    error.code === 22 ||
    error.code === 1014)

// Remove stale and oldest app cache keys to free space for Safari localStorage limits.
const pruneCacheStorage = (removeAll = false) => {
  const now = Date.now()
  const cacheEntries = []

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index)
    if (!key || !CACHE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      continue
    }
    const raw = localStorage.getItem(key)
    if (!raw) {
      continue
    }
    try {
      const parsed = JSON.parse(raw)
      cacheEntries.push({
        key,
        fetchedAt: typeof parsed?.fetchedAt === 'number' ? parsed.fetchedAt : 0,
      })
    } catch {
      cacheEntries.push({ key, fetchedAt: 0 })
    }
  }

  if (removeAll) {
    cacheEntries.forEach((entry) => {
      localStorage.removeItem(entry.key)
      runtimeCache.delete(entry.key)
    })
    return
  }

  let removedCount = 0
  cacheEntries.forEach((entry) => {
    if (entry.fetchedAt <= 0 || now - entry.fetchedAt > CACHE_TTL_MS) {
      localStorage.removeItem(entry.key)
      runtimeCache.delete(entry.key)
      removedCount += 1
    }
  })

  if (removedCount > 0) {
    return
  }

  cacheEntries
    .sort((a, b) => a.fetchedAt - b.fetchedAt)
    .slice(0, Math.ceil(cacheEntries.length / 2))
    .forEach((entry) => {
      localStorage.removeItem(entry.key)
      runtimeCache.delete(entry.key)
    })
}

// Store fresh cache data in local storage with Safari quota fallback handling.
const writeCache = (cacheKey, data) => {
  const fetchedAt = Date.now()
  runtimeCache.set(cacheKey, { fetchedAt, data })
  const payload = JSON.stringify({ fetchedAt, data })

  try {
    localStorage.setItem(cacheKey, payload)
  } catch (error) {
    if (!isQuotaExceededError(error)) {
      return
    }

    try {
      pruneCacheStorage(false)
      localStorage.setItem(cacheKey, payload)
    } catch (retryError) {
      if (!isQuotaExceededError(retryError)) {
        return
      }
      try {
        pruneCacheStorage(true)
        localStorage.setItem(cacheKey, payload)
      } catch {
        // Keep runtime cache only if persistent storage remains full.
      }
    }
  }
}

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

// Resolve the base URL for the Firebase Functions endpoint.
const getAirQualityUrl = () => import.meta.env.VITE_FIREBASE_FUNCTIONS_BASEURL || ''

const getLatestNumericValue = (values) => {
  if (!Array.isArray(values)) {
    return null
  }
  for (let index = values.length - 1; index >= 0; index -= 1) {
    const value = Number(values[index])
    if (Number.isFinite(value)) {
      return value
    }
  }
  return null
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

// Transform air quality payloads into current metrics keyed by pollutant.
const buildAirQualityMetrics = (payload) => {
  if (!payload || typeof payload !== 'object') {
    return null
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
    return hourlyUnits[key] || 'ug/m3'
  }

  return pollutants.reduce((acc, metric) => {
    acc[metric.key] = {
      value: getValue(metric.key) ?? 'N/A',
      unit: getUnit(metric.key),
    }
    return acc
  }, {})
}

// Transform historical weather payloads into latest values per metric.
const buildGreenMetrics = (payload) => {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const hourly = payload.hourly || {}
  const hourlyUnits = payload.hourly_units || {}

  return greenMetrics.reduce((acc, metric) => {
    const values = Array.isArray(hourly[metric.key]) ? hourly[metric.key] : []
    const latestValue = getLatestNumericValue(values)
    acc[metric.key] = {
      value: latestValue === null ? 'N/A' : Number(latestValue.toFixed(2)),
      unit: hourlyUnits[metric.key] || '',
    }
    return acc
  }, {})
}

// Build daily averages from hourly air quality payloads for the historical comparison chart.
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

// Fetch current air metrics for one suburb, using 1-day cache.
const fetchAirQuality = async (suburbName, state) => {
  const suburbQuery = suburbName.trim()
  const airQualityUrl = getAirQualityUrl()
  if (!airQualityUrl) {
    throw new Error('Missing Firebase Functions base URL configuration.')
  }

  const cacheKey = `${CACHE_PREFIX}${suburbQuery.toLowerCase()}|${state.toUpperCase()}`
  const cachedData = readCache(cacheKey)
  if (cachedData) {
    if (cachedData.pm2_5 || cachedData.pm10 || cachedData.carbon_monoxide) {
      return cachedData
    }
    const metricsFromCache = buildAirQualityMetrics(cachedData)
    if (metricsFromCache) {
      writeCache(cacheKey, metricsFromCache)
      return metricsFromCache
    }
  }

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
  const metrics = buildAirQualityMetrics(data)
  if (!metrics) {
    throw new Error('Failed to parse air quality metrics.')
  }
  writeCache(cacheKey, metrics)
  return metrics
}

// Fetch latest historical-weather summary metrics for one suburb, using 1-day cache.
const fetchHistoricalWeather = async (suburbName, state) => {
  const suburbQuery = suburbName.trim()
  const cacheKey = `${GREEN_CACHE_PREFIX}${suburbQuery.toLowerCase()}|${state.toUpperCase()}`
  const cachedData = readCache(cacheKey)
  if (cachedData) {
    if (cachedData.temperature_2m || cachedData.rain) {
      return cachedData
    }
    const metricsFromCache = buildGreenMetrics(cachedData)
    if (metricsFromCache) {
      writeCache(cacheKey, metricsFromCache)
      return metricsFromCache
    }
  }

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
    const message = await getApiErrorMessage(response, 'Failed to fetch historical weather data.')
    throw new Error(message)
  }

  const payload = await response.json()
  const data = payload.data || payload
  const metrics = buildGreenMetrics(data)
  if (!metrics) {
    throw new Error('Failed to parse historical weather metrics.')
  }
  writeCache(cacheKey, metrics)
  return metrics
}

// Fetch three-month air quality trends for one suburb, using compact cached payloads.
const fetchAirQualityTrend = async (suburbName, state) => {
  const suburbQuery = suburbName.trim()
  const airQualityUrl = getAirQualityUrl()
  if (!airQualityUrl) {
    throw new Error('Missing Firebase Functions base URL configuration.')
  }

  const cacheKey = `${TREND_CACHE_PREFIX}${suburbQuery.toLowerCase()}|${state.toUpperCase()}`
  const cachedData = readCache(cacheKey)
  if (cachedData) {
    if (Array.isArray(cachedData.labels) && cachedData.series && cachedData.units) {
      return cachedData
    }
    const seriesFromCache = buildTrendSeries(cachedData)
    if (seriesFromCache.labels.length > 0) {
      writeCache(cacheKey, seriesFromCache)
      return seriesFromCache
    }
  }

  const airUrl = new URL(airQualityUrl)
  airUrl.searchParams.set('suburb', suburbQuery)
  airUrl.searchParams.set('state', state.toUpperCase())
  airUrl.searchParams.set(
    'hourly',
    'pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone',
  )
  airUrl.searchParams.set('past_days', String(HISTORICAL_TREND_DAYS))
  airUrl.searchParams.set('timezone', 'auto')

  const response = await fetch(airUrl)
  if (!response.ok) {
    const message = await getApiErrorMessage(response, 'Failed to fetch air quality trend data.')
    throw new Error(message)
  }

  const payload = await response.json()
  const data = payload.data || payload
  const trendSeries = buildTrendSeries(data)
  writeCache(cacheKey, trendSeries)
  return trendSeries
}

// Add a suburb into the comparison list.
const handleAdd = () => {
  errorMessage.value = ''

  if (!canAdd.value) {
    return
  }

  if (compareSuburbs.value.length >= MAX_COMPARE) {
    errorMessage.value = 'You can compare a maximum of 3 suburbs.'
    return
  }

  const rawSuburb = suburbInput.value.trim()
  const state = selectedState.value
  const key = getSuburbKey(rawSuburb, state)

  if (compareSuburbs.value.some((suburb) => suburb.key === key)) {
    errorMessage.value = 'That suburb is already in the comparison list.'
    return
  }

  compareSuburbs.value.push({
    key,
    suburb: rawSuburb,
    state,
    label: `${toTitleCase(rawSuburb)} (${state.toUpperCase()})`,
  })

  suburbInput.value = ''
  selectedState.value = ''
}

// Remove a suburb and its loaded results from comparison.
const removeSuburb = (key) => {
  compareSuburbs.value = compareSuburbs.value.filter((suburb) => suburb.key !== key)

  const nextCurrentResults = { ...comparisonResults.value }
  delete nextCurrentResults[key]
  comparisonResults.value = nextCurrentResults

  const nextGreenResults = { ...greenComparisonResults.value }
  delete nextGreenResults[key]
  greenComparisonResults.value = nextGreenResults

  const nextTrendResults = { ...trendComparisonResults.value }
  delete nextTrendResults[key]
  trendComparisonResults.value = nextTrendResults
}

// Load current air quality metrics for all selected suburbs.
const loadComparison = async () => {
  if (compareSuburbs.value.length < 2) {
    return
  }
  if (loading.value) {
    reloadCurrentPending.value = true
    return
  }

  loading.value = true
  const results = { ...comparisonResults.value }

  await Promise.all(
    compareSuburbs.value.map(async (suburb) => {
      try {
        const metrics = await fetchAirQuality(suburb.suburb, suburb.state)
        results[suburb.key] = {
          label: suburb.label,
          metrics,
        }
      } catch (error) {
        results[suburb.key] = {
          label: suburb.label,
          error: error instanceof Error ? error.message : 'Unexpected error.',
        }
      }
    }),
  )

  comparisonResults.value = results
  loading.value = false
  if (reloadCurrentPending.value) {
    reloadCurrentPending.value = false
    loadComparison()
  }
}

// Load current historical-weather summary metrics for all selected suburbs.
const loadGreenComparison = async () => {
  if (compareSuburbs.value.length < 2) {
    return
  }
  if (greenLoading.value) {
    reloadGreenPending.value = true
    return
  }

  greenLoading.value = true
  const results = { ...greenComparisonResults.value }

  await Promise.all(
    compareSuburbs.value.map(async (suburb) => {
      try {
        const metrics = await fetchHistoricalWeather(suburb.suburb, suburb.state)
        results[suburb.key] = {
          label: suburb.label,
          metrics,
        }
      } catch (error) {
        results[suburb.key] = {
          label: suburb.label,
          error: error instanceof Error ? error.message : 'Unexpected error.',
        }
      }
    }),
  )

  greenComparisonResults.value = results
  greenLoading.value = false
  if (reloadGreenPending.value) {
    reloadGreenPending.value = false
    loadGreenComparison()
  }
}

// Load three-month trend series for all selected suburbs.
const loadTrendComparison = async () => {
  if (compareSuburbs.value.length < 2) {
    return
  }
  if (trendLoading.value) {
    reloadTrendPending.value = true
    return
  }

  trendLoading.value = true
  const results = { ...trendComparisonResults.value }

  await Promise.all(
    compareSuburbs.value.map(async (suburb) => {
      try {
        const trend = await fetchAirQualityTrend(suburb.suburb, suburb.state)
        results[suburb.key] = {
          label: suburb.label,
          trend,
        }
      } catch (error) {
        results[suburb.key] = {
          label: suburb.label,
          error: error instanceof Error ? error.message : 'Unexpected error.',
        }
      }
    }),
  )

  trendComparisonResults.value = results
  trendLoading.value = false
  if (reloadTrendPending.value) {
    reloadTrendPending.value = false
    loadTrendComparison()
  }
}

const comparisonRows = computed(() =>
  pollutants.map((metric) => {
    const values = compareSuburbs.value.map((suburb) => {
      const metrics = comparisonResults.value[suburb.key]?.metrics
      const value = metrics?.[metric.key]?.value ?? '—'
      return { key: suburb.key, value }
    })

    const unit =
      compareSuburbs.value
        .map((suburb) => comparisonResults.value[suburb.key]?.metrics?.[metric.key]?.unit)
        .find((value) => value) || ''

    return {
      metric: metric.label,
      unit,
      values,
    }
  }),
)

const greenComparisonRows = computed(() =>
  greenMetrics.map((metric) => {
    const values = compareSuburbs.value.map((suburb) => {
      const metrics = greenComparisonResults.value[suburb.key]?.metrics
      const value = metrics?.[metric.key]?.value ?? '—'
      return { key: suburb.key, value }
    })

    const unit =
      compareSuburbs.value
        .map((suburb) => greenComparisonResults.value[suburb.key]?.metrics?.[metric.key]?.unit)
        .find((value) => value) || ''

    return {
      metric: metric.label,
      unit,
      values,
    }
  }),
)

const comparisonErrors = computed(() =>
  compareSuburbs.value
    .filter((suburb) => comparisonResults.value[suburb.key]?.error)
    .map((suburb) => ({
      key: suburb.key,
      label: `${suburb.label}: ${comparisonResults.value[suburb.key].error}`,
    })),
)

const greenComparisonErrors = computed(() =>
  compareSuburbs.value
    .filter((suburb) => greenComparisonResults.value[suburb.key]?.error)
    .map((suburb) => ({
      key: suburb.key,
      label: `${suburb.label}: ${greenComparisonResults.value[suburb.key].error}`,
    })),
)

const trendComparisonErrors = computed(() =>
  compareSuburbs.value
    .filter((suburb) => trendComparisonResults.value[suburb.key]?.error)
    .map((suburb) => ({
      key: suburb.key,
      label: `${suburb.label}: ${trendComparisonResults.value[suburb.key].error}`,
    })),
)

// Build a unified date axis for all suburbs in the historical trend chart.
const trendLabelKeys = computed(() => {
  const labelSet = new Set()
  compareSuburbs.value.forEach((suburb) => {
    const labels = trendComparisonResults.value[suburb.key]?.trend?.labels || []
    labels.forEach((label) => {
      if (typeof label === 'string') {
        labelSet.add(label)
      }
    })
  })
  return Array.from(labelSet).sort()
})

const selectedHistoricalMetricLabel = computed(() => {
  const metric = trendMetricOptions.find((item) => item.key === selectedHistoricalMetric.value)
  return metric ? metric.label : selectedHistoricalMetric.value
})

const historicalMetricUnit = computed(() => {
  for (const suburb of compareSuburbs.value) {
    const unit = trendComparisonResults.value[suburb.key]?.trend?.units?.[selectedHistoricalMetric.value]
    if (unit) {
      return unit
    }
  }
  return ''
})

const historicalChartData = computed(() => {
  const labelKeys = trendLabelKeys.value
  const labels = labelKeys.map(formatDateLabel)
  const palette = ['#0f766e', '#2563eb', '#be123c']

  const datasets = compareSuburbs.value.map((suburb, index) => {
    const trend = trendComparisonResults.value[suburb.key]?.trend
    const suburbLabels = Array.isArray(trend?.labels) ? trend.labels : []
    const suburbValues = Array.isArray(trend?.series?.[selectedHistoricalMetric.value])
      ? trend.series[selectedHistoricalMetric.value]
      : []

    const valueMap = new Map()
    suburbLabels.forEach((label, labelIndex) => {
      const numericValue = Number(suburbValues[labelIndex])
      valueMap.set(label, Number.isFinite(numericValue) ? numericValue : null)
    })

    const color = palette[index % palette.length]
    return {
      label: suburb.label,
      data: labelKeys.map((label) => valueMap.get(label) ?? null),
      fill: false,
      tension: 0.3,
      borderColor: color,
      backgroundColor: color,
      pointRadius: 0,
      pointHoverRadius: 3,
      borderWidth: 2,
      spanGaps: true,
    }
  })

  return {
    labels,
    datasets,
  }
})

const historicalChartOptions = computed(() => ({
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

const skeletonHeader = computed(() => Array.from({ length: compareSuburbs.value.length + 2 }))

// Refresh metrics whenever the selected suburbs change.
watch(
  compareSuburbs,
  () => {
    errorMessage.value = ''
    if (compareSuburbs.value.length < 2) {
      return
    }
    loadComparison()
    loadGreenComparison()
    if (activeTab.value === 'historical') {
      loadTrendComparison()
    }
  },
  { deep: true },
)

// Load trends when the historical tab is opened.
watch(activeTab, (value) => {
  if (value === 'historical' && compareSuburbs.value.length >= 2) {
    loadTrendComparison()
  }
})

// Persist compare results whenever metrics update.
watch(
  () => comparisonResults.value,
  () => {
    saveCompareState()
  },
  { deep: true },
)
watch(
  () => greenComparisonResults.value,
  () => {
    saveCompareState()
  },
  { deep: true },
)
watch(
  () => trendComparisonResults.value,
  () => {
    saveCompareState()
  },
  { deep: true },
)

// Persist compare selection and display settings.
watch(
  () => compareSuburbs.value,
  () => {
    saveCompareState()
  },
  { deep: true },
)
watch(selectedHistoricalMetric, saveCompareState)
watch(activeTab, saveCompareState)

onMounted(() => {
  loadCompareState()
  if (compareSuburbs.value.length >= 2) {
    loadComparison()
    loadGreenComparison()
    if (activeTab.value === 'historical') {
      loadTrendComparison()
    }
  }
})
</script>
