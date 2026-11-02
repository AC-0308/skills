// TrendChart.vrt.test.ts —— L3：视觉基线护栏（红绿六步第 6 步，不进红绿循环）
// 归属 vrt 工程：vitest --project vrt
// 首跑生成基线并失败属预期：人工审核 __screenshots__/ 后提交，后续运行做回归比对。
import { render } from 'vitest-browser-vue'
import { expect, it } from 'vitest'
import type { DimensionDatum } from './buildOption'
import TrendChart from './TrendChart.vue'

const fixture: DimensionDatum[] = [
  { dimension: '正确性', children: [{ name: '准确', value: 3 }, { name: '召回', value: 2 }] },
  { dimension: '易理解', children: [{ name: '召回', value: 1 }, { name: '覆盖', value: 2 }] },
]

it('维度堆叠柱基线', async () => {
  // 确定性三件套：固定尺寸 + animation false + 静态 fixture；render 返回 Promise，必须 await
  const screen = await render(TrendChart, { props: { data: fixture, fullScore: 5, animated: false, width: 800, height: 400 } })
  await expect.element(screen.getByTestId('chart-container')).toBeInTheDocument()
  await expect(screen.getByTestId('chart-container')).toMatchScreenshot('dimension-stacked-bar')
  // 有意改 UI 后：vitest --project vrt --update 刷新基线，更新如产品变更一样人工审核
})
