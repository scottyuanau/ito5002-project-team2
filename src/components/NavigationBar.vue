<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import Dialog from 'primevue/dialog'
import MegaMenu from 'primevue/megamenu'
import Pm25RecommendationsPanel from './Pm25RecommendationsPanel.vue'
import { db } from '../firebase'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const isUserMenuOpen = ref(false)
const notificationDialogVisible = ref(false)
const notificationsLoading = ref(false)
const notificationsError = ref('')
const notificationEntries = ref([])
const subscriptions = ref([])
const lastSentAt = ref(0)
const lastSeenAt = ref(0)
let closeMenuTimeoutId = null
let unsubscribeSubscriptions = null

const NOTIFICATION_LAST_SENT_KEY = 'notifications:lastSent'
const NOTIFICATION_LAST_SEEN_KEY = 'notifications:lastSeen'
const NOTIFICATION_CACHE_TTL_MS = 60 * 60 * 1000
const NOTIFICATION_AIR_CACHE_PREFIX = 'notificationAirQualityCache:v1:'

const hasSubscriptions = computed(() => subscriptions.value.length > 0)
const hasNewNotification = computed(
  () => hasSubscriptions.value && lastSentAt.value > lastSeenAt.value,
)
const notificationsDateLabel = computed(() =>
  new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }),
)

// updated menu items
const items = computed(() => [
  {
    label: 'Home',
    icon: 'pi pi-home',
    command: () => {
      if (route.path !== '/') {
        router.push('/')
      }
    },
  },
  {
    label: 'Compare',
    icon: 'pi pi-chart-bar',
    command: () => {
      if (route.path !== '/compare') {
        router.push('/compare')
      }
    },
  },
  // new Plant Tips menu item
  {
    label: 'Plant Tips',
    icon: 'pi pi-leaf',
    command: () => {
      if (route.path !== '/plant-tips') {
        router.push('/plant-tips')
      }
    },
  },
  {
    label: 'Contact',
    icon: 'pi pi-envelope',
    command: () => {
      if (route.path !== '/contact') {
        router.push('/contact')
      }
    },
  },
  ...(!authStore.isAuthenticated
    ? [
        {
          label: 'Login / Register',
          icon: 'pi pi-sign-in',
          command: () => {
            if (route.path !== '/login') {
              router.push('/login')
            }
          },
        },
      ]
    : []),
])

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

const writeCache = (cacheKey, data) => {
  const payload = JSON.stringify({ fetchedAt: Date.now(), data })
  localStorage.setItem(cacheKey, payload)
}

const getAirQualityUrl = () => import.meta.env.VITE_FIREBASE_FUNCTIONS_BASEURL || ''

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
  return {
    trendValues: values.filter((value) => Number.isFinite(value)),
    unit: unit || 'ug/m3',
    currentValue: extractCurrentPm25(payload),
  }
}

const refreshNotificationStatus = () => {
  lastSentAt.value = Number(localStorage.getItem(NOTIFICATION_LAST_SENT_KEY)) || 0
  lastSeenAt.value = Number(localStorage.getItem(NOTIFICATION_LAST_SEEN_KEY)) || 0
}

const ensureDailyNotification = () => {
  if (!hasSubscriptions.value) {
    return
  }
  const now = Date.now()
  const today = new Date(now).toISOString().slice(0, 10)
  const lastSent = Number(localStorage.getItem(NOTIFICATION_LAST_SENT_KEY)) || 0
  const lastSentDay = lastSent ? new Date(lastSent).toISOString().slice(0, 10) : ''
  if (lastSentDay !== today) {
    localStorage.setItem(NOTIFICATION_LAST_SENT_KEY, String(now))
  }
  refreshNotificationStatus()
}

const setupSubscriptionListener = () => {
  if (!db || !authStore.user?.uid) {
    subscriptions.value = []
    return
  }
  const subscriptionQuery = query(
    collection(db, 'lgaSubscriptions'),
    where('userId', '==', authStore.user.uid),
  )
  unsubscribeSubscriptions = onSnapshot(
    subscriptionQuery,
    (snapshot) => {
      subscriptions.value = snapshot.docs.map((docRef) => ({
        id: docRef.id,
        ...docRef.data(),
      }))
      ensureDailyNotification()
    },
    () => {
      subscriptions.value = []
    },
  )
}

const loadNotificationAirQuality = async () => {
  notificationsLoading.value = true
  notificationsError.value = ''
  notificationEntries.value = []

  if (!subscriptions.value.length) {
    notificationsLoading.value = false
    return
  }

  const airQualityUrl = getAirQualityUrl()
  if (!airQualityUrl) {
    notificationsError.value = 'Missing Firebase Functions base URL configuration.'
    notificationsLoading.value = false
    return
  }

  try {
    const results = await Promise.all(
      subscriptions.value.map(async (subscription) => {
        const suburbName = subscription.lgaName || 'Unknown suburb'
        const state = subscription.state || ''
        const cacheKey = `${NOTIFICATION_AIR_CACHE_PREFIX}${suburbName}|${state}`
        const cachedAirQuality = readCacheWithTtl(cacheKey, NOTIFICATION_CACHE_TTL_MS)
        if (cachedAirQuality) {
          const summary = applyAirQualityPayload(cachedAirQuality)
          return {
            id: subscription.id,
            suburbName,
            state,
            ...summary,
          }
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
          throw new Error(`Unable to load air quality for ${suburbName}.`)
        }
        const payload = await response.json()
        const data = payload.data || payload
        writeCache(cacheKey, data)
        const summary = applyAirQualityPayload(data)
        return {
          id: subscription.id,
          suburbName,
          state,
          ...summary,
        }
      }),
    )
    notificationEntries.value = results
  } catch (error) {
    notificationsError.value =
      error instanceof Error ? error.message : 'Unable to load notifications.'
  } finally {
    notificationsLoading.value = false
  }
}

const openNotifications = () => {
  if (!authStore.isAuthenticated) {
    return
  }
  notificationDialogVisible.value = true
  localStorage.setItem(NOTIFICATION_LAST_SEEN_KEY, String(Date.now()))
  refreshNotificationStatus()
  loadNotificationAirQuality()
}

const handleNotificationEvent = () => {
  refreshNotificationStatus()
  ensureDailyNotification()
}

const handleLogout = async () => {
  await authStore.logout()
  router.push('/login')
}

const openUserMenu = () => {
  if (closeMenuTimeoutId) {
    clearTimeout(closeMenuTimeoutId)
    closeMenuTimeoutId = null
  }
  isUserMenuOpen.value = true
}

const scheduleUserMenuClose = () => {
  if (closeMenuTimeoutId) {
    clearTimeout(closeMenuTimeoutId)
  }
  closeMenuTimeoutId = setTimeout(() => {
    isUserMenuOpen.value = false
    closeMenuTimeoutId = null
  }, 200)
}

onBeforeUnmount(() => {
  if (closeMenuTimeoutId) {
    clearTimeout(closeMenuTimeoutId)
  }
  if (unsubscribeSubscriptions) {
    unsubscribeSubscriptions()
  }
  window.removeEventListener('notifications:sent', handleNotificationEvent)
  window.removeEventListener('storage', handleNotificationEvent)
})

onMounted(() => {
  setupSubscriptionListener()
  refreshNotificationStatus()
  ensureDailyNotification()
  window.addEventListener('notifications:sent', handleNotificationEvent)
  window.addEventListener('storage', handleNotificationEvent)
})

watch(
  () => authStore.user?.uid,
  () => {
    if (unsubscribeSubscriptions) {
      unsubscribeSubscriptions()
    }
    subscriptions.value = []
    setupSubscriptionListener()
    refreshNotificationStatus()
    ensureDailyNotification()
  },
)
</script>

<template>
  <MegaMenu
    class="w-full rounded-full border border-black/10 bg-white/90 px-4 py-2 shadow-xl backdrop-blur"
    :model="items"
    :pt="{
      root: { class: 'w-full rounded-full border-none bg-transparent flex items-center gap-3' },
      start: { class: 'flex items-center' },
      rootList: { class: 'ml-auto flex items-center gap-2' },
      end: { class: 'flex items-center' },
      submenu: { class: 'rounded-2xl border border-black/10 bg-white shadow-lg' },
      item: { class: 'rounded-full' },
      action: {
        class:
          'rounded-full px-3 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-900/10',
      },
      icon: { class: 'text-sm' },
    }"
  >
    <template #start>
      <RouterLink
        to="/"
        class="flex items-center gap-2 px-3 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-900"
      >
        <img src="/logo.png" alt="AirScape logo" class="h-6 w-6" />
        <span>AirScape</span>
      </RouterLink>
    </template>

    <template #end>
      <div class="flex items-center gap-3">
        <!-- Accessibility pill (always visible) -->
        <RouterLink
          to="/accessibility"
          class="rounded-full border border-black/10 bg-white/70 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700 shadow-sm transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          Accessibility
        </RouterLink>

        <!-- Notifications and user menu (only if authenticated) -->
        <div v-if="authStore.isAuthenticated" class="relative flex items-center">
          <button
            type="button"
            class="relative mr-2 rounded-full border border-black/10 bg-white/70 p-2 text-slate-700 shadow-sm transition hover:bg-white cursor-pointer"
            aria-label="Open notifications"
            @click="openNotifications"
          >
            <i class="pi pi-bell text-sm"></i>
            <span
              v-if="hasNewNotification"
              class="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white"
            ></span>
          </button>

          <button
            type="button"
            class="rounded-full border border-black/10 bg-white/70 p-1 shadow-sm transition hover:bg-white cursor-pointer"
            aria-label="Open user menu"
            @mouseenter="openUserMenu"
            @mouseleave="scheduleUserMenuClose"
            @focusin="openUserMenu"
            @focusout="scheduleUserMenuClose"
          >
            <img src="/avatar.png" alt="User avatar" class="h-9 w-9 rounded-full object-cover" />
          </button>

          <div
            class="absolute right-0 top-full mt-2 w-44 rounded-2xl border border-black/10 bg-white p-2 text-sm text-slate-700 shadow-lg transition-opacity duration-150"
            :class="isUserMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'"
            @mouseenter="openUserMenu"
            @mouseleave="scheduleUserMenuClose"
            @focusin="openUserMenu"
            @focusout="scheduleUserMenuClose"
          >
            <RouterLink to="/dashboard" class="block rounded-lg px-3 py-2 hover:bg-slate-100">
              Dashboard
            </RouterLink>
            <button
              type="button"
              class="w-full rounded-lg px-3 py-2 text-left hover:bg-slate-100"
              @click="handleLogout"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </template>
  </MegaMenu>

  <Dialog
    v-model:visible="notificationDialogVisible"
    modal
    header="Daily suburb notifications"
    class="w-full max-w-5xl"
  >
    <div class="space-y-4">
      <h2 class="text-2xl font-semibold text-slate-900">
        Notifications for {{ notificationsDateLabel }}
      </h2>
      <p v-if="notificationsError" class="text-sm text-red-600">
        {{ notificationsError }}
      </p>
      <p v-else-if="notificationsLoading" class="text-sm text-slate-500">
        Loading subscribed suburb notifications...
      </p>
      <p v-else-if="!notificationEntries.length" class="text-sm text-slate-500">
        No subscribed suburbs yet.
      </p>
      <div v-else class="space-y-6">
        <div v-for="entry in notificationEntries" :key="entry.id" class="space-y-3">
          <h3 class="text-base font-semibold text-slate-900">{{ entry.suburbName }}</h3>
          <Pm25RecommendationsPanel
            layout="split"
            :title="`Today in ${entry.suburbName}`"
            :current-value="entry.currentValue"
            :trend-values="entry.trendValues"
            :unit="entry.unit"
          />
        </div>
      </div>
    </div>
  </Dialog>
</template>
