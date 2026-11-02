# option-recipes：通用配方（跨族共用）

写或改 option 前先查 `chart-families.md` 选族并读 `families/<族>.md` 本族配方；本文件只收跨族通用的旋钮。铁律见 SKILL.md；本文件全是具体配方。

结构约定：所有图表的 option 由纯函数 `buildOption(数据, 配置)` 构建，方便 L1 直测。

## 间距还原

- 固定柱宽：`series.barWidth: 20`（数字像素）。行距视觉由容器高度与类目数摊派。
- 组间精确间距：y 轴类目插空串占位行 + `axisLabel: { interval: 0 }`，容器高度按规格先求和再设定（详见 pixel-pipeline.md 的 band 占位法）。
- 画布留白：`grid: { left, right, top, bottom }` 按设计稿边距直填。
- 图例间距：`legend.itemGap`、`legend.padding`。

## 配色还原

- 主题一次注册、处处引用：`echarts.registerTheme('app', themeObject)` 后 `init(el, 'app')`；把设计稿色值收进一个常量文件生成 themeObject。避免每个图表 option 里散抄色数组。
- 行内渐变/分段明度：per-series `itemStyle.color` 或 `visualMap`；色相-明度计算放纯函数，L1 直测。
- 渐变（面积/进度弧/背景色带）：`new echarts.graphic.LinearGradient(x0,y0,x1,y1,[{offset:0,color},{offset:1,color}])`（径向用 `RadialGradient`）；渐变对象作为 color 值进 option，L1 可断形状（offset/color 序列）；多图表共用渐变收敛进共享常量（techniques.md 路由表归口此处）。
- 深色：注册暗色主题，或 init 第三个参数 `echarts.init(el, theme, { darkMode: true })`（注意它是 **init 参数**，不是 option 字段）；主题切换需 dispose 后重 init。
- 数字格式统一收一个 `valueFormatter`/formatter helper。

## label / 文字

- 行尾合计：挂堆叠末段 series，`label: { position: 'right', formatter }`；formatter 收到的 `params.value` 是 dataset 整行数组，总和可从 `value.slice(1)` 求和（见 worked example）。
- 段内文字：`label: { position: 'inside' }` + `color: '#fff'`。
- 溢出截断：canvas `measureText` 且**显式设置与渲染一致的 font**；规则——放得下用原文，放不下保留前缀加 `…`，连 `…` 都放不下返回空串。
- 富文本多行：`rich` 样式 + `\n`。

## 图例 / tooltip / 轴

- 图例：`legend: { left/top, itemGap, textStyle: { color } }`；按段名着色（段名跨行共享的前提）。
- tooltip：时间序列折线/柱用 `trigger: 'axis'`，饼/散点/地图用 `trigger: 'item'`；单位用 `valueFormatter`；被滚动容器裁剪时 `tooltip: { confine: true }`。
- y 轴类目：`inverse: true` 让 `data[0]` 在最上方；`axisTick: { show: false }`；`axisLabel: { interval: 0 }` 强制全显。
- 双轴：第二轴 `yAxisIndex: 1`，配 `axisPointer` 联动。
- 多图联动：`chart.group = 'name'; echarts.connect('name')`（或相同 group 配置），只联轴语义兼容的图。

## setOption 的 merge / notMerge 判据

| 变更类型 | 模式 | 理由 |
|---|---|---|
| 数据值/行更新（行数、段集合不变） | merge（默认） | 走 ECharts diff 优化 |
| 图表类型变了 / series 数量变了 / 删 series 或轴 | `notMerge: true` | merge 会静默保留旧结构（典型「图不更新」根因） |
| 整份 option 从数据全量重建（组件内 watch 数据） | `notMerge: true` | 简单且正确；代价是 legend/dataZoom 选择状态被重置 |
| 需要保留 legend 选择跨更新 | merge + `notMerge` 仅结构变更时 | 先 `chart.getOption()` 取 `legend[0].selected` / dataZoom 范围回填 |

## tree-shaking 注册（产物体积敏感时）

```ts
import * as echarts from 'echarts/core'
import { BarChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([BarChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer])
```

- 多图表项目收敛到**一个共享注册模块**（一处 `echarts.use([...])` 全项目 import）；per-component 列表会漂移、单组件渲染时才暴露缺失。
- 缺注册只报 `console.error` 不抛错——单测会静默通过，必须 spy console（见 testing-layers.md / failure-modes.md）。
- `import type { ... } from 'echarts'` 编译期擦除，不影响 tree-shaking。

## ECharts 6 迁移要点

- `grid.containLabel` 弃用：语义保持的迁移是 `outerBoundsMode: 'same', outerBoundsContain: 'axisLabel'`；旧兼容需注册 `LegacyGridContainLabel`（`'echarts/features'`）。
- v6 默认主题（配色与组件布局）变了：迁移期保持 v5 观感用 `import 'echarts/theme/v5'` + `init(el, 'v5')`。
- v6 轴标签防溢出默认开启，布局可能微移：像素对齐敏感时 `grid: { outerBoundsMode: 'none' }`。
- 下结论前查 `node_modules/echarts/package.json` 的实际版本；弃用告警走 console 而非异常。

## dataset 高级通道（transform 判据）

**默认：数据变换写在 JS 纯函数**（buildOption 层）——变换结果可 L1 秒级直测，红绿主战场。

`dataset.transform` 把变换移进 ECharts 内部：变换配置进得了 option，但**算出来的数只有渲染后可见**，L1 断不到值。因此 transform 只在两景下使用（白名单外视为「L1 割让」坏味道）：

1. **多图共享同一变换**：dataset 声明一次 transform，多个系列/多图用 `datasetIndex` 引用——省代码与内存，且各图一致性由 ECharts 保证；
2. **声明式过移动画收益**且变换极简（一行 sort/filter）：JS 层做反而丢掉 ECharts 的数据 diff 动画。

```ts
// 白名单 1：共享变换
dataset: [
  { transform: { type: 'sort', config: { dimension: 'value', order: 'desc' } } },  // 排序后供多个 series 引用
  { fromDatasetIndex: 0, transform: { type: 'filter', config: { dimension: '类目', '=': '华东' } } },  // 级联：从 0 号 dataset 再过滤
]
series: [{ datasetIndex: 1, ... }]   // 引用过滤后的
// 内置 transform：sort / filter / 纯自定义 transform 函数声明
```

多图联动共享（`dataset-link`）：同一 dataset 被多个实例引用时数据只存一份，更新一处全联动。`seriesLayoutBy: 'row'` 行列互转（系列按行而非按列展开，配合对象数组源）。

**测试影响**：transform 白名单内——L1 断 dataset 数组的 transform 配置形状；**变换后的值断在 L2**（`getOption().dataset` 拿到的是变换后产物）——首用实测回填。官方 demo：`data-transform-sort-bar`、`data-transform-multiple-pie`、`dataset-link`、`dataset-series-layout-by`。

## 性能

- 大数据折线/散点：`series.sampling: 'lttb'` + `large: true`，初始渲染关 `animation`。
- 流式更新：在既有实例上 `setOption({ series: [{ data }] })`（merge），勿每 tick 重 init 或 notMerge。
- 百万级点再考虑 `echarts-gl`（WebGL，独立依赖，按需引入）；百万级数据量另有 `appendData` 增量加载通道（不走 dataset，见 SKILL.md 白名单第 3 条）。
- 同页多图：共享一个 ResizeObserver、用 `echarts.connect` 复用联动。

## 官方手册

- 坐标/边距/outerBounds：`https://echarts.apache.org/zh/option.html#grid`、`https://echarts.apache.org/zh/option.html#grid.outerBoundsMode`、`https://echarts.apache.org/zh/option.html#grid.outerBoundsContain`
- 主题与配色：`https://echarts.apache.org/zh/option.html#color`、`https://echarts.apache.org/zh/option.html#backgroundColor`、`https://echarts.apache.org/zh/api.html#echarts.registerTheme`、`https://echarts.apache.org/zh/api.html#echarts.init`
- label/tooltip：`https://echarts.apache.org/zh/option.html#series-line.labelLayout`、`https://echarts.apache.org/zh/option.html#tooltip`、`https://echarts.apache.org/zh/option.html#tooltip.confine`、`https://echarts.apache.org/zh/option.html#tooltip.trigger`
- dataset transform：`https://echarts.apache.org/zh/option.html#dataset.transform`、`https://echarts.apache.org/zh/option.html#dataset.transform-filter`、`https://echarts.apache.org/zh/option.html#dataset.transform-sort`
- 性能：`https://echarts.apache.org/zh/option.html#series-line.sampling`、`https://echarts.apache.org/zh/option.html#series-bar.large`（`large` 只在散点/柱等系列上有，折线用 `sampling`）、`https://echarts.apache.org/zh/api.html#echartsInstance.appendData`
- v6 迁移：`https://echarts.apache.org/handbook/zh/basics/release-note/v6-upgrade-guide`

## 出处

本文件蒸馏自 `sentimony/skills@echarts`（MIT，v1.3.1）的工程规则，按本项目「设计图还原 + dataset 风格」重组。上游更新不自动同步。
