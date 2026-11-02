# testing-layers：vitest 5 三工程分层测试

任何测试相关工作前读本文。分层原则：L1/L2 进红绿循环，L3 只做合入护栏（SKILL.md 红绿六步）。

- **L1 纯逻辑**（Node 工程，毫秒级）：数据变换、option 形状、格式化、颜色计算。
- **L2 渲染契约**（browser 工程，真实 chromium）：实例收到 option、像素映射、canvas 有墨、交互状态。
- **L3 视觉基线**（vrt 工程，`toMatchScreenshot`）：外观回归护栏。

## 依赖与引导（真实项目一次性）

```bash
npm i -D vitest@5 @vitest/browser-playwright@5 vitest-browser-vue@3 @vitejs/plugin-vue
npx playwright install chromium
# 或交互式引导：npx vitest init browser
```

## vitest.config.ts（三工程全文）

```ts
import vue from '@vitejs/plugin-vue'
import { playwright } from '@vitest/browser-playwright'
import { defaultExclude, defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [vue()],
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['src/**/*.test.ts'],
          // ⚠ glob 的 `*` 跨点匹配：不显式排除，unit 工程会把 *.browser.test.ts / *.vrt.test.ts
          // 一起扫进来（报 “vitest/browser can be imported only inside the Browser Mode”）
          exclude: [...defaultExclude, 'src/**/*.browser.test.ts', 'src/**/*.vrt.test.ts'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'browser',
          include: ['src/**/*.browser.test.ts'],
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: 'chromium' }],
          },
        },
      },
      {
        test: {
          name: 'vrt',
          include: ['src/**/*.vrt.test.ts'],
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: 'chromium', viewport: { width: 900, height: 500 } }],
            expect: {
              toMatchScreenshot: {
                comparatorName: 'pixelmatch',
                comparatorOptions: {
                  threshold: 0.2,                    // 单像素颜色容忍（0-1）
                  allowedMismatchedPixelRatio: 0.01, // 允许 1% 像素不一致
                },
              },
            },
          },
        },
      },
    ],
  },
})
```

文件命名即路由：`*.test.ts` → unit，`*.browser.test.ts` → browser，`*.vrt.test.ts` → vrt。`*` 会跨越点号匹配，所以 unit 工程必须带上面那行 `exclude`，否则三个工程会互相串门。

```json
{
  "scripts": {
    "test:unit": "vitest --project unit",
    "test:browser": "vitest --project browser",
    "test:vrt": "vitest --project vrt"
  }
}
```

红绿循环常驻 `npm run test:unit`（watch 模式，秒级反馈），L1 全绿后再跑 browser。

## 确定性清单（测试前逐条过）

1. **固定容器尺寸**：组件接受 `width/height` props（默认值给产品值，测试传显式值）。`echarts.init` 要求容器非零尺寸——这是空白图第一根因。
2. **`animation: false`**：由 props 传入（见 worked example），否则断言跑到动画中间帧。
3. **静态 fixture**：测试数据全静态（props 注入或 `vi.mock` 数据模块）；组件内自取数则 mock 边界（数据层/请求层），变换与渲染保持真实。
4. **冻结时钟**：数据含时间戳/相对时间/「今天」默认值时 `vi.setSystemTime(new Date('2020-01-01T00:00:00Z'))`。
5. **先 settle 再断言**：实例就绪、内容出现之后才取数；`render` 与挂载钩子完成不等于异步资源完成。
6. VRT 首跑生成基线并**失败属预期**：人工审核 `__screenshots__/` 截图后提交，后续运行才比对。

## 断言通道选型表

| 断言对象 | 通道 | 层 |
|---|---|---|
| 数据变换（宽表/补零/排序/百分比/颜色） | 纯函数直接断言 | L1 |
| option 形状（encode/stack/无 series.data） | `buildOption()` 返回值 | L1 |
| 实例真实收到 option | `getInstanceByDom(el)` → `getOption()` | L2 |
| 像素布局（直角/极坐标/平行系：值映射到哪个 x/y） | `chart.convertToPixel(...)` | L2 |
| 画面非空白 | canvas `getImageData` 采样 alpha 通道 | L2 |
| 组件注册齐全 | spy `console.error`（缺注册**不抛错**） | L2 |
| 交互后状态 / 可达性 | locators + `expect.element` | L2 |
| 整体外观回归 | `toMatchScreenshot()` 基线 | L3 |

通道按族适用性见 `chart-families.md` 矩阵：无坐标系族（饼/层级/关系/仪表等）无 convertToPixel 可用，L2 像素断言走 getOption + canvas 采样；迭代布局族（力导向/桑基）不像素断言。

测试代码与组件同跑在一个浏览器页面里：`document.querySelector` 直接可达，`getInstanceByDom`（从 `echarts` import）与组件共享同一注册表。

## L2 常用写法

`vitest-browser-vue` 3 的两个签名坑（实测）：`render(...)` 返回 `Promise<RenderResult>`，必须 `await`；`rerender(props)` 直接收 props 对象，不要再包一层 `{ props }`。

```ts
import { getInstanceByDom } from 'echarts'
import { render } from 'vitest-browser-vue'
import { expect, it, vi } from 'vitest'
import TrendChart from './TrendChart.vue'

const props = { data: fixture, fullScore: 5, animated: false, width: 800, height: 400 }

it('挂载即建实例，dataset 进了 getOption', async () => {
  const screen = await render(TrendChart, { props })   // ⚠ 必须 await
  await expect.element(screen.getByTestId('chart-container')).toBeInTheDocument()
  const el = document.querySelector<HTMLElement>('[data-testid="chart-container"]')!
  const chart = getInstanceByDom(el)!
  expect((chart.getOption() as any).dataset[0].source).toEqual(toDataset(fixture).source)
})

it('canvas 有墨（非空白防线）', async () => {
  const screen = await render(TrendChart, { props })
  const canvas = screen.container.querySelector('canvas')!
  const { data } = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height)
  let inked = 0
  for (let i = 3; i < data.length; i += 4) if (data[i] !== 0) inked++
  expect(inked).toBeGreaterThan(1000) // 透明底：画过的像素 alpha > 0
})

it('缺注册只报 console.error，不抛错——必须 spy', async () => {
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
  try {
    await render(TrendChart, { props })
    expect(spy.mock.calls.some(c => String(c[0]).includes('not exists'))).toBe(false)
  } finally {
    spy.mockRestore() // 恢复，勿吞其他错误
  }
})

it('数据更新后按当前数据重建', async () => {
  const screen = await render(TrendChart, { props })
  await screen.rerender({ data: fixture.slice(0, 1) })   // ⚠ 直接收 props
  await expect.poll(() => graphicIds()).toEqual(['badge-正确性'])
})
```

tooltip 内容不走鼠标悬停坐标，走实例动作后查 DOM（tooltip 默认渲染在容器内）：

```ts
chart.dispatchAction({ type: 'showTip', seriesIndex: 0, dataIndex: 0 })
await expect.element(screen.getByText(/准确/)).toBeInTheDocument()
```

## L3：toMatchScreenshot

- 断言挂在元素 locator 上：`await expect(screen.getByTestId('chart-container')).toMatchScreenshot('名称')`。
- 基线在测试旁 `__screenshots__/<文件名>/` 目录，命名含浏览器与平台（chromium-darwin 等），跨机器不互踩。**基线入库提交**。
- 有意改 UI 后 `vitest --project vrt --update` 刷新，更新如产品变更一样走人工审核。
- 容差两级：全局在 vrt 工程 `expect.toMatchScreenshot.comparatorOptions` 配（上文 config）；个案直传断言第二参覆盖。
- 失败输出三图（reference/actual/diff），大面积红 = 真出事，文字边缘红点 = 升 `threshold`。

## 不测什么

- 库内部 DOM / SVG path 字符串 / tick 标记细节——那是 ECharts 的实现，契约断言 `getOption()` 与 `convertToPixel` 足够。
- 同一断言逐层重复：L1 已测的数据变换不在 L2 重测数值，L2 只证明「进了实例」。
- 动画中间帧、tooltip 的每种样式变体（只在有业务语义时测 tooltip 内容）。
- 每个交互帧的截图基线——L3 只锁稳定的终态。

## 官方文档

- Test Projects（多工程 config）：`https://vitest.dev/guide/projects`
- Browser Mode：`https://vitest.dev/guide/browser/`、`https://vitest.dev/config/#browser`
- 组件测试（vitest-browser-vue）：`https://vitest.dev/api/browser/vue`、`https://vitest.dev/guide/browser/component-testing`
- 视觉回归（toMatchScreenshot/基线/--update）：`https://vitest.dev/guide/browser/visual-regression-testing`、`https://vitest.dev/api/expect`

## 出处

API 事实核自 vitest v5 官方文档（`toMatchScreenshot` / Test Projects / `expect.element` / component testing）；分层原则蒸馏自 `openai/plugins` 的 `testing-data-visualizations`；确定性清单蒸馏自 `uiverify/uiverify` 的 vitest browser mode 实践（已剥离其产品耦合）。上游更新不自动同步。
