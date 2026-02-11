<template>
  <div class="home-page">
    <div class="home-content flex w-full flex-col gap-12 px-4 sm:px-6">
      <section class="glass-section mx-auto flex w-full max-w-5xl px-6">
        <div class="w-full text-left">
          <p class="text-sm font-medium text-slate-500">Welcome back</p>
          <h1 class="mt-1 text-3xl font-semibold text-slate-900">{{ greetingMessage }}</h1>
          <p class="mt-2 text-sm text-slate-600">Let&apos;s find out the air quality today.</p>
        </div>
      </section>

      <!-- Find a suburb -->
      <section
        class="glass-section suburb-search-section mx-auto flex w-full max-w-5xl flex-col items-center gap-6 self-start px-6"
      >
        <div class="space-y-2 text-center">
          <h2 class="text-3xl font-semibold text-slate-900">Find a suburb</h2>
          <p class="text-sm text-slate-500">Search Australian suburbs by name and state.</p>
        </div>
        <form class="flex w-full flex-col gap-3 sm:flex-row" @submit.prevent="handleSearch">
          <div class="grid w-full grid-cols-[minmax(0,1fr)_8.5rem] gap-3 sm:contents">
            <div class="relative w-full min-w-0">
              <InputText
                v-model="suburb"
                class="w-full min-w-0"
                placeholder="Enter suburb name"
                aria-label="Suburb name"
                aria-autocomplete="list"
                :aria-expanded="suburbSuggestionsOpen"
                :aria-controls="suburbSuggestionsOpen ? 'suburb-autocomplete-list' : undefined"
                @focus="handleSuburbFocus"
                @keydown.esc="closeSuburbSuggestions"
              />
              <div
                v-if="suburbSuggestionsOpen"
                id="suburb-autocomplete-list"
                class="absolute left-0 right-0 top-full z-30 mt-2 max-h-64 overflow-auto rounded-2xl border border-white/70 bg-white/90 p-2 text-left shadow-lg backdrop-blur"
                role="listbox"
                aria-label="Suburb suggestions"
              >
                <p v-if="suburbSuggestionsLoading" class="px-3 py-2 text-sm text-slate-500">
                  Searching suburbs...
                </p>
                <p v-else-if="suburbSuggestionsError" class="px-3 py-2 text-sm text-red-600">
                  {{ suburbSuggestionsError }}
                </p>
                <p
                  v-else-if="!suburbSuggestions.length"
                  class="px-3 py-2 text-sm text-slate-500"
                >
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
            </div>
            <Dropdown
              v-model="selectedState"
              :options="states"
              class="w-full sm:w-40"
              placeholder="State"
              aria-label="State"
            />
          </div>
          <Button type="submit" label="Search" class="w-full sm:w-auto" :disabled="!canSearch" />
        </form>
      </section>

      <!-- Today in your area -->
      <section class="glass-section mx-auto flex w-full max-w-5xl flex-col gap-6 px-6">
        <div class="space-y-2 text-center">
          <h2 class="text-3xl font-semibold text-slate-900">Today in {{ locationLabel }}</h2>
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
        <p v-if="airQualityNotice" class="text-sm text-amber-700">
          {{ airQualityNotice }}
        </p>
        <Pm25RecommendationsPanel
          v-if="!locationError && !airQualityError"
          class="w-full min-w-0"
          layout="split"
          :title="`Today in ${locationLabel}`"
          :current-value="pm25CurrentValue"
          :trend-values="pm25TrendValues"
          :unit="pm25Unit"
          :hourly-series="pm25HourlySeries"
          show-gauge-info
        />
        <div
          v-if="!locationError && !airQualityError"
          class="glass-surface space-y-3 rounded-2xl p-4"
        >
          <div>
            <p class="text-sm font-medium text-slate-900">Hourly trend (PM2.5)</p>
            <p class="text-xs text-slate-500">Last 12 hours and forecast for next 12 hours.</p>
          </div>
          <p v-if="pm25HourlyError" class="text-sm text-red-600">{{ pm25HourlyError }}</p>
          <p v-else-if="pm25HourlyLoading" class="text-sm text-slate-500">
            Loading hourly PM2.5 data...
          </p>
          <p v-if="pm25HourlyNotice" class="text-sm text-amber-700">{{ pm25HourlyNotice }}</p>
          <p
            v-if="!pm25HourlyLoading && !pm25HourlyError && !pm25HourlyChartData.labels.length"
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
      </section>

      <!-- My followed cities -->
      <section
        v-if="hasFollowedSuburbs"
        class="glass-section mx-auto flex w-full max-w-5xl flex-col gap-6 px-6"
      >
        <div class="space-y-2 text-center">
          <h2 class="text-3xl font-semibold text-slate-900">My followed cities</h2>
          <p class="text-sm text-slate-500">
            Quick air quality snapshots for suburbs you&apos;re subscribed to.
          </p>
        </div>
        <Carousel
          :value="followedSuburbs"
          :numVisible="3"
          :numScroll="1"
          :responsiveOptions="carouselBreakpoints"
          class="w-full"
        >
          <template #item="{ data }">
            <div
              class="glass-surface mx-3 flex h-full cursor-pointer flex-col gap-3 rounded-2xl p-6 transition hover:-translate-y-1 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
              role="button"
              tabindex="0"
              @click="navigateToFollowedSuburb(data)"
              @keydown.enter="navigateToFollowedSuburb(data)"
            >
              <span class="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-500">
                {{ data.state || 'Subscribed' }}
              </span>
              <div class="space-y-1">
                <h3 class="text-xl font-semibold text-slate-900">{{ data.title }}</h3>
                <p class="text-sm text-slate-500">{{ data.subtitle }}</p>
              </div>
              <div class="flex justify-center">
                <Pm25MiniGauge :current-value="getFollowedSuburbPm25Value(data)" unit="ug/m3" />
              </div>
              <span class="text-sm font-semibold text-emerald-600">
                Open suburb
                <i class="pi pi-arrow-right ml-1 text-xs"></i>
              </span>
            </div>
          </template>
        </Carousel>
      </section>

      <!-- Daily air-friendly habit card -->
      <section class="glass-section mx-auto flex w-full max-w-5xl px-6">
        <div class="glass-surface w-full rounded-2xl p-6 text-left">
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

      <!-- Popular cities -->
      <section class="glass-section mx-auto flex w-full max-w-5xl flex-col gap-6 px-6">
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
              class="glass-surface mx-3 flex h-full cursor-pointer flex-col gap-3 rounded-2xl p-6 transition hover:-translate-y-1 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
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
              <div class="flex justify-center">
                <Pm25MiniGauge :current-value="getPopularSuburbPm25Value(data)" unit="ug/m3" />
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
    <button
      v-if="showScrollCue"
      type="button"
      class="scroll-cue"
      aria-label="Scroll for more information"
      @click="scrollToNextSection"
    >
      <span>Scroll for more</span>
      <i class="pi pi-angle-down text-xs"></i>
    </button>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import Button from 'primevue/button'
import Carousel from 'primevue/carousel'
import Chart from 'primevue/chart'
import Dropdown from 'primevue/dropdown'
import InputText from 'primevue/inputtext'
import Pm25MiniGauge from '../components/Pm25MiniGauge.vue'
import Pm25RecommendationsPanel from '../components/Pm25RecommendationsPanel.vue'
import { db } from '../firebase'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const suburb = ref('')
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
const locationState = ref('')
const locationLoading = ref(false)
const locationError = ref('')
const airQualityLoading = ref(false)
const airQualityError = ref('')
const airQualityNotice = ref('')
const pm25CurrentValue = ref(null)
const pm25TrendValues = ref([])
const pm25Unit = ref('ug/m3')
const pm25HourlyLoading = ref(false)
const pm25HourlyError = ref('')
const pm25HourlyNotice = ref('')
const pm25HourlySeries = ref({
  labels: [],
  timestamps: [],
  historical: [],
  forecast: [],
  unit: 'ug/m3',
})
const showScrollCue = ref(true)
const popularSuburbPm25 = ref({})
const followedSuburbs = ref([])
const followedSuburbPm25 = ref({})
let unsubscribeFollowedSuburbs = null
let followedSuburbCacheKey = ''

const HOME_CACHE_TTL_MS = 60 * 60 * 1000
const HOME_CACHE_STALE_MS = 24 * 60 * 60 * 1000
const HOME_AIR_CACHE_PREFIX = 'homeAirQualityCache:v1:'
const HOME_LOCATION_CACHE_PREFIX = 'homeLocationCache:v1:'
const HOME_PM25_HOURLY_CACHE_PREFIX = 'homePm25HourlyCache:v1:'
const HOME_POPULAR_PM25_CACHE_PREFIX = 'homePopularPm25Cache:v1:'
const HOME_FOLLOWED_SUBURBS_CACHE_PREFIX = 'homeFollowedSuburbs:v1:'
const SUBURB_AUTOCOMPLETE_CACHE_PREFIX = 'geoapify:suburbAutocomplete:v1:'
const SUBURB_AUTOCOMPLETE_MIN_CHARS = 2
const SUBURB_AUTOCOMPLETE_LIMIT = 8
const HOME_FOLLOWED_SUBURBS_CACHE_TTL_MS = 24 * 60 * 60 * 1000
const AU_STATE_NAME_TO_CODE = {
  'new south wales': 'NSW',
  victoria: 'VIC',
  queensland: 'QLD',
  'western australia': 'WA',
  'south australia': 'SA',
  tasmania: 'TAS',
  'australian capital territory': 'ACT',
  'northern territory': 'NT',
}

const greetingName = computed(() => {
  const raw = (authStore.displayName || '').trim()
  if (!raw) {
    return ''
  }
  return raw
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
})

const greetingTimeOfDay = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) {
    return 'morning'
  }
  if (hour < 18) {
    return 'afternoon'
  }
  return 'evening'
})

const greetingMessage = computed(() =>
  greetingName.value
    ? `Good ${greetingTimeOfDay.value}, ${greetingName.value}!`
    : `Good ${greetingTimeOfDay.value}!`,
)

const hasFollowedSuburbs = computed(() => followedSuburbs.value.length > 0)

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
    localStorage.removeItem(cacheKey)
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

// Persist a payload with a timestamp so we can expire it later.
const writeCache = (cacheKey, data) => {
  const payload = JSON.stringify({ fetchedAt: Date.now(), data })
  try {
    localStorage.setItem(cacheKey, payload)
  } catch {
    // Some browsers (Safari private mode) throw QuotaExceededError; skip caching.
  }
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

const normalizeStateSelection = (item) => {
  const code = typeof item?.state_code === 'string' ? item.state_code.trim().toUpperCase() : ''
  if (code && states.includes(code)) {
    return code
  }
  const name = typeof item?.state === 'string' ? item.state.trim().toLowerCase() : ''
  return AU_STATE_NAME_TO_CODE[name] || ''
}

const closeSuburbSuggestions = () => {
  suburbSuggestionsOpen.value = false
}

const openSuburbSuggestions = () => {
  suburbSuggestionsOpen.value = true
}

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
  if (suburb.value.trim().length >= SUBURB_AUTOCOMPLETE_MIN_CHARS) {
    openSuburbSuggestions()
  }
}

const selectSuburbSuggestion = (item) => {
  const normalizedState = normalizeStateSelection(item)
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
    suburb.value = label
  }
  if (normalizedState) {
    selectedState.value = normalizedState
  }
  closeSuburbSuggestions()
  setTimeout(() => {
    suppressAutocomplete.value = false
  }, 0)
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

// Extract a readable location label from reverse-geocode payload, preferring suburb-scale fields.
const getLocationLabelFromPayload = (payload) => {
  const address = payload?.address || {}
  return (
    address.neighbourhood ||
    address.residential ||
    address.suburb_district ||
    address.suburb ||
    address.locality ||
    address.hamlet ||
    address.city ||
    address.town ||
    address.village ||
    address.county ||
    address.state ||
    'your area'
  )
}

// Normalize a state value into a known Australian state code.
const normalizeStateCode = (value) => {
  if (typeof value !== 'string') {
    return ''
  }
  const normalized = value.trim()
  if (!normalized) {
    return ''
  }
  const upper = normalized.toUpperCase()
  if (states.includes(upper)) {
    return upper
  }
  return AU_STATE_NAME_TO_CODE[normalized.toLowerCase()] || ''
}

// Extract an Australian state code from reverse-geocode payload details.
const getLocationStateFromPayload = (payload) => {
  const address = payload?.address || {}
  return normalizeStateCode(address.state_code || address.state || '')
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

// Build a PM2.5 series split into last 12 historical hours and next 12 forecast hours.
const buildPm25HourlySeries = (payload) => {
  const fallback = { labels: [], timestamps: [], historical: [], forecast: [], unit: 'ug/m3' }
  const hourly = payload?.hourly || {}
  const hourlyUnits = payload?.hourly_units || {}
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
  const labels = combinedEntries.map((entry) =>
    new Date(entry.timeValue).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  )

  return {
    labels,
    timestamps: combinedEntries.map((entry) => entry.timeValue),
    historical: combinedEntries.map((entry, index) =>
      index < historicalEntries.length ? entry.value : null,
    ),
    forecast: combinedEntries.map((entry, index) =>
      index >= historicalEntries.length ? entry.value : null,
    ),
    unit: hourlyUnits.pm2_5 || 'ug/m3',
  }
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

const getPopularSuburbKey = (item) => `${item.slug}|${item.state}`

const getPopularSuburbPm25Value = (item) => {
  const value = popularSuburbPm25.value[getPopularSuburbKey(item)]
  return Number.isFinite(value) ? Number(value.toFixed(2)) : null
}

// Build a stable slug from a suburb or LGA name.
const normalizeSuburbSlug = (value) => value.trim().toLowerCase().replace(/\s+/g, '-')

// Build the localStorage cache key for a user's followed suburbs.
const getFollowedSuburbCacheKey = (userId) => `${HOME_FOLLOWED_SUBURBS_CACHE_PREFIX}${userId}`

// Transform Firestore subscription docs into display-ready cards.
const mapFollowedSuburbItems = (items) =>
  items.map((item) => {
    const title = item.lgaName || 'Unknown suburb'
    const state = (item.state || '').toUpperCase()
    const slug = item.lgaSlug || normalizeSuburbSlug(title)
    return {
      id: item.id,
      title,
      subtitle: state ? `${title}, ${state}` : title,
      slug,
      state,
    }
  })

// Get a lookup key for followed suburb cards.
const getFollowedSuburbKey = (item) => `${item.slug}|${item.state}`

// Get a formatted PM2.5 value for followed suburb cards.
const getFollowedSuburbPm25Value = (item) => {
  const value = followedSuburbPm25.value[getFollowedSuburbKey(item)]
  return Number.isFinite(value) ? Number(value.toFixed(2)) : null
}

// Resolve PM2.5 readings for followed suburb cards with caching.
const loadFollowedSuburbPm25 = async () => {
  if (!followedSuburbs.value.length) {
    followedSuburbPm25.value = {}
    return
  }
  const entries = await Promise.all(
    followedSuburbs.value.map(async (item) => {
      const cacheKey = `${HOME_POPULAR_PM25_CACHE_PREFIX}followed:${item.slug}|${item.state}`
      try {
        const value = await fetchPopularSuburbPm25({
          suburbName: item.title,
          state: item.state,
          cacheKey,
        })
        return [getFollowedSuburbKey(item), value]
      } catch {
        return [getFollowedSuburbKey(item), null]
      }
    }),
  )

  followedSuburbPm25.value = entries.reduce((acc, [key, value]) => {
    acc[key] = value
    return acc
  }, {})
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

const loadAirQualityByCoords = async ({ lat, lon, cacheKey }) => {
  const cachedAirQuality = readCacheWithTtl(cacheKey, HOME_CACHE_TTL_MS)
  if (cachedAirQuality) {
    applyAirQualityPayload(cachedAirQuality)
    return
  }
  const staleCache = readCacheEntry(cacheKey)

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
    const message = await getApiErrorMessage(response, 'Failed to fetch local air quality data.')
    if (staleCache?.data && Date.now() - staleCache.fetchedAt <= HOME_CACHE_STALE_MS) {
      applyAirQualityPayload(staleCache.data)
      airQualityNotice.value = buildStaleNotice(staleCache.fetchedAt)
      return
    }
    throw new Error(message)
  }
  const payload = await response.json()
  const data = payload.data || payload
  writeCache(cacheKey, data)
  applyAirQualityPayload(data)
}

const loadPm25HourlyByCoords = async ({ lat, lon, cacheKey }) => {
  pm25HourlyError.value = ''
  pm25HourlyNotice.value = ''

  const cachedHourly = readCacheWithTtl(cacheKey, HOME_CACHE_TTL_MS)
  if (cachedHourly) {
    pm25HourlySeries.value = cachedHourly
    return
  }
  const staleCache = readCacheEntry(cacheKey)

  pm25HourlyLoading.value = true
  try {
    const hourlyUrl = new URL('https://air-quality-api.open-meteo.com/v1/air-quality')
    hourlyUrl.searchParams.set('latitude', lat.toString())
    hourlyUrl.searchParams.set('longitude', lon.toString())
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
  } catch (error) {
    if (staleCache?.data && Date.now() - staleCache.fetchedAt <= HOME_CACHE_STALE_MS) {
      pm25HourlySeries.value = staleCache.data
      pm25HourlyNotice.value = buildStaleNotice(staleCache.fetchedAt)
    } else {
      pm25HourlySeries.value = {
        labels: [],
        timestamps: [],
        historical: [],
        forecast: [],
        unit: 'ug/m3',
      }
      pm25HourlyError.value = error instanceof Error ? error.message : 'Unexpected error.'
    }
  } finally {
    pm25HourlyLoading.value = false
  }
}

const loadAirQualityBySuburb = async ({ suburbName, state, cacheKey }) => {
  const cachedAirQuality = readCacheWithTtl(cacheKey, HOME_CACHE_TTL_MS)
  if (cachedAirQuality) {
    applyAirQualityPayload(cachedAirQuality)
    return
  }
  const staleCache = readCacheEntry(cacheKey)

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
    const message = await getApiErrorMessage(response, 'Failed to fetch local air quality data.')
    if (staleCache?.data && Date.now() - staleCache.fetchedAt <= HOME_CACHE_STALE_MS) {
      applyAirQualityPayload(staleCache.data)
      airQualityNotice.value = buildStaleNotice(staleCache.fetchedAt)
      return
    }
    throw new Error(message)
  }
  const payload = await response.json()
  const data = payload.data || payload
  writeCache(cacheKey, data)
  applyAirQualityPayload(data)
}

// Fetch a city-level PM2.5 value for the popular-cities cards with cache fallback.
const fetchPopularSuburbPm25 = async ({ suburbName, state, cacheKey }) => {
  const cachedAirQuality = readCacheWithTtl(cacheKey, HOME_CACHE_TTL_MS)
  if (cachedAirQuality) {
    return extractCurrentPm25(cachedAirQuality)
  }
  const staleCache = readCacheEntry(cacheKey)
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
    if (staleCache?.data && Date.now() - staleCache.fetchedAt <= HOME_CACHE_STALE_MS) {
      return extractCurrentPm25(staleCache.data)
    }
    const message = await getApiErrorMessage(response, `Failed to fetch PM2.5 data for ${suburbName}.`)
    throw new Error(message)
  }
  const payload = await response.json()
  const data = payload.data || payload
  writeCache(cacheKey, data)
  return extractCurrentPm25(data)
}

// Load PM2.5 values for all popular city cards shown on the home carousel.
const loadPopularSuburbPm25 = async () => {
  const entries = await Promise.all(
    popularSuburbs.map(async (item) => {
      const cacheKey = `${HOME_POPULAR_PM25_CACHE_PREFIX}${item.slug}|${item.state}`
      try {
        const value = await fetchPopularSuburbPm25({
          suburbName: item.title,
          state: item.state,
          cacheKey,
        })
        return [getPopularSuburbKey(item), value]
      } catch {
        return [getPopularSuburbKey(item), null]
      }
    }),
  )

  popularSuburbPm25.value = entries.reduce((acc, [key, value]) => {
    acc[key] = value
    return acc
  }, {})
}

// Clear the cached followed suburbs for the current user.
const clearFollowedSuburbCache = (cacheKey) => {
  try {
    localStorage.removeItem(cacheKey)
  } catch {
    // Ignore storage failures in restricted browser modes.
  }
}

// Listen for updates to the authenticated user's followed suburbs.
const setupFollowedSuburbListener = () => {
  if (!db || !authStore.user?.uid) {
    followedSuburbs.value = []
    followedSuburbPm25.value = {}
    return
  }

  const cacheKey = getFollowedSuburbCacheKey(authStore.user.uid)
  followedSuburbCacheKey = cacheKey
  const cached = readCacheWithTtl(cacheKey, HOME_FOLLOWED_SUBURBS_CACHE_TTL_MS)
  if (cached) {
    followedSuburbs.value = cached
    loadFollowedSuburbPm25()
  }

  const subscriptionQuery = query(
    collection(db, 'lgaSubscriptions'),
    where('userId', '==', authStore.user.uid),
  )
  unsubscribeFollowedSuburbs = onSnapshot(
    subscriptionQuery,
    (snapshot) => {
      const items = snapshot.docs.map((docRef) => ({ id: docRef.id, ...docRef.data() }))
      const mapped = mapFollowedSuburbItems(items)
      followedSuburbs.value = mapped
      clearFollowedSuburbCache(cacheKey)
      writeCache(cacheKey, mapped)
      loadFollowedSuburbPm25()
    },
    (err) => {
      console.error(err?.message ?? 'Unable to load followed suburbs.')
    },
  )
}

// Reset and rebuild the followed suburbs listener when auth changes.
const refreshFollowedSuburbListener = () => {
  if (unsubscribeFollowedSuburbs) {
    unsubscribeFollowedSuburbs()
    unsubscribeFollowedSuburbs = null
  }
  if (followedSuburbCacheKey) {
    clearFollowedSuburbCache(followedSuburbCacheKey)
    followedSuburbCacheKey = ''
  }
  followedSuburbs.value = []
  followedSuburbPm25.value = {}
  setupFollowedSuburbListener()
}

const loadLocalAirQuality = async () => {
  locationError.value = ''
  airQualityError.value = ''
  airQualityNotice.value = ''
  locationState.value = ''
  locationLoading.value = true
  airQualityLoading.value = true

  let position
  try {
    position = await getCurrentPosition()
  } catch {
    locationLabel.value = 'Sydney'
    locationState.value = 'NSW'
    locationLoading.value = false
    try {
      const fallbackLat = -33.869
      const fallbackLon = 151.209
      await loadAirQualityBySuburb({
        suburbName: 'Sydney',
        state: 'NSW',
        cacheKey: `${HOME_AIR_CACHE_PREFIX}sydney|NSW`,
      })
      await loadPm25HourlyByCoords({
        lat: fallbackLat,
        lon: fallbackLon,
        cacheKey: `${HOME_PM25_HOURLY_CACHE_PREFIX}${fallbackLat}|${fallbackLon}`,
      })
    } catch (fallbackError) {
      airQualityError.value =
        fallbackError instanceof Error ? fallbackError.message : 'Unable to load local air quality.'
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
  const hourlyCacheKey = `${HOME_PM25_HOURLY_CACHE_PREFIX}${lat}|${lon}`

  const cachedLocation = readCacheWithTtl(locationCacheKey, HOME_CACHE_TTL_MS)
  if (cachedLocation?.label) {
    locationLabel.value = cachedLocation.label
    locationState.value = normalizeStateCode(cachedLocation.state || '')
  } else {
    try {
      const reverseUrl = new URL('https://nominatim.openstreetmap.org/reverse')
      reverseUrl.searchParams.set('format', 'jsonv2')
      reverseUrl.searchParams.set('lat', lat)
      reverseUrl.searchParams.set('lon', lon)
      reverseUrl.searchParams.set('zoom', '18')
      reverseUrl.searchParams.set('addressdetails', '1')
      const response = await fetch(reverseUrl)
      if (response.ok) {
        const payload = await response.json()
        const label = getLocationLabelFromPayload(payload)
        const state = getLocationStateFromPayload(payload)
        locationLabel.value = label
        locationState.value = state
        writeCache(locationCacheKey, { label, state })
      }
    } catch {
      locationLabel.value = 'your area'
      locationState.value = ''
    }
  }

  try {
    await loadAirQualityByCoords({ lat, lon, cacheKey: airCacheKey })
    await loadPm25HourlyByCoords({ lat, lon, cacheKey: hourlyCacheKey })
  } catch (error) {
    airQualityError.value =
      error instanceof Error ? error.message : 'Unable to load local air quality.'
  } finally {
    airQualityLoading.value = false
  }
}

// Navigate to a specific suburb when a valid search is submitted.
const handleSearch = () => {
  if (!canSearch.value) {
    return
  }
  closeSuburbSuggestions()
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

// Navigate to a followed suburb card selection.
const navigateToFollowedSuburb = (item) => {
  const query = item.state ? { state: item.state } : {}
  router.push({
    name: 'suburb',
    params: { suburb: item.slug },
    query,
  })
}

// Jump to the next section and hide the initial scroll cue.
const scrollToNextSection = () => {
  const nextSection = document.querySelector('.home-content section:nth-of-type(2)')
  if (nextSection) {
    nextSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
  } else {
    window.scrollTo({ top: window.innerHeight * 0.8, behavior: 'smooth' })
  }
  showScrollCue.value = false
}

// Hide the scroll cue as soon as the user starts scrolling.
const handleInitialScroll = () => {
  if (window.scrollY > 24) {
    showScrollCue.value = false
  }
}

onMounted(() => {
  loadLocalAirQuality()
  loadPopularSuburbPm25()
  refreshFollowedSuburbListener()
  window.addEventListener('scroll', handleInitialScroll, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', handleInitialScroll)
  if (autocompleteTimer.value) {
    clearTimeout(autocompleteTimer.value)
  }
  if (autocompleteAbortController.value) {
    autocompleteAbortController.value.abort()
  }
  if (unsubscribeFollowedSuburbs) {
    unsubscribeFollowedSuburbs()
  }
})

watch(
  suburb,
  (value) => {
    if (suppressAutocomplete.value) {
      return
    }
    scheduleSuburbAutocomplete(value)
  },
  { flush: 'post' },
)

watch(
  () => authStore.user?.uid,
  () => {
    refreshFollowedSuburbListener()
  },
)
</script>

<style scoped>
.home-page {
  position: relative;
  isolation: isolate;
  width: 100%;
  min-height: 100%;
  padding: 1.5rem 0 2.5rem;
}

.home-page::before {
  content: '';
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background-image: url('/bg.jpg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.home-page::after {
  content: '';
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background: linear-gradient(
    180deg,
    rgb(248 250 252 / 38%) 0%,
    rgb(226 232 240 / 48%) 55%,
    rgb(241 245 249 / 58%) 100%
  );
}

.home-content {
  position: relative;
  z-index: 1;
}

.glass-section {
  border: 1px solid rgb(255 255 255 / 55%);
  border-radius: 1.5rem;
  padding-top: 1.5rem;
  padding-bottom: 1.5rem;
  background: rgb(255 255 255 / 22%);
  box-shadow: 0 18px 38px rgb(15 23 42 / 18%);
  backdrop-filter: blur(14px) saturate(130%);
  -webkit-backdrop-filter: blur(14px) saturate(130%);
}

.glass-surface {
  border: 1px solid rgb(255 255 255 / 65%);
  background: rgb(255 255 255 / 28%);
  box-shadow: 0 14px 28px rgb(15 23 42 / 14%);
  backdrop-filter: blur(10px) saturate(120%);
  -webkit-backdrop-filter: blur(10px) saturate(120%);
}

.suburb-search-section {
  position: relative;
  z-index: 3;
  overflow: visible;
}

.scroll-cue {
  position: fixed;
  left: 50%;
  bottom: 1rem;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  transform: translateX(-50%);
  border: 1px solid rgb(255 255 255 / 75%);
  border-radius: 999px;
  background: rgb(15 23 42 / 68%);
  color: rgb(255 255 255 / 96%);
  font-size: 0.75rem;
  letter-spacing: 0.05em;
  padding: 0.5rem 0.75rem;
  box-shadow: 0 8px 20px rgb(15 23 42 / 28%);
  animation: scroll-cue-bounce 1.8s ease-in-out infinite;
}

@keyframes scroll-cue-bounce {
  0%,
  100% {
    transform: translateX(-50%) translateY(0);
  }
  50% {
    transform: translateX(-50%) translateY(4px);
  }
}
</style>
