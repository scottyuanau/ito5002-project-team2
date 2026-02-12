<script setup>
import { useRouter } from 'vue-router'
import Button from 'primevue/button'

const router = useRouter()

const goHome = () => {
  router.push({ name: 'home' })
}

const sustainableTips = [
  {
    title: 'Avoid disposable items',
    description:
      'While disposable items like coffee cups, takeaway containers, plastic bottles and other single-use items are convenient, they create a large amount of waste which contributes to air pollution, especially through incineration. Disposable items are also resource-heavy to produce.',
    fact:
      'Approximately 40% of waste globally is burnt, which releases harmful particulate matter into the air.',
    action:
      'Replace disposable items with reusable versions, like takeaway coffee cups with a reusable mug and plastic straws with stainless-steel versions.',
  },
  {
    title: 'Reduce food waste',
    description:
      'Reducing food waste can improve air quality by decreasing emissions from landfill, transport and agriculture.',
    fact:
      'Australia wastes approximately 7.6 million tonnes of food each year, which is over 300kg per person.',
    action:
      'Check your fridge and pantry before shopping, buy seasonal produce, and use leftovers that can be frozen to last longer.',
  },
  {
    title: 'Buy products with less packaging',
    description:
      'Product packaging is a major contributor to plastic waste. Plastics can lead to air pollution during manufacturing and from incineration.',
    fact:
      'Only 9% of plastic waste globally is recycled. The rest is either burned or dumped.',
    action:
      'Choose plastic-free packaging where possible, like soap bars instead of bottled liquid soap, and pick less processed items with minimal packaging.',
  },
  {
    title: 'Recycle well',
    description:
      'Recycling helps beyond landfill reduction. It can reduce air and water pollution while conserving energy.',
    fact:
      'Recycling one tonne of paper can significantly reduce particulate matter and CO2 emissions.',
    action:
      'Learn local recycling rules from your council website, follow accepted-item lists, educate family and friends, and compost organic materials where possible.',
  },
  {
    title: 'Buy better and shop locally',
    description:
      'Spending habits can unintentionally support pollution, waste, habitat destruction, animal cruelty and unfair labor practices. Conscious purchasing can reduce this impact.',
    fact:
      '78% of consumers agree that environmental sustainability is important to them.',
    action:
      'Think before you buy, choose reusable multipurpose items, support sustainable and ethical brands, shop local, and consider second-hand options.',
  },
  {
    title: 'Be water conscious',
    description:
      'Reducing water use can improve air quality by lowering demand for water treatment, pumping and heating, which are energy-intensive.',
    fact:
      'Turning off the tap while brushing your teeth can save about 11,600L of water each year.',
    action:
      'Use low-flow fixtures, take shorter showers, drink tap water instead of bottled water, consider rainwater tanks, and choose water-efficient appliances.',
  },
  {
    title: 'Reduce energy use',
    description:
      'Lower energy use at home reduces utility costs and environmental harm by decreasing demand on power plants and lowering pollutant emissions.',
    fact:
      "Up to 3% of an average home's energy use is wasted on standby power from plugged-in devices and chargers.",
    action:
      'Switch to renewable energy providers when possible, replace older appliances with efficient models, unplug devices when not in use, use LED lighting, and explore solar panels.',
  },
  {
    title: 'Make informed transport decisions',
    description:
      'Changing transport choices can directly improve air quality by reducing pollutant and particulate emissions.',
    fact:
      'Using public transport instead of a private vehicle can produce 45% less carbon dioxide per passenger mile.',
    action:
      'Use public transport, walk or cycle when possible, work remotely if available, consider electric vehicles, and keep your car well-maintained for efficient operation.',
  },
]
</script>

<template>
  <main class="min-h-screen bg-slate-50 px-4 py-10 sm:px-8 lg:px-16">
    <section class="mx-auto max-w-5xl">
      <div class="mb-6">
        <Button
          label="← Back to Home"
          text
          severity="secondary"
          class="text-sm"
          @click="goHome"
        />
      </div>

      <!--  Center header + paragraph -->
      <header class="mb-8 text-center">
        <p class="text-xs font-semibold uppercase tracking-wide text-emerald-600">
          For individuals at home
        </p>
        <h1 class="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">
          Sustainable practices for cleaner air
        </h1>
        <p class="mt-3 max-w-3xl mx-auto text-slate-600">
          Our daily actions can have a bigger impact than you might think. Adopting sustainable
          practices at home is a great way to positively contribute to better air quality globally.
        </p>
      </header>

      <section class="grid gap-6 md:grid-cols-2">
        <article
          v-for="tip in sustainableTips"
          :key="tip.title"
          class="flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
        >
          <div>
            <h2 class="text-xl font-semibold text-slate-900">{{ tip.title }}</h2>
            <p class="mt-3 text-sm text-slate-700">{{ tip.description }}</p>
            <p class="mt-3 text-xs text-slate-500">
              <span class="font-semibold">Fact:</span> {{ tip.fact }}
            </p>
          </div>
          <p class="mt-4 text-xs text-slate-500">
            <span class="font-semibold">What can I do?</span> {{ tip.action }}
          </p>
        </article>
      </section>
    </section>
  </main>
</template>
