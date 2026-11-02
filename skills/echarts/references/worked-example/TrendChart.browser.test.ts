// TrendChart.browser.test.ts —— L2：渲染契约（红绿六步第 4/5 步）
// 归属 browser 工程：vitest --project browser（真实 chromium）
// 断言通道见 testing-layers.md 选型表：getOption / convertToPixel / canvas 墨迹 / console.error spy
import { getInstanceByDom } from 'echarts'
import { render } from 'vitest-browser-vue'
import { describe, expect, it, vi } from 'vitest'
import { toDataset, type DimensionDatum } from './buildOption'
import TrendChart from './TrendChart.vue'

const fixture: DimensionDatum[] = [
  { dimension: '正确性', children: [{ name: '准确', value: 3 }, { name: '召回', value: 2 }] },
  { dimension: '易理解', children: [{ name: '召回', value: 1 }, { name: '覆盖', value: 2 }] },
]

// 确定性清单：固定尺寸 + animation false + 静态 fixture（testing-layers.md）
const props = { data: fixture, fullScore: 5, animated: false, width: 800, height: 400 }

type GraphicElement = {
  type: string
  id?: string
  z?: number
  shape?: { x: number; y: number; width: number; height: number }
}

function graphicElements(chart: NonNullable<ReturnType<typeof getInstanceByDom>>) {
  return (chart.getOption() as unknown as { graphic: { elements: GraphicElement[] }[] }).graphic[0].elements
}

// getOption() 把 group 摊平成扁平列表（子元素 id 是生成值、靠 parentId 认亲）——按 type/id 收窄再断言
function badgeGroups(chart: NonNullable<ReturnType<typeof getInstanceByDom>>) {
  return graphicElements(chart).filter((e) => e.type === 'group' && e.id?.startsWith('badge-'))
}

// vitest-browser-vue 3 的 render 返回 Promise：必须 await（挂载 + init 完成后 DOM 与实例才就绪）
async function mount(data: DimensionDatum[] = fixture) {
  const screen = await render(TrendChart, { props: { ...props, data } })
  const el = document.querySelector<HTMLElement>('[data-testid="chart-container"]')
  if (!el) throw new Error('容器未渲染')
  const chart = getInstanceByDom(el)
  if (!chart) throw new Error('实例未建立（init 早于挂载或容器零尺寸）')
  return { screen, el, chart }
}

describe('TrendChart 渲染契约', () => {
  it('挂载即建实例，dataset 进了 getOption（与纯函数一致——L2 只证「进了实例」）', async () => {
    const { screen, chart } = await mount()
    // settle 判据：容器已在文档中（locator 断言，expect.element 自动重试）
    await expect.element(screen.getByTestId('chart-container')).toBeInTheDocument()

    const option = chart.getOption() as { dataset: { source: unknown[] }[]; series: unknown[] }
    expect(option.dataset[0].source).toEqual(toDataset(fixture).source)
    expect(option.series).toHaveLength(3)
  })

  it('convertToPixel：满分映射在画布内、行 0 总分落在 grid 右缘附近', async () => {
    const { chart } = await mount()
    // [值, 类目下标]：行 0 总分 5 = 满分 → x 应贴近 grid 右缘
    const [x, y] = chart.convertToPixel({ seriesIndex: 2 }, [5, 0]) as [number, number]
    expect(x).toBeGreaterThan(0)
    expect(x).toBeLessThanOrEqual(800)
    expect(y).toBeGreaterThan(0)
    expect(y).toBeLessThanOrEqual(400)
  })

  it('canvas 有墨（非空白防线，透明底 alpha 采样）', async () => {
    const { el } = await mount()
    const canvas = el.querySelector('canvas')
    if (!canvas) throw new Error('canvas 未创建')
    const { data } = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height)
    let inked = 0
    for (let i = 3; i < data.length; i += 4) if (data[i] !== 0) inked++
    expect(inked).toBeGreaterThan(1000)
  })

  it('无注册缺失告警：缺组件只报 console.error 不抛错，必须 spy 才可见', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      await mount()
      const missing = spy.mock.calls.some((call) => String(call[0]).includes('not exists'))
      expect(missing).toBe(false) // 全量 import 下恒绿；切 echarts/core 后此测试上岗
    } finally {
      spy.mockRestore()
    }
  })

  it('graphic 实测注入：按行生成序号块，id 稳定可 merge，z 压在柱下，且不越出画布边缘', async () => {
    const { chart } = await mount()
    expect(badgeGroups(chart).map((e) => e.id)).toEqual(['badge-正确性', 'badge-易理解'])
    expect(badgeGroups(chart).every((e) => e.z === 0)).toBe(true)
    // 子 rect 的实测几何：块宽 48 + 间距 16 必须能落在 label 左侧，grid.left 不足时会成负坐标
    const rects = graphicElements(chart).filter((e) => e.type === 'rect')
    expect(rects).toHaveLength(fixture.length)
    expect(rects.every((e) => (e.shape?.x ?? -1) >= 0)).toBe(true)
    expect(rects.every((e) => (e.shape?.y ?? -1) >= 0 && (e.shape?.y ?? 0) + (e.shape?.height ?? 0) <= 400)).toBe(true)
  })

  it('数据行减少 → 重建后只剩当前行（notMerge 语义护栏：改成 merge 就必须补 $action:remove）', async () => {
    const { screen, chart } = await mount()
    // rerender 直接收 props（vitest-browser-vue 3），不需要再包一层 { props }
    await screen.rerender({ data: fixture.slice(0, 1) })
    await expect.poll(() => badgeGroups(chart).map((e) => e.id)).toEqual(['badge-正确性'])
  })
})
