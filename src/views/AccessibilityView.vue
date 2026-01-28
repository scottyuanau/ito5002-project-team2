<!-- src/views/AccessibilityView.vue -->
<template>
  <main class="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
    <section
      class="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm relative"
      aria-labelledby="accessibility-heading"
    >
      <!-- Close button back to home -->
      <RouterLink
        to="/"
        class="absolute right-4 top-4 rounded-full px-2.5 py-1 text-xl font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        aria-label="Back to home"
      >
        &times;
      </RouterLink>

      <p class="text-xs font-semibold tracking-[0.2em] text-emerald-600 uppercase mb-2">
        Accessibility
      </p>
      <h1
        id="accessibility-heading"
        class="text-2xl sm:text-3xl font-bold text-slate-900 mb-3"
      >
        Accessibility options
      </h1>
      <p class="text-sm text-slate-600 mb-4">
        AirScape is designed to support individuals and families, including people using screen
        readers, keyboard navigation, or with low vision. Use these options to make the site more
        comfortable for you.
      </p>

      <!-- Display options -->
      <h2 class="text-lg font-semibold text-slate-900 mt-4 mb-2">
        Display options
      </h2>

      <div class="space-y-3 mb-4">
        <!-- Larger text toggle -->
        <label class="flex items-center gap-3 text-sm text-slate-700">
          <input
            id="largeTextToggle"
            v-model="largeTextOn"
            type="checkbox"
            class="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          <span>Use larger text across the site</span>
        </label>

        <!-- High contrast toggle -->
        <label class="flex items-center gap-3 text-sm text-slate-700">
          <input
            id="highContrastToggle"
            v-model="highContrastOn"
            type="checkbox"
            class="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          <span>High contrast mode (stronger colours)</span>
        </label>

        <!-- Underline links toggle -->
        <label class="flex items-center gap-3 text-sm text-slate-700">
          <input
            id="underlineLinksToggle"
            v-model="underlineLinksOn"
            type="checkbox"
            class="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          <span>Always underline links</span>
        </label>
      </div>

      <p class="text-xs text-slate-500 mb-6">
        Tip: you can also zoom your browser
        (<kbd>Ctrl</kbd> + <kbd>+</kbd> / <kbd>-</kbd> or <kbd>Cmd</kbd> + <kbd>+</kbd> /
        <kbd>-</kbd> on Mac) to make everything larger.
      </p>

      <hr class="my-5 border-slate-200" />

      <!-- Info section -->
      <section class="space-y-3">
        <div>
          <h2 class="text-sm font-semibold text-slate-900">
            Keyboard & navigation
          </h2>
          <ul class="mt-1 list-disc pl-5 text-sm text-slate-600">
            <li>All main navigation links can be reached using the <kbd>Tab</kbd> key.</li>
            <li>Use <kbd>Shift</kbd> + <kbd>Tab</kbd> to move backwards through links.</li>
          </ul>
        </div>

        <div>
          <h2 class="text-sm font-semibold text-slate-900 mt-3">
            Need more help?
          </h2>
          <p class="mt-1 text-sm text-slate-600">
            If you have trouble using this site or need information in another format, please
            contact your local council or community health service.
          </p>
        </div>
      </section>
    </section>
  </main>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { RouterLink } from 'vue-router'

const STORAGE_KEY = 'airscape-accessibility-settings'

const largeTextOn = ref(false)
const highContrastOn = ref(false)
const underlineLinksOn = ref(false)

const toggleBodyClass = (className, enabled) => {
  const body = document.body
  if (!body) return
  if (enabled) {
    body.classList.add(className)
  } else {
    body.classList.remove(className)
  }
}

const applyAll = () => {
  toggleBodyClass('airscape-large-text', largeTextOn.value)
  toggleBodyClass('airscape-high-contrast', highContrastOn.value)
  toggleBodyClass('airscape-underline-links', underlineLinksOn.value)
}

const saveSettings = () => {
  const payload = {
    largeTextOn: largeTextOn.value,
    highContrastOn: highContrastOn.value,
    underlineLinksOn: underlineLinksOn.value,
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch (error) {
    console.warn('Could not save accessibility settings', error)
  }
}

onMounted(() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const saved = JSON.parse(raw)
      largeTextOn.value = !!saved.largeTextOn
      highContrastOn.value = !!saved.highContrastOn
      underlineLinksOn.value = !!saved.underlineLinksOn
    }
  } catch (error) {
    console.warn('Could not load accessibility settings', error)
  }

  applyAll()
})

watch(largeTextOn, (value) => {
  toggleBodyClass('airscape-large-text', value)
  saveSettings()
})

watch(highContrastOn, (value) => {
  toggleBodyClass('airscape-high-contrast', value)
  saveSettings()
})

watch(underlineLinksOn, (value) => {
  toggleBodyClass('airscape-underline-links', value)
  saveSettings()
})
</script>
