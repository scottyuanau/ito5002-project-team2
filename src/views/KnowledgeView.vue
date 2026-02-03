<script setup>
import Accordion from 'primevue/accordion'
import AccordionContent from 'primevue/accordioncontent'
import AccordionHeader from 'primevue/accordionheader'
import AccordionPanel from 'primevue/accordionpanel'

// Static pollutant explainers shown in the knowledge accordion.
const pollutantPanels = [
  {
    key: '0',
    title: 'PM2.5 (Fine Particulate Matter <=2.5um)',
    whatItIs:
      'Tiny particles from car exhaust, bushfires, wood heaters, and industry that are small enough to get deep into your lungs.',
    whyItMatters:
      'PM2.5 can enter your bloodstream and increase the risk of asthma, heart disease, and long-term lung damage. High levels are especially dangerous for children, the elderly, and people with respiratory conditions.',
  },
  {
    key: '1',
    title: 'PM10 (Particulate Matter <=10um)',
    whatItIs: 'Larger particles such as dust, pollen, smoke, and road debris.',
    whyItMatters:
      'PM10 irritates the airways and can trigger coughing, allergies, and asthma flare-ups. It is often higher near busy roads, construction sites, and during dry or windy days.',
  },
  {
    key: '2',
    title: 'CO (Carbon Monoxide)',
    whatItIs:
      'A colourless, odourless gas produced by cars, generators, gas appliances, and incomplete fuel burning.',
    whyItMatters:
      'At high levels, CO reduces oxygen delivery in your body, causing headaches, dizziness, and fatigue and can be life-threatening in enclosed or poorly ventilated areas.',
  },
  {
    key: '3',
    title: 'NO2 (Nitrogen Dioxide)',
    whatItIs: 'A gas mainly released from vehicle exhausts and gas cooking or heating.',
    whyItMatters:
      'NO2 inflames the lungs, worsens asthma, and increases susceptibility to respiratory infections. It is commonly higher near major roads and dense traffic areas.',
  },
  {
    key: '4',
    title: 'SO2 (Sulfur Dioxide)',
    whatItIs: 'A gas from burning fossil fuels, industrial processes, and some power stations.',
    whyItMatters:
      'SO2 can cause breathing difficulties, chest tightness, and asthma attacks even after short exposure. Sensitive groups may feel effects quickly on high-pollution days.',
  },
  {
    key: '5',
    title: 'O3 (Ozone - Ground-Level)',
    whatItIs:
      'A pollutant formed when sunlight reacts with vehicle and industrial emissions (not emitted directly).',
    whyItMatters:
      'Ozone irritates the lungs, reduces lung function, and makes outdoor exercise harder. Levels are often highest on hot, sunny afternoons.',
  },
]
</script>

<template>
  <section class="w-full max-w-5xl self-start space-y-8 py-6 text-left">
    <header class="space-y-2">
      <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Knowledge</p>
      <h1 class="text-3xl font-semibold text-slate-900">Air quality metrics explained</h1>
      <p class="text-sm text-slate-500">
        Understand what each pollutant means and why it matters for day-to-day health decisions.
      </p>
    </header>

    <Accordion value="0">
      <AccordionPanel v-for="panel in pollutantPanels" :key="panel.key" :value="panel.key">
        <AccordionHeader>{{ panel.title }}</AccordionHeader>
        <AccordionContent>
          <div class="space-y-3 text-sm leading-6 text-slate-700">
            <p><span class="font-semibold text-slate-900">What it is:</span> {{ panel.whatItIs }}</p>
            <p>
              <span class="font-semibold text-slate-900">Why it matters to you:</span>
              {{ panel.whyItMatters }}
            </p>
          </div>
        </AccordionContent>
      </AccordionPanel>
    </Accordion>
  </section>
</template>
