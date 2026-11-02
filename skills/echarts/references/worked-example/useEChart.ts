// useEChart.ts —— 薄 composable：init / dispose / 容器 resize
// 刻意不引 wrapper（vue-echarts 等）：产线与测试共用同一条实例通道，
// getInstanceByDom 可达、convertToPixel / getZr 直用。
import * as echarts from 'echarts'
import { onBeforeUnmount, onMounted, shallowRef, type Ref } from 'vue'
import { useResizeObserver } from '@vueuse/core'

export function useEChart(container: Ref<HTMLElement | undefined>) {
  const chart = shallowRef<echarts.ECharts | undefined>()

  onMounted(() => {
    if (!container.value) throw new Error('useEChart：容器 ref 未绑定 DOM')
    // init 前提：容器已有非零尺寸（由组件模板的固定尺寸 style 保证）
    chart.value = echarts.init(container.value)
  })

  // 观察容器而非 window：侧栏折叠 / grid 拉伸不触发 window resize
  useResizeObserver(container, () => chart.value?.resize())

  onBeforeUnmount(() => {
    chart.value?.dispose()
    chart.value = undefined
  })

  return { chart }
}
