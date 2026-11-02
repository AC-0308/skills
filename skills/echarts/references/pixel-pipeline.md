# pixel-pipeline：像素实测与两步渲染

设计稿要求像素级精确的布局（分组标识块、段内文字、精确间距）时读本文。核心思想：**先渲染，后测量，再注入**——ECharts 的轴/柱像素位置只有渲染后可知，与其猜，不如实测。

## 两步渲染管线

```
① setOption（柱/轴/图例，dataset 风格）→ getZr().flush()
② 实测像素（convertToPixel / display list）→ 计算布局 → 二次 setOption 注入 graphic → flush
```

```ts
chart.setOption(buildOption(rows))   // ①
chart.getZr().flush()                // 强制立即绘制，否则像素未定
const [x0] = chart.convertToPixel({ seriesIndex: 0 }, [cumulativeLo, bandIndex])
const [x1] = chart.convertToPixel({ seriesIndex: 0 }, [cumulativeHi, bandIndex])
// …按 x0/x1 计算 graphic 布局
chart.setOption({ graphic: { elements: [...] } })  // ② 注入
chart.getZr().flush()
```

graphic 元素（矩形/文本）可声明 `z` 控制层叠：压在柱下用 `z: 0`，盖在柱上用 `z: 10`。

## convertToPixel：值 → 像素

```ts
// 直角坐标系：[x 值, y 类目下标] → [xPx, yPx]
const [x, y] = chart.convertToPixel({ seriesIndex: 0 }, [value, categoryIndex])
```

- 堆叠段的像素区间：累计下界/上界分别 convert，差值即段宽。
- 类目下标是 **band 下标**：见下面 band 占位法。

## band 占位法（组间距精确控制）

y 轴类目数组里在组边界插入空串 `''` 占位行：

```ts
yAxis: { type: 'category', inverse: true, axisLabel: { interval: 0 }, data: [...withPlaceholders] }
```

- 空串行不绘制 label，但占据一个 band 高度——组间空档 = 占位数 × band 高。
- 容器高度按规格**先求和再设定**：`高度 = gridTop + gridBottom + Σ(柱宽 × 行数) + (行间空档 + 组间空档) × band 高`，取最低高度兜底。
- 行下标 → band 下标要过一个映射函数（跳过占位行），该函数是纯逻辑，进 L1。

## display list：label 的真实像素

y 轴 label 的实际渲染位置（比如「最左像素」）从 zrender display list 取（类型与坐标规则见下文两个实测坑）：

```ts
const list = chart.getZr().storage.getDisplayList(false)
for (const el of list) {
  if (el.type === 'tspan' && 按需匹配 el.style?.text) {   // ⚠ zrender 6：文本是 tspan，v5 之前才是 text
    const rect = el.getBoundingRect().clone()  // ⚠ 局部坐标
    const matrix = el.getComputedTransform()   // 已含父链（tspan → text → …）
    if (matrix) rect.applyTransform(matrix)    // 变换后才是画布坐标
  }
}
```

两个实测坑：

1. **文本元素类型**：echarts 6 / zrender 6 把 `Text` 拆成 `tspan` 子元素进 display list，`el.type === 'text'` 一个都进不去（badge 类注入会静默变成零个）。同时兼容 v5 的写法是 `el.type === 'tspan' || el.type === 'text'`。
2. **局部坐标**：`getBoundingRect()` 返回局部坐标，必须先 `getComputedTransform()` 再叠加变换，否则拿到的是错位矩形。

## 矩阵叠加：局部坐标 → 画布坐标

`getBoundingRect()` 是局部坐标，警告不算做法，叠加的可执行模式是：

```ts
// zrender BoundingRect 自带 applyTransform（就地变换）
const el = /* display list 元素 */
const rect = el.getBoundingRect().clone()       // 局部坐标，clone 防污染原元素
const m = el.getComputedTransform()
if (m) rect.applyTransform(m)                    // 局部 → 父链 → 画布（无变换时 m 为 null，必须 guard）
// 变换含旋转时矩形可能变斜：四角逐点变换后取 min/max 更稳
const corners = [[rect.x, rect.y], [rect.x + rect.width, rect.y],
                 [rect.x, rect.y + rect.height], [rect.x + rect.width, rect.y + rect.height]]
const xs = corners.map(([x, y]) => m[0] * x + m[2] * y + m[4])  // 手工矩阵乘
const ys = corners.map(([x, y]) => m[1] * x + m[3] * y + m[5])
const left = Math.min(...xs), top = Math.min(...ys)
```

## graphic 元素语法骨架

`setOption({ graphic: { elements: [...] } })`。**图元清单、各图元的 shape 必填项、定位/层叠/对齐分组、style 通用项 → `shapes.md`**（这里有 graphic 与 custom 系列的差异：`path`/`compoundPath` 只在 custom 系列可用）。本节只讲注入语义。

- `group` 用 `children` 组合；`z/zlevel` 控层叠（系列图元 z≈2~3，压柱下 z:0、盖柱上 z:10）。
- **`id` + `$action` 是注入的生命周期**：无 id 每次注入视为新元素→**堆叠累积**（经典 bug）；带 id 默认 `$action: 'merge'` 按 id 原位更新；`'remove'` 删除、`'replace'` 重建、`'show'/'hide'` 显隐。merge 模式重注入时：现存 id 走 merge、消失的 id 发 `{ id, $action: 'remove' }`。整套 option 走 `notMerge` 重建时 graphic 已被清零，**不需要再补 remove**（worked example 即此形态，别叠两层逻辑）。
- **`getOption().graphic` 是摊平列表**：`elements` 里 group 与它的子元素平铺（子元素 id 是生成值如 `\0series\01\00`、靠 `parentId` 认亲，组上的 `z` 不复制给子元素）。断言要按 `type` + 自己的 id 前缀收窄，别拿 `elements.length` 当“注入个数”。
- 事件隔离：注入的块一律 `silent: true`，否则会吞鼠标、挡掉下层 tooltip（各旋钮见 `shapes.md` 交互组）。拖拽/旋转属于 graphic 高级态，还原设计稿少用。
- **动画与测试相冲**：`transition` / `keyframeAnimation` 驱动的动画帧序列是声明式给出的（写法见 `shapes.md`），但动画期间像素不定——断言前 `animation: false` 或直接断终态（`getOption().graphic` 的形状/id 不受动画影响）；加载/波浪类无限循环动画同 effectScatter 涟漪待遇：L3 基线跳过或 mask，L2 只断结构。动画一律声明式，**勿在注入代码里手写 rAF**（同 custom 族 renderItem 的陷阱）。

## 自定义块的布局计算三段式

分组标识块/段内标注块的高度与边界计算，收敛成一个 L1 可纯测的函数：

```ts
// ① 自适应：块高 = max(几何需求, 最小值, 文字需求（行数×行高 + 上下内边距））
const height = Math.max(geomHeight, MIN, lines * lineHeight + padding * 2)
// ② 对称扩展：围绕几何中心上下各半（块高超出几何时居中长出，不偏斜）
const center = (top + bottom) / 2
const [t, b] = [center - height / 2, center + height / 2]
// ③ 边界钳制：下缘越界（如超过 grid 底）→ 上移补足，再夹住上缘
if (b > limitBottom) { const d = b - limitBottom; return [t - d, limitBottom] }
return [Math.max(t, 0), b]
```

三段各自独立可测；「间距类」计算（band 占位、容器高度求和）见上文 band 占位法——两者合起来就是自定义块的全部几何决策。

## 文字测量（截断/自适应）

```ts
const ctx = document.createElement('canvas').getContext('2d')!
ctx.font = '12px sans-serif' // 必须与渲染声明一致，否则测宽失真
const w = ctx.measureText(text).width
```

规则：可用宽 = 容器宽 − 左右内边距；放得下→原文；放不下→贪婪保留前缀 + `…`；连 `…` 都放不下→空串不渲染。

## SSR SVG 与客户端导出

报表/邮件/OG 图（Node 环境无 DOM）：

```ts
const chart = echarts.init(null, null, { renderer: 'svg', ssr: true, width, height })
chart.setOption(option)
const svg = chart.renderToSVGString()
chart.dispose()
```

option 构建器与浏览器共用时，两处 `echarts.use([...])` 注册集合必须覆盖同一范围——服务端注册更窄会静默缺组件。

客户端导出：`chart.getDataURL({ pixelRatio: 2, backgroundColor: '#fff' })`（产物分辨率翻倍）；用户侧一键保存走 `toolbox: { feature: { saveAsImage: { pixelRatio: 2 } } }`（工具栏属通用组件，与铁律无关）。导出像素断言即 L2 的 canvas 墨迹采样同通道。

## 官方手册

- graphic 元素（含各图元的 shape/定位/动画）：`https://echarts.apache.org/zh/option.html#graphic`、`https://echarts.apache.org/zh/option.html#graphic.elements`、`https://echarts.apache.org/zh/option.html#graphic.elements-group`、`https://echarts.apache.org/zh/option.html#graphic.elements-text`
- 值↔像素：`https://echarts.apache.org/zh/api.html#echartsInstance.convertToPixel`、`https://echarts.apache.org/zh/api.html#echartsInstance.convertFromPixel`
- 导出与 SSR：`https://echarts.apache.org/zh/api.html#echartsInstance.getDataURL`、`https://echarts.apache.org/zh/api.html#echartsInstance.renderToSVGString`、`https://echarts.apache.org/handbook/zh/how-to/cross-platform/server`
- 图元清单与各图元必填项：`shapes.md`

## 出处

两步渲染/实测模式为 ECharts 通用工程实践（蒸馏自 `sentimony/skills@echarts` MIT 的 flush/lifecycle 规则 + zrender display list 用法）。
