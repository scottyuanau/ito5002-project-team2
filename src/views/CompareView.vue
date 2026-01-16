<template>
  <section class="w-full max-w-6xl self-start space-y-8 text-left">
    <header class="space-y-2">
      <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Compare</p>
      <h1 class="text-3xl font-semibold text-slate-900">Compare suburb metrics</h1>
      <p class="text-sm text-slate-500">
        Compare air quality metrics across up to three suburbs.
      </p>
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

    <div v-else class="space-y-4">
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
                <td class="px-4 py-3 font-medium text-slate-700">{{ row.metric }}</td>
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
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import Button from 'primevue/button'
import Dropdown from 'primevue/dropdown'
import InputText from 'primevue/inputtext'
import Skeleton from 'primevue/skeleton'

const states = ['NSW', 'VIC', 'TAS', 'NT', 'SA', 'WA', 'QLD', 'ACT']
const suburbInput = ref('')
const selectedState = ref('')
const errorMessage = ref('')
const loading = ref(false)
const compareSuburbs = ref([])
const comparisonResults = ref({})

const MAX_COMPARE = 3
const CACHE_TTL_MS = 60 * 60 * 1000
const CACHE_PREFIX = 'airQualityCache:'
const COMPARE_STORAGE_KEY = 'compare:suburbs'

const pollutants = [
  { key: 'pm10', label: 'PM10' },
  { key: 'pm2_5', label: 'PM2.5' },
  { key: 'carbon_monoxide', label: 'CO' },
  { key: 'nitrogen_dioxide', label: 'NO2' },
  { key: 'sulphur_dioxide', label: 'SO2' },
  { key: 'ozone', label: 'O3' },
]

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

// Persist compare selections and cached metrics to local storage.
const saveCompareState = () => {
  try {
    const payload = {
      suburbs: compareSuburbs.value,
      results: comparisonResults.value,
    }
    localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // Ignore storage failures (e.g. private mode) to keep the UI responsive.
  }
}

// Load compare selections and cached metrics from local storage.
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
  } catch {
    compareSuburbs.value = []
    comparisonResults.value = {}
  }
}

// Read cached air quality data from local storage if it is still fresh.
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

// Store fresh air quality data in local storage.
const writeCache = (cacheKey, data) => {
  const payload = JSON.stringify({ fetchedAt: Date.now(), data })
  localStorage.setItem(cacheKey, payload)
}

// Resolve the base URL for the Firebase Functions endpoint.
const getAirQualityUrl = () => import.meta.env.VITE_FIREBASE_FUNCTIONS_BASEURL || ''

// Transform air quality payloads into metrics keyed by pollutant.
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

// Fetch air quality data for a single suburb, using cache when possible.
const fetchAirQuality = async (suburbName, state) => {
  const suburbQuery = suburbName.trim()
  const airQualityUrl = getAirQualityUrl()
  if (!airQualityUrl) {
    throw new Error('Missing Firebase Functions base URL configuration.')
  }

  const cacheKey = `${CACHE_PREFIX}${suburbQuery.toLowerCase()}|${state.toUpperCase()}`
  const cachedData = readCache(cacheKey)
  if (cachedData) {
    return cachedData
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
    throw new Error('Failed to fetch air quality data.')
  }

  const airPayload = await airResponse.json()
  const data = airPayload.data || airPayload
  writeCache(cacheKey, data)
  return data
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

// Remove a suburb and its results from comparison.
const removeSuburb = (key) => {
  compareSuburbs.value = compareSuburbs.value.filter((suburb) => suburb.key !== key)
  if (comparisonResults.value[key]) {
    const nextResults = { ...comparisonResults.value }
    delete nextResults[key]
    comparisonResults.value = nextResults
  }
}

// Load air quality metrics for all selected suburbs.
const loadComparison = async () => {
  if (compareSuburbs.value.length < 2) {
    return
  }

  loading.value = true
  const results = { ...comparisonResults.value }

  await Promise.all(
    compareSuburbs.value.map(async (suburb) => {
      try {
        const payload = await fetchAirQuality(suburb.suburb, suburb.state)
        results[suburb.key] = {
          label: suburb.label,
          metrics: buildAirQualityMetrics(payload),
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

const comparisonErrors = computed(() =>
  compareSuburbs.value
    .filter((suburb) => comparisonResults.value[suburb.key]?.error)
    .map((suburb) => ({
      key: suburb.key,
      label: `${suburb.label}: ${comparisonResults.value[suburb.key].error}`,
    })),
)

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
  },
  { deep: true },
)

// Persist compare results whenever metrics update.
watch(
  () => comparisonResults.value,
  () => {
    saveCompareState()
  },
  { deep: true },
)

// Persist compare selection changes.
watch(
  () => compareSuburbs.value,
  () => {
    saveCompareState()
  },
  { deep: true },
)

onMounted(() => {
  loadCompareState()
  if (compareSuburbs.value.length >= 2) {
    loadComparison()
  }
})
</script>
