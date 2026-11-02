// buildOption.ts —— 纯函数：树状数据 → ECharts option（dataset 风格）
// 运行时零依赖（不 import echarts/vue），保证 L1 在 Node 工程秒级红绿；
// import type 编译期擦除，不影响纯度。

export interface SegmentDatum {
  name: string
  value: number
}

export interface DimensionDatum {
  /** 维度名，全局唯一；数组顺序 = y 轴从上到下的顺序 */
  dimension: string
  /** 堆叠段；段名跨行共享（图例按段名对照颜色的前提） */
  children: SegmentDatum[]
}

export interface BuildOptionOptions {
  fullScore?: number
  animation?: boolean
  barWidth?: number
}

/** 行尾合计 formatter 工厂：行总分/满分 → 百分比；零分行返回空串不显示 */
export function makeRowTotalLabel(fullScore: number) {
  return (params: { value: unknown }): string => {
    const cells = Array.isArray(params.value) ? params.value.slice(1) : []
    const total = cells.reduce<number>((sum, v) => sum + (Number(v) || 0), 0)
    if (total === 0) return ''
    return `${Math.round((total / fullScore) * 100)}%`
  }
}

/** 树状数据 → 宽表 dataset.source：首行表头，每行一个维度，缺段补 0 */
export function toDataset(rows: DimensionDatum[]) {
  // 段名集合：按首次出现顺序展开（列序即堆叠序，从左到右）
  const segmentNames: string[] = []
  for (const row of rows) {
    for (const child of row.children) {
      if (!segmentNames.includes(child.name)) segmentNames.push(child.name)
    }
  }
  const source: (string | number)[][] = [
    ['dimension', ...segmentNames],
    ...rows.map((row) => [
      row.dimension,
      ...segmentNames.map((name) => row.children.find((c) => c.name === name)?.value ?? 0),
    ]),
  ]
  return { segmentNames, source }
}

export function buildOption(rows: DimensionDatum[], options: BuildOptionOptions = {}) {
  const { fullScore = 5, animation = true, barWidth = 20 } = options
  const { segmentNames, source } = toDataset(rows)
  const lastIndex = segmentNames.length - 1

  return {
    animation,
    dataset: { source },
    legend: {},
    grid: { left: 152, right: 56, top: 40, bottom: 40 }, // left 留够「分组块 48 + 间距 16 + 最长 label」
    xAxis: { type: 'value', max: fullScore },
    yAxis: { type: 'category', inverse: true, axisTick: { show: false }, axisLabel: { interval: 0 } },
    series: segmentNames.map((name, index) => ({
      name,
      type: 'bar' as const,
      stack: 'total',
      barWidth,
      encode: { x: name, y: 'dimension' },
      // 仅堆叠末段挂行尾合计：末段右端 = 行总分所在像素
      ...(index === lastIndex
        ? { label: { show: true, position: 'right' as const, formatter: makeRowTotalLabel(fullScore) } }
        : {}),
    })),
  }
}
