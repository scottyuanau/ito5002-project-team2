<template>
  <div class="flex w-full flex-col gap-20">
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
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import Carousel from 'primevue/carousel'
import Dropdown from 'primevue/dropdown'
import InputText from 'primevue/inputtext'

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
</script>
