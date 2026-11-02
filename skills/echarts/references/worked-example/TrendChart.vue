<!-- TrendChart.vue —— 维度堆叠柱：dataset 风格 option + useEChart 接线 + graphic 实测注入 -->
<script setup lang="ts">
import type { ECharts, EChartsOption } from 'echarts'
import { ref, watchEffect } from 'vue'
import { buildOption, type DimensionDatum } from './buildOption'
import { useEChart } from './useEChart'

const props = withDefaults(
  defineProps<{
    data: DimensionDatum[]
    fullScore?: number
    animated?: boolean
    /** 固定像素尺寸：保证 echarts.init 时容器非零（空白图防线），测试也靠它确定性 */
    width?: number
    height?: number
  }>(),
  { fullScore: 5, animated: true, width: 800, height: 400 },
)

const container = ref<HTMLElement>()
const { chart } = useEChart(container)

const BADGE_WIDTH = 48
const BADGE_GAP = 16
const BADGE_LINE_HEIGHT = 14
const BADGE_PADDING_Y = 7
const BAR_WIDTH = 20 // 与 buildOption 的 barWidth 默认值一致

/** 像素实测注入（pixel-pipeline.md 三段管线的组件化示范）：
 *  ① flush 后从 display list 实测 y 轴 label 最左像素
 *  ② 按三段式计算行首序号块的边界
 *  ③ 二次 setOption 注入（id + merge 语义） */
function injectRowBadges(chart: ECharts, rows: DimensionDatum[]) {
  chart.getZr().flush()
  // zrender 6 把 Text 拆成 tspan 子元素进 display list（v6 之前才是 text 元素）——
  // 这里按 v6 实测匹配 tspan；getComputedTransform() 已含父链，tspan 上拿到的就是画布坐标。
  const labelLeft = new Map<string, number>()
  for (const el of chart.getZr().storage.getDisplayList(false) as unknown as {
    type: string
    style?: { text?: string }
    getBoundingRect: () => { clone: () => { x: number; y: number; width: number; height: number; applyTransform: (m: number[]) => void } }
    getComputedTransform: () => number[] | null
  }[]) {
    if (el.type !== 'tspan') continue
    const text = el.style?.text
    const row = text === undefined ? undefined : rows.find((r) => r.dimension === text)
    if (!row) continue
    const rect = el.getBoundingRect().clone() // 局部坐标
    const m = el.getComputedTransform()
    if (m) rect.applyTransform(m) // 就地变换到画布坐标（pixel-pipeline 矩阵叠加节）
    // 同名文本也可能出现在图例等处：y 轴 label 是最靠左的那个
    const known = labelLeft.get(row.dimension)
    if (known === undefined || rect.x < known) labelLeft.set(row.dimension, rect.x)
  }

  // ① 自适应：块高 = max(几何需求 = 柱宽 + 上下各 4，文字需求 = 行高 + 上下内边距)
  const height = Math.max(BAR_WIDTH + 8, BADGE_LINE_HEIGHT + BADGE_PADDING_Y * 2)
  const centers = rows.map((_, index) =>
    (chart.convertToPixel({ seriesIndex: 0 }, [0, index]) as [number, number])[1],
  )
  // 最后一行 band 下沿 ≈ x 轴线：末行中心 + 半个 band 高
  const halfBand = centers.length > 1 ? Math.abs(centers[1] - centers[0]) / 2 : height / 2
  const limitBottom = (centers[centers.length - 1] ?? 0) + halfBand

  const elements: Record<string, unknown>[] = rows.flatMap((row, index) => {
    const left = labelLeft.get(row.dimension)
    if (left === undefined) return []
    const x = left - BADGE_GAP - BADGE_WIDTH
    // ② 对称扩展：围绕 band 中心上下各半
    const top = centers[index] - height / 2
    // ③ 边界钳制：下缘越过 x 轴线时整体上移，再夹住上缘
    const y = Math.max(top + height > limitBottom ? limitBottom - height : top, 0)
    return [
      {
        type: 'group',
        id: `badge-${row.dimension}`,
        z: 0, // 压在柱下（系列图元 z≈2~3）
        silent: true, // 不吞鼠标，勿挡 tooltip
        children: [
          { type: 'rect', shape: { x, y, width: BADGE_WIDTH, height, r: 4 }, style: { fill: '#eef1f6' } },
          {
            type: 'text',
            style: { x: x + BADGE_WIDTH / 2, y: y + height / 2, text: `0${index + 1}`, font: '12px sans-serif', fill: '#333', textAlign: 'center', textVerticalAlign: 'middle' },
          },
        ],
      },
    ]
  })
  // ③ 注入：带 id 走 merge 语义（同 id 原位更新）。本组件的整套 option 走 notMerge 重建，
  // graphic 每次都是空的，所以不需要为消失的 id 补 $action:'remove'——那只在 merge 模式下必要
  chart.setOption({ graphic: { elements } } as EChartsOption)
}

// flush:'post'：挂载后（chart 已 init）才执行；props.data 深层读取自动追踪。
// notMerge：本组件的 option 从数据全量重建，行数/段集合属结构性变更，直接替换。
// （代价：legend 选择不跨数据变更保留——需要时见 option-recipes.md 的回填配方）
watchEffect(
  () => {
    if (!chart.value) return
    const option = buildOption(props.data, {
      fullScore: props.fullScore,
      animation: props.animated,
    })
    // 本地推断类型宽于 ECharts 官方类型，收口在此处一次
    chart.value.setOption(option as EChartsOption, { notMerge: true })
    injectRowBadges(chart.value, props.data) // 数据变更 → graphic 随之重算重注入
  },
  { flush: 'post' },
)
</script>

<template>
  <div
    ref="container"
    data-testid="chart-container"
    :style="{ width: props.width + 'px', height: props.height + 'px' }"
  />
</template>
