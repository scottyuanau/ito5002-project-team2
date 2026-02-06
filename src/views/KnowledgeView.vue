<script setup>
import { defineComponent, h } from 'vue'
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

/**
 * Inline SVG icons (outline head + expression) in the same human-face style.
 * If you provide the original SVGs, we can replace these to match 1:1.
 */
const FaceGood = defineComponent({
  name: 'FaceGood',
  props: { stroke: { type: String, default: '#2B7A2F' } },
  setup(props) {
    return () =>
      h(
        'svg',
        { viewBox: '0 0 64 64', fill: 'none', xmlns: 'http://www.w3.org/2000/svg' },
        [
          h('path', {
            d: 'M32 58c13.254 0 24-10.746 24-24S45.254 10 32 10 8 20.746 8 34s10.746 24 24 24Z',
            stroke: props.stroke,
            'stroke-width': '3',
          }),
          h('path', {
            d: 'M18 28c3-6 7-9 14-9s11 3 14 9',
            stroke: props.stroke,
            'stroke-width': '3',
            'stroke-linecap': 'round',
          }),
          h('path', {
            d: 'M24 34h0',
            stroke: props.stroke,
            'stroke-width': '5',
            'stroke-linecap': 'round',
          }),
          h('path', {
            d: 'M40 34h0',
            stroke: props.stroke,
            'stroke-width': '5',
            'stroke-linecap': 'round',
          }),
          h('path', {
            d: 'M24 42c2.5 3 5.5 4.5 8 4.5s5.5-1.5 8-4.5',
            stroke: props.stroke,
            'stroke-width': '3',
            'stroke-linecap': 'round',
          }),
        ]
      )
  },
})

const FaceModerate = defineComponent({
  name: 'FaceModerate',
  props: { stroke: { type: String, default: '#8A6A00' } },
  setup(props) {
    return () =>
      h(
        'svg',
        { viewBox: '0 0 64 64', fill: 'none', xmlns: 'http://www.w3.org/2000/svg' },
        [
          h('path', {
            d: 'M32 58c13.254 0 24-10.746 24-24S45.254 10 32 10 8 20.746 8 34s10.746 24 24 24Z',
            stroke: props.stroke,
            'stroke-width': '3',
          }),
          h('path', {
            d: 'M18 28c3-6 7-9 14-9s11 3 14 9',
            stroke: props.stroke,
            'stroke-width': '3',
            'stroke-linecap': 'round',
          }),
          h('path', {
            d: 'M24 34h0',
            stroke: props.stroke,
            'stroke-width': '5',
            'stroke-linecap': 'round',
          }),
          h('path', {
            d: 'M40 34h0',
            stroke: props.stroke,
            'stroke-width': '5',
            'stroke-linecap': 'round',
          }),
          h('path', {
            d: 'M24 44h16',
            stroke: props.stroke,
            'stroke-width': '3',
            'stroke-linecap': 'round',
          }),
        ]
      )
  },
})

const FaceSensitive = defineComponent({
  name: 'FaceSensitive',
  props: { stroke: { type: String, default: '#8A3A00' } },
  setup(props) {
    return () =>
      h(
        'svg',
        { viewBox: '0 0 64 64', fill: 'none', xmlns: 'http://www.w3.org/2000/svg' },
        [
          h('path', {
            d: 'M32 58c13.254 0 24-10.746 24-24S45.254 10 32 10 8 20.746 8 34s10.746 24 24 24Z',
            stroke: props.stroke,
            'stroke-width': '3',
          }),
          h('path', {
            d: 'M18 28c3-6 7-9 14-9s11 3 14 9',
            stroke: props.stroke,
            'stroke-width': '3',
            'stroke-linecap': 'round',
          }),
          h('path', {
            d: 'M24 34h0',
            stroke: props.stroke,
            'stroke-width': '5',
            'stroke-linecap': 'round',
          }),
          h('path', {
            d: 'M40 34h0',
            stroke: props.stroke,
            'stroke-width': '5',
            'stroke-linecap': 'round',
          }),
          h('path', {
            d: 'M24 46c2-2 5-3 8-3s6 1 8 3',
            stroke: props.stroke,
            'stroke-width': '3',
            'stroke-linecap': 'round',
          }),
        ]
      )
  },
})

const FaceUnhealthyMask = defineComponent({
  name: 'FaceUnhealthyMask',
  props: { stroke: { type: String, default: '#6B0000' } },
  setup(props) {
    return () =>
      h(
        'svg',
        { viewBox: '0 0 64 64', fill: 'none', xmlns: 'http://www.w3.org/2000/svg' },
        [
          h('path', {
            d: 'M32 58c13.254 0 24-10.746 24-24S45.254 10 32 10 8 20.746 8 34s10.746 24 24 24Z',
            stroke: props.stroke,
            'stroke-width': '3',
          }),
          h('path', {
            d: 'M18 28c3-6 7-9 14-9s11 3 14 9',
            stroke: props.stroke,
            'stroke-width': '3',
            'stroke-linecap': 'round',
          }),
          h('path', {
            d: 'M24 34h0',
            stroke: props.stroke,
            'stroke-width': '5',
            'stroke-linecap': 'round',
          }),
          h('path', {
            d: 'M40 34h0',
            stroke: props.stroke,
            'stroke-width': '5',
            'stroke-linecap': 'round',
          }),
          h('path', {
            d: 'M20 42c4-3 20-3 24 0v8c-4 3-20 3-24 0v-8Z',
            stroke: props.stroke,
            'stroke-width': '3',
            'stroke-linejoin': 'round',
          }),
          h('path', {
            d: 'M20 44l-6-3m36 3l6-3',
            stroke: props.stroke,
            'stroke-width': '3',
            'stroke-linecap': 'round',
          }),
          h('path', {
            d: 'M26 46h12',
            stroke: props.stroke,
            'stroke-width': '2.5',
            'stroke-linecap': 'round',
          }),
        ]
      )
  },
})

const FaceVeryUnhealthy = defineComponent({
  name: 'FaceVeryUnhealthy',
  props: { stroke: { type: String, default: '#2B0A4E' } },
  setup(props) {
    return () =>
      h(
        'svg',
        { viewBox: '0 0 64 64', fill: 'none', xmlns: 'http://www.w3.org/2000/svg' },
        [
          h('path', {
            d: 'M32 58c13.254 0 24-10.746 24-24S45.254 10 32 10 8 20.746 8 34s10.746 24 24 24Z',
            stroke: props.stroke,
            'stroke-width': '3',
          }),
          h('path', {
            d: 'M18 28c3-6 7-9 14-9s11 3 14 9',
            stroke: props.stroke,
            'stroke-width': '3',
            'stroke-linecap': 'round',
          }),
          h('path', {
            d: 'M22 34l4 4m0-4l-4 4',
            stroke: props.stroke,
            'stroke-width': '3',
            'stroke-linecap': 'round',
          }),
          h('path', {
            d: 'M38 34l4 4m0-4l-4 4',
            stroke: props.stroke,
            'stroke-width': '3',
            'stroke-linecap': 'round',
          }),
          h('path', {
            d: 'M24 46c2-3 5-4 8-4s6 1 8 4',
            stroke: props.stroke,
            'stroke-width': '3',
            'stroke-linecap': 'round',
          }),
        ]
      )
  },
})

const FaceHazardousCough = defineComponent({
  name: 'FaceHazardousCough',
  props: { stroke: { type: String, default: '#1F0A10' } },
  setup(props) {
    return () =>
      h(
        'svg',
        { viewBox: '0 0 64 64', fill: 'none', xmlns: 'http://www.w3.org/2000/svg' },
        [
          h('path', {
            d: 'M32 58c13.254 0 24-10.746 24-24S45.254 10 32 10 8 20.746 8 34s10.746 24 24 24Z',
            stroke: props.stroke,
            'stroke-width': '3',
          }),
          h('path', {
            d: 'M18 28c3-6 7-9 14-9s11 3 14 9',
            stroke: props.stroke,
            'stroke-width': '3',
            'stroke-linecap': 'round',
          }),
          h('path', {
            d: 'M24 34h0',
            stroke: props.stroke,
            'stroke-width': '5',
            'stroke-linecap': 'round',
          }),
          h('path', {
            d: 'M40 34h0',
            stroke: props.stroke,
            'stroke-width': '5',
            'stroke-linecap': 'round',
          }),
          h('path', {
            d: 'M28 46c3-2 5-2 8 0',
            stroke: props.stroke,
            'stroke-width': '3',
            'stroke-linecap': 'round',
          }),
          h('path', {
            d: 'M46 44c3 0 5 2 5 5s-2 5-5 5',
            stroke: props.stroke,
            'stroke-width': '3',
            'stroke-linecap': 'round',
          }),
          h('path', {
            d: 'M50 40c2 1 3 3 3 5',
            stroke: props.stroke,
            'stroke-width': '2.5',
            'stroke-linecap': 'round',
          }),
        ]
      )
  },
})

const rows = [
  {
    key: 'good',
    level: 'Good',
    aqiRange: '0-50',
    pmRange: '0-9.0',
    recommendation: 'Air quality is satisfactory and poses little or no risk.',
    bg: '#7BCB72',
    icon: FaceGood,
    iconBg: '#BFE9B9',
    iconBorder: '#5DAE55',
    iconStroke: '#2B7A2F',
  },
  {
    key: 'moderate',
    level: 'Moderate',
    aqiRange: '51-100',
    pmRange: '9.1-35.4',
    recommendation:
      'Sensitive individuals should avoid outdoor activity as they may experience respiratory symptoms.',
    bg: '#F4D468',
    icon: FaceModerate,
    iconBg: '#F8E7AA',
    iconBorder: '#E1B93C',
    iconStroke: '#8A6A00',
  },
  {
    key: 'usg',
    level: 'Unhealthy\nfor Sensitive\nGroups',
    aqiRange: '101-150',
    pmRange: '35.5-55.4',
    recommendation:
      'General public and sensitive individuals in particular are at risk to experience irritation and respiratory problems.',
    bg: '#F6A14C',
    icon: FaceSensitive,
    iconBg: '#F8C28D',
    iconBorder: '#E7862D',
    iconStroke: '#8A3A00',
  },
  {
    key: 'unhealthy',
    level: 'Unhealthy',
    aqiRange: '151-200',
    pmRange: '55.5-125.4',
    recommendation:
      'Increased likelihood of adverse effects and aggravation to the heart and lungs among the general public.',
    bg: '#F06B6B',
    icon: FaceUnhealthyMask,
    iconBg: '#F6A5A5',
    iconBorder: '#D85858',
    iconStroke: '#6B0000',
  },
  {
    key: 'veryUnhealthy',
    level: 'Very\nUnhealthy',
    aqiRange: '201-300',
    pmRange: '125.5-225.4',
    recommendation:
      'General public will be noticeably affected. Sensitive groups should restrict outdoor activities.',
    bg: '#9C7FD2',
    icon: FaceVeryUnhealthy,
    iconBg: '#C4B1EA',
    iconBorder: '#7B5DBA',
    iconStroke: '#2B0A4E',
  },
  {
    key: 'hazardous',
    level: 'Hazardous',
    aqiRange: '301+',
    pmRange: '225.5+',
    recommendation:
      'General public at high risk of experiencing strong irritations and adverse health effects. Should avoid outdoor activities.',
    bg: '#7D5B66',
    icon: FaceHazardousCough,
    iconBg: '#B9A0A8',
    iconBorder: '#6A4651',
    iconStroke: '#1F0A10',
  },
]
</script>

<template>
  <section class="w-full max-w-5xl self-start space-y-8 px-4 py-6 text-left sm:px-6">
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

    <section class="space-y-4">
      <div class="space-y-2">
        <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Air Quality Index</p>
        <h2 class="text-2xl font-semibold text-slate-900">Air Quality Index explained</h2>
        <p class="text-sm text-slate-500">
          Learn how U.S. AQI levels relate to PM2.5 concentration and recommended health actions.
        </p>
      </div>

      <section
        class="w-full max-w-[980px] overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-[0_18px_40px_rgba(0,0,0,0.12)]"
      >
        <div
          class="hidden items-center bg-[#2F78C8] px-6 py-5 rounded-2xl mx-4 my-4 text-white md:grid md:grid-cols-[92px_220px_170px_1fr]"
        >
          <div></div>

          <div class="text-center tracking-tight">US AQI Level</div>

          <div class="text-center tracking-tight">
            <div class="">PM2.5</div>
            <div class="-mt-1 opacity-95">(µg/m³)</div>
          </div>

          <div class="text-center tracking-tight">
            <div class="">Health Recommendation</div>
            <div class="-mt-1 opacity-95">(for 24 hour exposure)</div>
          </div>
        </div>



        <div class="divide-y-[10px] divide-white">
          <div
            v-for="row in rows"
            :key="row.key"
            class="rounded-[18px] mx-4 my-1 px-4 py-4 md:grid md:grid-cols-[92px_220px_170px_1fr] md:py-0"
            :style="{ backgroundColor: row.bg }"
          >
            <!-- Mobile card layout -->
            <div class="space-y-4 text-white md:hidden">
              <div class="flex items-center gap-4">
                <div
                  class="flex h-[60px] w-[60px] items-center justify-center rounded-full border-2"
                  :style="{ backgroundColor: row.iconBg, borderColor: row.iconBorder }"
                >
                  <component :is="row.icon" class="h-[42px] w-[42px]" :stroke="row.iconStroke" />
                </div>
                <div class="space-y-1">
                  <div class="text-xs uppercase tracking-[0.2em] text-white/80">US AQI Level</div>
                  <div class="whitespace-pre-line text-[18px] font-extrabold leading-tight">
                    {{ row.level }}
                  </div>
                  <div class="text-[16px] font-semibold opacity-95">{{ row.aqiRange }}</div>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4 text-sm font-semibold">
                <div>
                  <div class="text-xs uppercase tracking-[0.2em] text-white/80">PM2.5</div>
                  <div class="text-[16px] font-extrabold">{{ row.pmRange }}</div>
                </div>
                <div class="text-right">
                  <div class="text-xs uppercase tracking-[0.2em] text-white/80">24h Guidance</div>
                </div>
              </div>

              <p class="text-[15px] font-semibold leading-relaxed">{{ row.recommendation }}</p>
            </div>

            <!-- Desktop row layout -->
            <div class="hidden items-center justify-center px-4 py-5 md:flex">
              <div
                class="flex h-[64px] w-[64px] items-center justify-center rounded-full border-2"
                :style="{ backgroundColor: row.iconBg, borderColor: row.iconBorder }"
              >
                <component :is="row.icon" class="h-[46px] w-[46px]" :stroke="row.iconStroke" />
              </div>
            </div>

            <div class="hidden flex-col justify-center px-4 py-5 text-white md:flex">
              <div class="whitespace-pre-line  leading-tight">
                {{ row.level }}
              </div>
              <div class="mt-2 opacity-95">
                {{ row.aqiRange }}
              </div>
            </div>

            <div class="hidden items-center justify-center px-4 py-5 text-white md:flex">
              <div class=" ">
                {{ row.pmRange }}
              </div>
            </div>

            <div class="hidden items-center px-6 py-5 text-white md:flex">
              <p class="tleading-relaxed">
                {{ row.recommendation }}
              </p>
            </div>
          </div>
        </div>

        <div class="px-6 py-4 text-[12px] text-black/60">
          Source: IQAir and U.S. EPA
        </div>
      </section>
    </section>
  </section>
</template>
