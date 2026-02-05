<template>
  <div class="h-28 w-28">
    <div ref="gaugeContainer" class="h-full w-full"></div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Highcharts from 'highcharts'
import HighchartsMore from 'highcharts/highcharts-more'
import SolidGauge from 'highcharts/modules/solid-gauge'

HighchartsMore(Highcharts)
SolidGauge(Highcharts)

const props = defineProps({
  currentValue: {
    type: Number,
    default: null,
  },
  unit: {
    type: String,
    default: 'ug/m3',
  },
})

const gaugeContainer = ref(null)
const gaugeChart = ref(null)

const getPm25TierColor = (value) => {
  if (!Number.isFinite(value)) {
    return '#94a3b8'
  }
  if (value < 5) {
    return '#22c55e'
  }
  if (value < 15) {
    return '#4ade80'
  }
  if (value < 25) {
    return '#facc15'
  }
  if (value < 35) {
    return '#fb923c'
  }
  if (value < 55) {
    return '#f87171'
  }
  return '#dc2626'
}

const gaugePayload = computed(() => {
  const numericValue = Number(props.currentValue)
  const hasValue = Number.isFinite(numericValue)
  return {
    min: 0,
    max: 60,
    current: hasValue ? numericValue : 0,
    hasValue,
    color: getPm25TierColor(hasValue ? numericValue : null),
    unit: props.unit,
  }
})

const buildGaugeOptions = ({ min, max, current, hasValue, color, unit }) => ({
  chart: {
    type: 'solidgauge',
    backgroundColor: 'transparent',
    height: 112,
  },
  title: null,
  pane: {
    startAngle: -120,
    endAngle: 120,
    background: [
      {
        outerRadius: '100%',
        innerRadius: '60%',
        shape: 'arc',
        borderWidth: 0,
        backgroundColor: '#e2e8f0',
      },
    ],
  },
  tooltip: {
    enabled: false,
  },
  yAxis: {
    min,
    max,
    lineWidth: 0,
    tickWidth: 0,
    minorTickInterval: null,
    tickAmount: 3,
    labels: {
      enabled: false,
    },
    stops: [
      [0, color],
      [1, color],
    ],
  },
  plotOptions: {
    solidgauge: {
      dataLabels: {
        y: -6,
        borderWidth: 0,
        useHTML: true,
        format: hasValue
          ? `<div style="text-align:center"><span style="font-size:16px;color:#0f172a">{y:.1f}</span><br/><span style="font-size:10px;color:#64748b">${unit}</span></div>`
          : '<div style="text-align:center"><span style="font-size:12px;color:#64748b">N/A</span></div>',
      },
    },
  },
  series: [
    {
      name: 'PM2.5',
      data: [current],
      color,
    },
  ],
  credits: {
    enabled: false,
  },
})

const updateGauge = async () => {
  await nextTick()
  if (!gaugeContainer.value) {
    return
  }
  const options = buildGaugeOptions(gaugePayload.value)
  if (gaugeChart.value) {
    gaugeChart.value.update(options, true, true)
    return
  }
  gaugeChart.value = Highcharts.chart(gaugeContainer.value, options)
}

const destroyGauge = () => {
  if (gaugeChart.value) {
    gaugeChart.value.destroy()
    gaugeChart.value = null
  }
}

onMounted(updateGauge)
onBeforeUnmount(destroyGauge)
watch(
  () => gaugePayload.value,
  () => {
    updateGauge()
  },
  { deep: true },
)
</script>
