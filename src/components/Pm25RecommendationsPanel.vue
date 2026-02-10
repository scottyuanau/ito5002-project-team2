<template>
  <div :class="layoutClasses">
    <div class="min-w-0 rounded-2xl border border-slate-200 bg-white p-4">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p class="text-sm font-medium text-slate-900">PM2.5 gauge</p>
          <p class="text-xs text-slate-500">Three-month range: {{ rangeLabel }}</p>
        </div>
        <p class="text-xs text-slate-500">Current: {{ currentLabel }}</p>
      </div>
      <div class="mt-3 h-64 w-full">
        <div class="group relative h-full w-full">
          <div ref="pm25GaugeContainer" class="h-full w-full"></div>
          <div
            v-if="showGaugeInfo"
            class="absolute left-1/2 top-4 w-[260px] -translate-x-1/2 rounded-xl border border-slate-200 bg-white/95 p-3 text-left text-xs text-slate-600 opacity-0 shadow-lg backdrop-blur transition duration-200 group-hover:translate-y-1 group-hover:opacity-100"
            role="tooltip"
          >
            <p class="font-semibold text-slate-900">
              <i class="pi pi-exclamation-circle mr-1 text-slate-400"></i>
              PM2.5 is the primary measure of air quality.
            </p>
            <p class="mt-1">
              Go to the
              <RouterLink to="/knowledge" class="font-medium text-slate-900 underline">
                knowledge base
              </RouterLink>
              for details.
            </p>
          </div>
        </div>
      </div>
    </div>
    <div class="min-w-0 rounded-2xl border border-slate-200 bg-white p-4">
      <p class="text-sm font-medium text-slate-900">{{ title }}</p>
      <ul class="mt-3 space-y-2 text-left text-sm text-slate-600">
        <li class="flex items-start gap-2">
          <span>{{ pm25Tier.emoji }}</span>
          <span>Air quality looks {{ pm25Tier.label.toLowerCase() }} right now</span>
        </li>
        <li class="flex items-start gap-2">
          <span>📍</span>
          <span>{{ pm25Tier.summary }}</span>
        </li>
        <li class="flex items-start gap-2">
          <span>✅</span>
          <span>{{ pm25Tier.guidance }}</span>
        </li>
        <li class="flex items-start gap-2">
          <span>{{ pm25MaskAdvice.emoji }}</span>
          <span>{{ pm25MaskAdvice.text }}</span>
        </li>
      </ul>
      <ul class="mt-4 space-y-2 text-sm text-slate-600">
        <li v-if="walkRecommendation" class="flex items-start gap-2">
          <span>🚶</span>
          <span>{{ walkRecommendation }}</span>
        </li>
        <li
          v-for="(recommendation, index) in pm25Recommendations"
          :key="`${pm25Tier.label}-${index}`"
          class="flex items-start gap-2"
        >
          <span>{{ recommendation.emoji }}</span>
          <span>{{ recommendation.text }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Highcharts from 'highcharts'
import HighchartsMore from 'highcharts/highcharts-more'
import SolidGauge from 'highcharts/modules/solid-gauge'

HighchartsMore(Highcharts)
SolidGauge(Highcharts)

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  currentValue: {
    type: Number,
    default: null,
  },
  trendValues: {
    type: Array,
    default: () => [],
  },
  unit: {
    type: String,
    default: 'ug/m3',
  },
  layout: {
    type: String,
    default: 'stacked',
  },
  showGaugeInfo: {
    type: Boolean,
    default: false,
  },
  hourlySeries: {
    type: Object,
    default: () => ({ labels: [], historical: [], forecast: [], unit: 'ug/m3' }),
  },
})

const pm25GaugeContainer = ref(null)
const pm25GaugeChart = ref(null)

const layoutClasses = computed(() =>
  props.layout === 'split'
    ? 'grid w-full max-w-full min-w-0 gap-4 lg:grid-cols-2'
    : 'flex w-full max-w-full min-w-0 flex-col gap-4',
)

const formatStatValue = (value) => {
  if (!Number.isFinite(value)) {
    return 'N/A'
  }
  return Number(value.toFixed(2))
}

// Summarize a numeric series for min/max stats.
const computeSeriesStats = (values) => {
  if (!Array.isArray(values) || values.length === 0) {
    return null
  }
  const cleaned = values.filter((value) => Number.isFinite(value))
  if (cleaned.length === 0) {
    return null
  }
  const sorted = [...cleaned].sort((a, b) => a - b)
  return {
    minimum: sorted[0],
    maximum: sorted[sorted.length - 1],
  }
}

const pm25CurrentValue = computed(() =>
  Number.isFinite(props.currentValue) ? props.currentValue : null,
)
const pm25TrendStats = computed(() => computeSeriesStats(props.trendValues))

const rangeLabel = computed(() => {
  const stats = pm25TrendStats.value
  if (!stats) {
    return 'N/A'
  }
  return `${formatStatValue(stats.minimum)}–${formatStatValue(stats.maximum)} ${props.unit}`
})

const currentLabel = computed(() => {
  const value = pm25CurrentValue.value
  return Number.isFinite(value) ? `${formatStatValue(value)} ${props.unit}` : 'N/A'
})

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

const pm25Tier = computed(() => getPm25Tier(pm25CurrentValue.value))

// Provide a dedicated mask recommendation row for each PM2.5 tier.
const getPm25MaskAdvice = (tierLabel) => {
  if (tierLabel === 'Very Good' || tierLabel === 'Good') {
    return {
      emoji: '😌',
      text: 'Mask advice: No mask needed for most people.',
    }
  }
  if (tierLabel === 'Moderate') {
    return {
      emoji: '😷',
      text: 'Mask advice: Consider a mask if you are sensitive or outdoors for long periods.',
    }
  }
  if (tierLabel === 'Poor' || tierLabel === 'Very Poor' || tierLabel === 'Hazardous') {
    return {
      emoji: '😷',
      text: 'Mask advice: Wear a well-fitted mask outdoors.',
    }
  }
  return {
    emoji: '⚪',
    text: 'Mask advice: Unavailable without recent PM2.5 data.',
  }
}

const pm25MaskAdvice = computed(() => getPm25MaskAdvice(pm25Tier.value.label))

const WALK_RECOMMENDATION_CACHE_TTL_MS = 60 * 60 * 1000
const WALK_RECOMMENDATION_CACHE_PREFIX = 'pm25WalkRecommendation:v1:'

const getPm25TierColor = (tierLabel) => {
  if (tierLabel === 'Very Good') {
    return '#22c55e'
  }
  if (tierLabel === 'Good') {
    return '#4ade80'
  }
  if (tierLabel === 'Moderate') {
    return '#facc15'
  }
  if (tierLabel === 'Poor') {
    return '#fb923c'
  }
  if (tierLabel === 'Very Poor') {
    return '#f87171'
  }
  if (tierLabel === 'Hazardous') {
    return '#dc2626'
  }
  return '#94a3b8'
}

const pm25Recommendations = computed(() => {
  const tier = pm25Tier.value.label
  const base = [
    { emoji: '🚶', text: 'If commuting, choose routes away from main roads' },
    { emoji: '🪟', text: 'Keep windows closed during heavy traffic' },
  ]
  if (tier === 'Very Good') {
    return [
      { emoji: '🟢', text: 'Air quality is clear' },
      { emoji: '🌿', text: 'Enjoy outdoor activities' },
      ...base,
    ]
  }
  if (tier === 'Good') {
    return [
      { emoji: '🟢', text: 'Air quality is generally safe' },
      {
        emoji: '🏃',
        text: 'Outdoor activity is fine for most people (e.g. people with no pre-existing medical condition)',
      },
      ...base,
    ]
  }
  if (tier === 'Moderate') {
    return [
      { emoji: '🟡', text: 'Air quality is noticeable at times' },
      { emoji: '😷', text: 'Sensitive people may feel effects outdoors' },
      { emoji: '🏃', text: 'Limit extended outdoor exercise if you feel symptoms' },
      ...base,
    ]
  }
  if (tier === 'Poor') {
    return [
      { emoji: '🟠', text: 'Air quality is above safe limits' },
      { emoji: '🏃', text: 'Reduce outdoor activity' },
      { emoji: '🏠', text: 'Keep strenuous exercise indoors' },
      ...base,
    ]
  }
  if (tier === 'Very Poor') {
    return [
      { emoji: '🔴', text: 'Air quality is unhealthy' },
      { emoji: '🏠', text: 'Avoid prolonged outdoor activity' },
      { emoji: '😷', text: 'Wear a mask if you must be outside' },
      ...base,
    ]
  }
  if (tier === 'Hazardous') {
    return [
      { emoji: '🛑', text: 'Air quality is dangerous' },
      { emoji: '🏠', text: 'Avoid outdoor activity' },
      { emoji: '🪟', text: 'Stay indoors with windows closed' },
      ...base,
    ]
  }
  return [{ emoji: '⚪', text: 'No recommendation available without recent data.' }]
})

// Keep only finite numeric values from a PM2.5 series.
const cleanNumericSeries = (values) =>
  (Array.isArray(values) ? values : []).filter((value) => Number.isFinite(Number(value)))

// Build a deterministic cache key from title and hourly PM2.5 inputs.
const getWalkRecommendationCacheKey = () => {
  const labels = Array.isArray(props.hourlySeries?.labels) ? props.hourlySeries.labels : []
  const historical = cleanNumericSeries(props.hourlySeries?.historical)
  const forecast = cleanNumericSeries(props.hourlySeries?.forecast)
  const signature = JSON.stringify({
    title: props.title || '',
    labels,
    historical,
    forecast,
  })
  return `${WALK_RECOMMENDATION_CACHE_PREFIX}${signature}`
}

// Read a cached recommendation payload with a fixed 1-hour TTL.
const readWalkRecommendationCache = (cacheKey) => {
  try {
    const raw = localStorage.getItem(cacheKey)
    if (!raw) {
      return null
    }
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') {
      return null
    }
    if (typeof parsed.fetchedAt !== 'number' || typeof parsed.text !== 'string') {
      return null
    }
    if (Date.now() - parsed.fetchedAt > WALK_RECOMMENDATION_CACHE_TTL_MS) {
      localStorage.removeItem(cacheKey)
      return null
    }
    return parsed.text
  } catch {
    return null
  }
}

// Cache the generated recommendation text for one hour.
const writeWalkRecommendationCache = (cacheKey, text) => {
  try {
    localStorage.setItem(cacheKey, JSON.stringify({ fetchedAt: Date.now(), text }))
  } catch {
    // Ignore storage failures in restricted browser modes.
  }
}

// Convert a label or hour index into a readable time label.
const resolveTimeLabel = (labels, index) => {
  const label = labels[index]
  if (typeof label === 'string' && label.trim()) {
    return label
  }
  const fallbackDate = new Date()
  fallbackDate.setMinutes(0, 0, 0)
  fallbackDate.setHours((fallbackDate.getHours() + index) % 24)
  return fallbackDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// Build a concise walk-time recommendation from recent historical and forecast PM2.5 values.
const buildWalkRecommendation = () => {
  const labels = Array.isArray(props.hourlySeries?.labels) ? props.hourlySeries.labels : []
  const historicalRaw = Array.isArray(props.hourlySeries?.historical) ? props.hourlySeries.historical : []
  const forecastRaw = Array.isArray(props.hourlySeries?.forecast) ? props.hourlySeries.forecast : []
  const historical = historicalRaw
    .map((value, index) => ({ value: Number(value), index }))
    .filter((item) => Number.isFinite(item.value))
  const forecast = forecastRaw
    .map((value, index) => ({ value: Number(value), index }))
    .filter((item) => Number.isFinite(item.value))

  if (!forecast.length && !historical.length) {
    return ''
  }

  if (!forecast.length) {
    const recentBest = [...historical].sort((a, b) => a.value - b.value)[0]
    const startTime = resolveTimeLabel(labels, recentBest.index)
    const endTime = resolveTimeLabel(labels, recentBest.index + 1)
    return `Best walk time: ${startTime} to ${endTime}.`
  }

  const bestForecast = [...forecast].sort((a, b) => a.value - b.value)[0]
  const startTime = resolveTimeLabel(labels, bestForecast.index)
  const endTime = resolveTimeLabel(labels, bestForecast.index + 1)
  return `Best walk time: ${startTime} to ${endTime}.`
}

const walkRecommendation = computed(() => {
  const cacheKey = getWalkRecommendationCacheKey()
  const cachedText = readWalkRecommendationCache(cacheKey)
  if (cachedText) {
    return cachedText
  }
  const text = buildWalkRecommendation()
  if (text) {
    writeWalkRecommendationCache(cacheKey, text)
  }
  return text
})

// Derive safe min/max bounds for the PM2.5 gauge when trend data is sparse.
// Include the current reading so the gauge always reflects live values.
const getPm25GaugeBounds = (stats, currentValue) => {
  const min = Number(stats?.minimum)
  const max = Number(stats?.maximum)
  const current = Number(currentValue)
  const hasStats = Number.isFinite(min) && Number.isFinite(max)
  const hasCurrent = Number.isFinite(current)

  if (!hasStats && !hasCurrent) {
    return { min: 0, max: 1 }
  }

  const resolvedMin = hasStats ? min : current
  const resolvedMax = hasStats ? max : current
  const boundedMin = hasCurrent ? Math.min(resolvedMin, current) : resolvedMin
  const boundedMax = hasCurrent ? Math.max(resolvedMax, current) : resolvedMax

  if (boundedMax <= boundedMin) {
    return { min: boundedMin, max: boundedMin + 1 }
  }

  return { min: boundedMin, max: boundedMax }
}

// Build the Highcharts gauge config for the PM2.5 recommendation card.
const buildPm25GaugeOptions = ({ min, max, current, unit, color }) => ({
  chart: {
    type: 'solidgauge',
    backgroundColor: 'transparent',
    height: 260,
  },
  title: null,
  pane: {
    startAngle: -120,
    endAngle: 120,
    background: [
      {
        outerRadius: '100%',
        innerRadius: '60%',
        shape: 'arc',
        borderWidth: 0,
        backgroundColor: '#e2e8f0',
      },
    ],
  },
  tooltip: {
    enabled: false,
  },
  yAxis: {
    min,
    max,
    lineWidth: 0,
    tickWidth: 0,
    minorTickInterval: null,
    tickAmount: 5,
    labels: {
      y: 16,
      style: {
        color: '#64748b',
      },
    },
    stops: [
      [0, color],
      [1, color],
    ],
  },
  plotOptions: {
    solidgauge: {
      dataLabels: {
        y: -12,
        borderWidth: 0,
        useHTML: true,
        format: `<div style="text-align:center"><span style="font-size:24px;color:#0f172a">{y:.1f}</span><br/><span style="font-size:12px;color:#64748b">${unit}</span></div>`,
      },
    },
  },
  series: [
    {
      name: 'PM2.5',
      data: [current],
      color,
    },
  ],
  credits: {
    enabled: false,
  },
})

const pm25GaugePayload = computed(() => {
  const bounds = getPm25GaugeBounds(pm25TrendStats.value, pm25CurrentValue.value)
  const currentValue = pm25CurrentValue.value
  return {
    min: bounds.min,
    max: bounds.max,
    current: Number.isFinite(currentValue) ? currentValue : bounds.min,
    unit: props.unit,
    color: getPm25TierColor(pm25Tier.value.label),
  }
})

// Render or update the PM2.5 gauge as data changes.
const updatePm25Gauge = async () => {
  await nextTick()
  if (!pm25GaugeContainer.value) {
    return
  }
  const options = buildPm25GaugeOptions(pm25GaugePayload.value)
  if (pm25GaugeChart.value) {
    pm25GaugeChart.value.update(options, true, true)
    return
  }
  pm25GaugeChart.value = Highcharts.chart(pm25GaugeContainer.value, options)
}

const destroyPm25Gauge = () => {
  if (pm25GaugeChart.value) {
    pm25GaugeChart.value.destroy()
    pm25GaugeChart.value = null
  }
}

onMounted(updatePm25Gauge)
onBeforeUnmount(destroyPm25Gauge)
watch(
  () => pm25GaugePayload.value,
  () => {
    updatePm25Gauge()
  },
  { deep: true },
)
</script>
