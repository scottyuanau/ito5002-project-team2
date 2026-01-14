import './assets/main.css'
import 'primeicons/primeicons.css'

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

app.mount('#app')
