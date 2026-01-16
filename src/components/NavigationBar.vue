<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MegaMenu from 'primevue/megamenu'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const isUserMenuOpen = ref(false)
let closeMenuTimeoutId = null

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
    label: 'About',
    icon: 'pi pi-info-circle',
    command: () => {
      if (route.path !== '/about') {
        router.push('/about')
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

// Handle user logout from the avatar menu.
const handleLogout = async () => {
  await authStore.logout()
  router.push('/login')
}

// Keep the menu open briefly after mouse leaves to allow clicking.
const openUserMenu = () => {
  if (closeMenuTimeoutId) {
    clearTimeout(closeMenuTimeoutId)
    closeMenuTimeoutId = null
  }
  isUserMenuOpen.value = true
}

// Delay closing to avoid flicker when moving from avatar to menu.
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
})
</script>

<template>
  <MegaMenu
    class="w-full rounded-full border border-black/10 bg-white/90 px-4 py-2 shadow-xl backdrop-blur"
    :model="items"
    :pt="{
      root: {
        class: 'w-full rounded-full border-none bg-transparent flex items-center gap-3',
      },
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
      <div v-if="authStore.isAuthenticated" class="relative flex items-center">
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
          :class="
            isUserMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          "
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
    </template>
  </MegaMenu>
</template>
