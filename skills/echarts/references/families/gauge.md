# gauge 族：仪表盘/进度

选族入口：`../chart-families.md`。铁律 ❌（`series.data` 唯一通道）。虽然 gauge 也走 `createSeriesDataSimply`，但**实测 dataset 不可用**：两列 `name/value` 源会被取错列（值变成名称串、`title` 丢失），`encode` 被忽略；只有恰好单列时才"能跑"，不可依赖。无坐标系族，单值渲染。

## 数据形状 → option 骨架

```ts
series: [{
  type: 'gauge',
  min: 0, max: 100,
  startAngle: 210, endAngle: -30,      // 弧区间（设计稿首要还原点）
  radius: '80%',
  progress: { show: true, width: 12 },  // 进度弧
  axisLine: { lineStyle: { width: 12, color: [[1, '#e8e8e8']] } },  // 底弧
  axisTick/splitLine/pointer/anchor/detail/title: {...},
  data: buildGaugeData(values),        // 纯函数：[{ value: 76, name: '综合得分' }]
}]
```

- 进度条形态：`progress.show` + 宽度与 `axisLine` 同宽（现代仪表盘的干净做法）；
- `pointer.show: false`（无指针）+ `detail`（中心大字）是设计稿常见组合；
- 多环仪表：多个 series 同心（`radius` 递减）。

## 还原设计图关键旋钮

弧角度 `startAngle/endAngle`；`progress.width`、进度色 `progress.itemStyle`；刻度密度 `splitNumber` + `axisTick.distance`；`detail` 字号/颜色/`formatter`（百分号、单位）；锚点 `anchor`。

## L1 纯函数测点

value → 弧占比换算（若自绘分段）；detail formatter（76 → 「76%」）；多环 data 装配；分段色标 `axisLine.lineStyle.color` 的 `[[ratio, color]]` 数组构建（纯函数，段位断言）。

## L2 断言通道（无 convertToPixel）

`getOption().series[0].data` 断值；像素采样：沿弧半径向扫（中心 → 边缘）断进度色/底色交界角度≈value 对应角；`detail` 文案走组件 DOM 或像素区采样粗验，精确文案走 formatter 纯函数 L1。

## 确定性陷阱

- 进度动画（value 从 0 冲到目标）→ `animation: false`（否则 L2/L3 截在冲针中途）；
- `radius` 用百分比时依赖容器尺寸——容器尺寸已由 props 固定，保持。

## 官方 demo

`gauge`（基础）、`gauge-progress`（进度条形态）、`gauge-grade`（分段成绩）、`gauge-ring`。

## 官方手册

- 配置项：`https://echarts.apache.org/zh/option.html#series-gauge`、`https://echarts.apache.org/zh/option.html#series-gauge.progress`、`https://echarts.apache.org/zh/option.html#series-gauge.startAngle`、`https://echarts.apache.org/zh/option.html#series-gauge.detail`
- 示例：`https://echarts.apache.org/examples/zh/editor.html?c=<本族 demo 节里的 id>`（目录 `https://echarts.apache.org/examples/zh/index.html`，通用入口模板见 `../chart-families.md` 末节）
