import './assets/main.css'
import 'primeicons/primeicons.css'
import 'mapbox-gl/dist/mapbox-gl.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import { definePreset } from '@primevue/themes'
import Aura from '@primevue/themes/aura'
import { useAuthStore } from './stores/auth'

import App from './App.vue'
import router from './router'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)
const primePreset = definePreset(Aura, {})

app.use(PrimeVue, {
  theme: {
    preset: primePreset,
  },
})

const authStore = useAuthStore(pinia)
authStore.init()

// Wait for Firebase auth to finish initializing before enforcing protected routes.
const waitForAuthReady = () =>
  new Promise((resolve) => {
    if (authStore.ready) {
      resolve()
      return
    }
    const unsubscribe = authStore.$subscribe((_, state) => {
      if (state.ready) {
        unsubscribe()
        resolve()
      }
    })
  })

router.beforeEach(async (to) => {
  if (!to.meta?.requiresAuth) {
    return true
  }
  // Ensure auth state is resolved before checking access.
  await waitForAuthReady()
  if (!authStore.isAuthenticated) {
    return { name: 'login' }
  }
  return true
})

app.mount('#app')
