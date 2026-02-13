<script setup>
import { useRouter } from 'vue-router'
import Button from 'primevue/button'

const router = useRouter()

const goHome = () => {
  router.push({ name: 'home' })
}


const plantTips = [
  {
    name: 'Snake Plant',
    nickname: 'Sansevieria / Mother-in-law’s Tongue',
    image: '/Plants_Air_Scape/Snake_Plant.jpg',
    imageAlt: 'Snake Plant (Sansevieria)',
    benefit:
      'Tolerates low light and irregular watering, good for bedrooms and small apartments.',
    bestFor:
      'Busy people who want a tough plant that can help reduce stuffy, stale-feeling air.',
    care:
      'Let soil dry out completely between watering (every 2–3 weeks). Avoid overwatering.',
    difficulty: 'Easy',
  },
  {
    name: 'Spider Plant',
    image: '/Plants_Air_Scape/Spider_Plant.jpg',
    imageAlt: 'Spider Plant',
    benefit:
      'Great starter plant that can help trap dust and improve the feel of stuffy corners.',
    bestFor: 'Desks, shelves and hanging pots in bright rooms without direct harsh sun.',
    care:
      'Water when the top 2–3cm of soil is dry. Trim brown tips and repot when crowded.',
    difficulty: 'Easy',
  },
  {
    name: 'Peace Lily',
    image: '/Plants_Air_Scape/Peace_Lily_Plant.jpg',
    imageAlt: 'Peace Lily',
    benefit:
      'Can add a bit of humidity and help reduce some indoor pollutants when combined with good ventilation.',
    bestFor:
      'Living rooms or bedrooms with indirect light where the air feels dry or stale.',
    care:
      'Keep soil lightly moist, not soggy. Drooping leaves usually mean it needs water.',
    difficulty: 'Medium',
  },
  {
    name: 'Areca Palm',
    image: '/Plants_Air_Scape/Areca_Palm_Plant.jpg',
    imageAlt: 'Areca Palm',
    benefit: 'Acts like a gentle natural humidifier and can catch dust on its fronds.',
    bestFor: 'Corners of living rooms, near windows with bright but filtered light.',
    care:
      'Water when the top of the soil is dry. Mist leaves occasionally and avoid cold drafts.',
    difficulty: 'Medium',
  },
  {
    name: 'Pothos (Devil’s Ivy)',
    image: '/Plants_Air_Scape/Pothos_Plant.jpg',
    imageAlt: 'Pothos (Devil’s Ivy)',
    benefit:
      'Fast-growing vine that can soften harsh indoor spaces and help trap particles on its leaves.',
    bestFor:
      'Bookshelves, hanging planters, or trailing along furniture in low to medium light.',
    care: 'Water when top of soil dries. Very forgiving if you forget sometimes.',
    difficulty: 'Easy',
  },
  {
    name: 'Aloe Vera',
    image: '/Plants_Air_Scape/Aloe_Vera_Plant.jpg',
    imageAlt: 'Aloe Vera',
    benefit:
      'Succulent that needs little water and also offers soothing gel for minor skin irritation.',
    bestFor: 'Sunny windowsills, kitchens or bathrooms with bright light.',
    care: 'Use a cactus/succulent mix and water deeply but rarely (every 3–4 weeks).',
    difficulty: 'Easy',
  },
]
</script>

<template>
  <main class="min-h-screen bg-slate-50 py-10 px-4 sm:px-8 lg:px-16">
    <section class="max-w-5xl mx-auto">
      <!-- Back button -->
      <div class="mb-6">
        <Button
          label="← Back to Home"
          text
          severity="secondary"
          class="text-sm"
          @click="goHome"
        />
      </div>

      <!-- ✅ Centered Header -->
      <header class="mb-8 text-center">
        <p class="text-xs font-semibold tracking-wide text-emerald-600 uppercase">
          For individuals at home
        </p>

        <h1 class="mt-2 text-3xl sm:text-4xl font-bold text-slate-900">
          Indoor plants that support healthier air at home
        </h1>

        <!-- ✅ Centered paragraph + centered max width -->
        <p class="mt-3 text-slate-600 max-w-3xl mx-auto">
          These low-maintenance plants won’t “fix” pollution on their own, but they can help
          reduce dust, improve humidity and remind you to make more air-friendly choices.
        </p>
      </header>

      <!-- Plant cards -->
      <section class="grid gap-6 md:grid-cols-2">
        <article
          v-for="plant in plantTips"
          :key="plant.name"
          class="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex flex-col justify-between"
        >
          <div>
            <h2 class="text-xl font-semibold text-slate-900">
              {{ plant.name }}
            </h2>

            <!-- ✅ Image under the title -->
            <img
              v-if="plant.image"
              :src="plant.image"
              :alt="plant.imageAlt || plant.name"
              class="mt-3 h-24 w-full rounded-xl object-cover"
              loading="lazy"
            />

            <p
              v-if="plant.nickname"
              class="mt-3 text-xs font-medium text-slate-500 uppercase tracking-wide"
            >
              {{ plant.nickname }}
            </p>

            <div class="mt-3 flex items-center gap-2">
              <span
                class="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800"
              >
                Difficulty: {{ plant.difficulty }}
              </span>
            </div>

            <p class="mt-3 text-sm text-slate-700">
              {{ plant.benefit }}
            </p>

            <p class="mt-2 text-xs text-slate-500">
              <span class="font-semibold">Best for:</span> {{ plant.bestFor }}
            </p>
          </div>

          <p class="mt-4 text-xs text-slate-500">
            <span class="font-semibold">Care tips:</span> {{ plant.care }}
          </p>
        </article>
      </section>

      <!-- Disclaimer -->
      <section class="mt-10 bg-slate-900 text-slate-50 rounded-2xl p-6">
        <h2 class="text-lg font-semibold">
          A realistic note on plants and air quality
        </h2>
        <p class="mt-2 text-sm">
          Plants can support comfort and wellbeing but are not a replacement for ventilation or
          medical advice. Always monitor local air quality, especially on days with poor outdoor
          conditions.
        </p>
      </section>
    </section>
  </main>
</template>
