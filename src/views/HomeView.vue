<template>
  <div class="flex w-full flex-col gap-20">
    <!-- Hero -->
    <section>
      <div class="relative h-96 w-full overflow-hidden shadow-sm md:h-120">
        <img src="/banner.jpg" alt="Environmental banner" class="h-full w-full object-cover" />
        <div class="absolute inset-0 bg-black/35"></div>
        <div
          class="absolute inset-0 flex flex-col gap-4 items-center justify-center px-6 text-center"
        >
          <h1 class="text-3xl font-semibold text-white drop-shadow-sm md:text-4xl">
            Save the Environment
          </h1>
          <p class="text-white">for a sustainable community</p>
          <Button
            label="Compare Suburbs"
            class="mt-2"
            severity="secondary"
            type="button"
            @click="handleCompare"
          />
        </div>
      </div>
    </section>

    <!-- Today in your area -->
    <section class="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6">
      <div class="space-y-2 text-center">
        <h2 class="text-3xl font-semibold text-slate-900">
          Today in {{ locationLabel }}
        </h2>
        <p class="text-sm text-slate-500">
          Live PM2.5 readings and safety guidance based on your current location.
        </p>
      </div>
      <p v-if="locationError || airQualityError" class="text-sm text-red-600">
        {{ locationError || airQualityError }}
      </p>
      <p v-else-if="locationLoading || airQualityLoading" class="text-sm text-slate-500">
        Loading local air quality...
      </p>
      <Pm25RecommendationsPanel
        v-if="!locationError && !airQualityError"
        layout="split"
        :title="`Today in ${locationLabel}`"
        :current-value="pm25CurrentValue"
        :trend-values="pm25TrendValues"
        :unit="pm25Unit"
      />
    </section>

    <!-- Daily air-friendly habit card -->
    <section class="mx-auto flex w-full max-w-3xl px-6">
      <div
        class="w-full rounded-2xl border border-emerald-100 bg-emerald-50/70 p-6 text-left shadow-sm"
      >
        <p class="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-700">
          Daily air-friendly habit
        </p>
        <h3 class="mt-3 text-lg font-semibold text-slate-900">
          {{ todaysTip.title }}
        </h3>
        <p class="mt-2 text-sm text-slate-700">
          {{ todaysTip.description }}
        </p>
        <p class="mt-3 text-xs text-slate-500">
          Small choices at home add up to cleaner air for your street and city.
        </p>
      </div>
    </section>

    <!-- Find a suburb -->
    <section class="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 self-start px-6">
      <div class="space-y-2 text-center">
        <h2 class="text-3xl font-semibold text-slate-900">Find a suburb</h2>
        <p class="text-sm text-slate-500">Search Australian suburbs by name and state.</p>
      </div>
      <form class="flex w-full flex-col gap-3 sm:flex-row" @submit.prevent="handleSearch">
        <InputText
          v-model="suburb"
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
        <Button type="submit" label="Search" class="w-full sm:w-auto" :disabled="!canSearch" />
      </form>
    </section>

    <!-- Popular cities -->
    <section class="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6">
      <div class="space-y-2 text-center">
        <h2 class="text-3xl font-semibold text-slate-900">Popular Cities</h2>
        <p class="text-sm text-slate-500">Jump straight to popular suburb highlights.</p>
      </div>
      <Carousel
        :value="popularSuburbs"
        :numVisible="3"
        :numScroll="1"
        :responsiveOptions="carouselBreakpoints"
        class="w-full"
      >
        <template #item="{ data }">
          <div
            class="mx-3 flex h-full cursor-pointer flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
            role="button"
            tabindex="0"
            @click="navigateToSuburb(data)"
            @keydown.enter="navigateToSuburb(data)"
          >
            <span class="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-500">
              {{ data.state }}
            </span>
            <div class="space-y-1">
              <h3 class="text-xl font-semibold text-slate-900">{{ data.title }}</h3>
              <p class="text-sm text-slate-500">{{ data.subtitle }}</p>
            </div>
            <span class="text-sm font-semibold text-emerald-600">
              Explore suburb
              <i class="pi pi-arrow-right ml-1 text-xs"></i>
            </span>
          </div>
        </template>
      </Carousel>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import Carousel from 'primevue/carousel'
import Dropdown from 'primevue/dropdown'
import InputText from 'primevue/inputtext'
import Pm25RecommendationsPanel from '../components/Pm25RecommendationsPanel.vue'

const router = useRouter()
const suburb = ref('')
const selectedState = ref('')
const states = ['NSW', 'VIC', 'TAS', 'NT', 'SA', 'WA', 'QLD', 'ACT']
const popularSuburbs = [
  { title: 'Sydney', subtitle: 'Sydney, NSW', slug: 'sydney', state: 'NSW' },
  { title: 'Clayton', subtitle: 'Clayton, Melbourne', slug: 'clayton', state: 'VIC' },
  { title: 'Brisbane', subtitle: 'Brisbane, QLD', slug: 'brisbane', state: 'QLD' },
  { title: 'Adelaide', subtitle: 'Adelaide, SA', slug: 'adelaide', state: 'SA' },
]
const carouselBreakpoints = [
  { breakpoint: '1024px', numVisible: 2, numScroll: 1 },
  { breakpoint: '640px', numVisible: 1, numScroll: 1 },
]

const canSearch = computed(() => suburb.value.trim().length > 0 && selectedState.value)
const locationLabel = ref('your area')
const locationLoading = ref(false)
const locationError = ref('')
const airQualityLoading = ref(false)
const airQualityError = ref('')
const pm25CurrentValue = ref(null)
const pm25TrendValues = ref([])
const pm25Unit = ref('ug/m3')

const HOME_CACHE_TTL_MS = 60 * 60 * 1000
const HOME_AIR_CACHE_PREFIX = 'homeAirQualityCache:v1:'
const HOME_LOCATION_CACHE_PREFIX = 'homeLocationCache:v1:'

const getAirQualityUrl = () => import.meta.env.VITE_FIREBASE_FUNCTIONS_BASEURL || ''

// Daily tips for individuals / families
const airTips = [
  {
    title: 'Swap short car trips for walking or cycling',
    description:
      'Many car trips are under 2–3 km. When you can, walk or ride instead to cut traffic pollution and boost your own fitness.',
  },
  {
    title: 'Use public transport or car-share for regular commutes',
    description:
      'Buses, trains and shared car trips mean fewer vehicles on the road and lower per-person emissions each day.',
  },
  {
    title: 'Plan errands to combine multiple stops in one trip',
    description:
      'Batch shopping, school runs and appointments together so you drive fewer kilometres overall in a week.',
  },
  {
    title: 'Avoid idling the car outside schools and shops',
    description:
      'Turn off your engine when parked or waiting. Idling burns fuel and creates extra pollution right where people are breathing.',
  },
  {
    title: 'Keep your car serviced and tyres correctly inflated',
    description:
      'Well-maintained vehicles use less fuel and release fewer pollutants. Check tyre pressure and service dates regularly.',
  },
  {
    title: 'Choose electric or induction appliances where possible',
    description:
      'If you’re upgrading, pick electric stoves and heaters instead of gas to cut indoor and outdoor air pollution over time.',
  },
  {
    title: 'Ventilate your home when outdoor air is healthy',
    description:
      'On days with good air quality, open windows on opposite sides of your home to flush out indoor pollutants and moisture.',
  },
  {
    title: 'Use the rangehood or exhaust fan while cooking',
    description:
      'Cooking can release smoke and tiny particles. Turn on your exhaust fan and keep filters clean to pull fumes outside.',
  },
  {
    title: 'Avoid smoking or burning incense indoors',
    description:
      'Second-hand smoke, incense and candles add fine particles to indoor air. Keep these outside and choose low-fragrance cleaners.',
  },
  {
    title: 'Dry clothes using sunshine and breeze when you can',
    description:
      'Use outdoor lines or a rack near an open window instead of a dryer to save energy and keep indoor humidity balanced.',
  },
  {
    title: 'Plant more greenery around your home or balcony',
    description:
      'Trees and shrubs help shade streets, catch dust and make walking more pleasant, encouraging low-pollution transport choices.',
  },
  {
    title: 'Make air-friendly choices a family conversation',
    description:
      'Talk with kids about walking to school, turning off lights and checking air-quality alerts so everyone can share the effort.',
  },
]

// pick a stable "tip of the day" based on the calendar day
const dailyTipIndex = computed(() => {
  const dayNumber = Math.floor(Date.now() / (1000 * 60 * 60 * 24))
  return dayNumber % airTips.length
})

const todaysTip = computed(() => airTips[dailyTipIndex.value])

// Read a cached payload when it is still within the TTL window.
const readCacheWithTtl = (cacheKey, ttlMs) => {
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
    if (Date.now() - parsed.fetchedAt > ttlMs) {
      localStorage.removeItem(cacheKey)
      return null
    }
    return parsed.data
  } catch {
    localStorage.removeItem(cacheKey)
    return null
  }
}

// Persist a payload with a timestamp so we can expire it later.
const writeCache = (cacheKey, data) => {
  const payload = JSON.stringify({ fetchedAt: Date.now(), data })
  localStorage.setItem(cacheKey, payload)
}

// Wrap the Geolocation API in a promise for async/await usage.
const getCurrentPosition = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'))
      return
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: HOME_CACHE_TTL_MS,
    })
  })

// Extract a readable suburb/city label from a reverse-geocode payload.
const getLocationLabelFromPayload = (payload) => {
  const address = payload?.address || {}
  return (
    address.suburb ||
    address.city ||
    address.town ||
    address.village ||
    address.county ||
    address.state ||
    'your area'
  )
}

// Build daily PM2.5 averages from hourly data for the recommendations panel.
const buildDailyPm25Series = (payload) => {
  const hourly = payload?.hourly || {}
  const hourlyUnits = payload?.hourly_units || {}
  const timeList = Array.isArray(hourly.time) ? hourly.time : []
  const values = Array.isArray(hourly.pm2_5) ? hourly.pm2_5 : []
  if (!timeList.length || !values.length) {
    return { values: [], unit: hourlyUnits.pm2_5 || 'ug/m3' }
  }

  const labels = []
  const labelIndex = new Map()
  const sums = []
  const counts = []

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
      sums[dayIndex] = 0
      counts[dayIndex] = 0
    }
    const value = values[index]
    if (value === null || value === undefined) {
      return
    }
    const numericValue = Number(value)
    if (!Number.isFinite(numericValue)) {
      return
    }
    sums[dayIndex] += numericValue
    counts[dayIndex] += 1
  })

  const dailyValues = sums.map((total, index) => {
    const count = counts[index]
    if (!count) {
      return null
    }
    return Number((total / count).toFixed(2))
  })

  return { values: dailyValues, unit: hourlyUnits.pm2_5 || 'ug/m3' }
}

// Pull the latest PM2.5 value from current or hourly data.
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

const applyAirQualityPayload = (payload) => {
  const { values, unit } = buildDailyPm25Series(payload)
  pm25TrendValues.value = values.filter((value) => Number.isFinite(value))
  pm25Unit.value = unit || 'ug/m3'
  pm25CurrentValue.value = extractCurrentPm25(payload)
}

const loadAirQualityByCoords = async ({ lat, lon, cacheKey }) => {
  const cachedAirQuality = readCacheWithTtl(cacheKey, HOME_CACHE_TTL_MS)
  if (cachedAirQuality) {
    applyAirQualityPayload(cachedAirQuality)
    return
  }

  const airQualityUrl = getAirQualityUrl()
  if (!airQualityUrl) {
    throw new Error('Missing Firebase Functions base URL configuration.')
  }

  const airUrl = new URL(airQualityUrl)
  airUrl.searchParams.set('latitude', lat.toString())
  airUrl.searchParams.set('longitude', lon.toString())
  airUrl.searchParams.set('current', 'pm2_5')
  airUrl.searchParams.set('hourly', 'pm2_5')
  airUrl.searchParams.set('past_days', '92')
  airUrl.searchParams.set('timezone', 'auto')

  const response = await fetch(airUrl)
  if (!response.ok) {
    throw new Error('Failed to fetch local air quality data.')
  }
  const payload = await response.json()
  const data = payload.data || payload
  writeCache(cacheKey, data)
  applyAirQualityPayload(data)
}

const loadAirQualityBySuburb = async ({ suburbName, state, cacheKey }) => {
  const cachedAirQuality = readCacheWithTtl(cacheKey, HOME_CACHE_TTL_MS)
  if (cachedAirQuality) {
    applyAirQualityPayload(cachedAirQuality)
    return
  }

  const airQualityUrl = getAirQualityUrl()
  if (!airQualityUrl) {
    throw new Error('Missing Firebase Functions base URL configuration.')
  }

  const airUrl = new URL(airQualityUrl)
  airUrl.searchParams.set('suburb', suburbName)
  airUrl.searchParams.set('state', state)
  airUrl.searchParams.set('current', 'pm2_5')
  airUrl.searchParams.set('hourly', 'pm2_5')
  airUrl.searchParams.set('past_days', '92')
  airUrl.searchParams.set('timezone', 'auto')

  const response = await fetch(airUrl)
  if (!response.ok) {
    throw new Error('Failed to fetch local air quality data.')
  }
  const payload = await response.json()
  const data = payload.data || payload
  writeCache(cacheKey, data)
  applyAirQualityPayload(data)
}

const loadLocalAirQuality = async () => {
  locationError.value = ''
  airQualityError.value = ''
  locationLoading.value = true
  airQualityLoading.value = true

  let position
  try {
    position = await getCurrentPosition()
  } catch (error) {
    locationLabel.value = 'Sydney'
    locationLoading.value = false
    try {
      await loadAirQualityBySuburb({
        suburbName: 'Sydney',
        state: 'NSW',
        cacheKey: `${HOME_AIR_CACHE_PREFIX}sydney|NSW`,
      })
    } catch (fallbackError) {
      airQualityError.value =
        fallbackError instanceof Error
          ? fallbackError.message
          : 'Unable to load local air quality.'
    } finally {
      airQualityLoading.value = false
    }
    return
  }

  locationLoading.value = false

  const lat = Number(position.coords.latitude.toFixed(3))
  const lon = Number(position.coords.longitude.toFixed(3))
  const locationCacheKey = `${HOME_LOCATION_CACHE_PREFIX}${lat}|${lon}`
  const airCacheKey = `${HOME_AIR_CACHE_PREFIX}${lat}|${lon}`

  const cachedLocation = readCacheWithTtl(locationCacheKey, HOME_CACHE_TTL_MS)
  if (cachedLocation?.label) {
    locationLabel.value = cachedLocation.label
  } else {
    try {
      const reverseUrl = new URL('https://nominatim.openstreetmap.org/reverse')
      reverseUrl.searchParams.set('format', 'jsonv2')
      reverseUrl.searchParams.set('lat', lat)
      reverseUrl.searchParams.set('lon', lon)
      reverseUrl.searchParams.set('zoom', '10')
      reverseUrl.searchParams.set('addressdetails', '1')
      const response = await fetch(reverseUrl)
      if (response.ok) {
        const payload = await response.json()
        const label = getLocationLabelFromPayload(payload)
        locationLabel.value = label
        writeCache(locationCacheKey, { label })
      }
    } catch {
      locationLabel.value = 'your area'
    }
  }

  try {
    await loadAirQualityByCoords({ lat, lon, cacheKey: airCacheKey })
  } catch (error) {
    airQualityError.value =
      error instanceof Error ? error.message : 'Unable to load local air quality.'
  } finally {
    airQualityLoading.value = false
  }
}

// Navigate to the suburb comparison page.
const handleCompare = () => {
  router.push({ name: 'compare' })
}

// Navigate to a specific suburb when a valid search is submitted.
const handleSearch = () => {
  if (!canSearch.value) {
    return
  }
  const normalized = suburb.value.trim().toLowerCase()
  const slug = normalized.replace(/\s+/g, '-')
  router.push({
    name: 'suburb',
    params: { suburb: slug },
    query: { state: selectedState.value },
  })
}

// Navigate to a suburb from the carousel selection.
const navigateToSuburb = (item) => {
  router.push({
    name: 'suburb',
    params: { suburb: item.slug },
    query: { state: item.state },
  })
}

onMounted(loadLocalAirQuality)
</script>
