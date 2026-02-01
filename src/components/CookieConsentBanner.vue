<template>
  <div v-if="isVisible" class="fixed inset-0 z-30">
    <div class="absolute inset-0 bg-slate-900/40" aria-hidden="true"></div>
    <div
      class="absolute inset-x-0 bottom-0 min-h-[18vh] border-t border-slate-800 bg-slate-950 px-6 py-5 text-white shadow-2xl"
      role="dialog"
      aria-live="polite"
    >
      <div class="mx-auto flex h-full w-full max-w-6xl flex-col gap-4">
        <div class="sm:flex-1">
          <p class="text-xl font-semibold text-white sm:text-2xl">We use cookies.</p>
          <p class="mt-2 text-sm text-slate-100 sm:text-base">
            We use cookies and other tracking technologies to improve your browsing experience on
            our website, to show you personalized content and targeted ads, to analyze our website
            traffic, and to understand where our visitors are coming from.
          </p>
        </div>
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            class="cursor-pointer rounded-full border border-white/60 px-4 py-2 text-sm font-semibold text-white transition hover:border-white hover:bg-white/10"
            @click="handleConsent('declined')"
          >
            Decline
          </button>
          <button
            type="button"
            class="cursor-pointer rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
            @click="handleConsent('accepted')"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'

const CONSENT_STATUS_COOKIE = 'cookie_consent_status'
const CONSENT_DATE_COOKIE = 'cookie_consent_date'
const ONE_DAY_SECONDS = 60 * 60 * 24

const isVisible = ref(false)

// Format the local date as YYYY-MM-DD for daily resets.
const getLocalDateStamp = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Read a cookie value by name.
const readCookie = (name) => {
  const encodedName = encodeURIComponent(name)
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${encodedName.replace(/[-.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}=([^;]*)`),
  )
  return match ? decodeURIComponent(match[1]) : ''
}

// Write a simple cookie for daily consent tracking.
const writeCookie = (name, value) => {
  const encodedName = encodeURIComponent(name)
  const encodedValue = encodeURIComponent(value)
  const secureFlag = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${encodedName}=${encodedValue}; Max-Age=${ONE_DAY_SECONDS}; Path=/; SameSite=Lax${secureFlag}`
}

// Persist consent choice and hide the banner for the rest of the day.
const handleConsent = (status) => {
  const today = getLocalDateStamp()
  writeCookie(CONSENT_STATUS_COOKIE, status)
  writeCookie(CONSENT_DATE_COOKIE, today)
  isVisible.value = false
}

// Show banner once per local day when consent hasn't been captured.
const refreshVisibility = () => {
  const consentDate = readCookie(CONSENT_DATE_COOKIE)
  isVisible.value = consentDate !== getLocalDateStamp()
}

onMounted(() => {
  refreshVisibility()
})
</script>
