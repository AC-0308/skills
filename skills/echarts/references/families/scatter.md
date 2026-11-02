# scatter 族：散点/涟漪/气泡

选族入口：`../chart-families.md`。铁律 ✅（dataset，effectScatter 亦官方支持）。

## 数据形状 → option 骨架

二维表，一列一维度，encode 映射到轴与视觉通道：

```ts
dataset: { source: [['x', 'y', 'size'], [10, 84, 30], [20, 62, 15], ...] }
series: [{ type: 'scatter', encode: { x: 'x', y: 'y' }, symbolSize: data => ...) }]
```

- 气泡（尺寸通道）：`encode` + `symbolSize`（读列值，纯函数可 L1）；颜色通道用 `visualMap`。
- 涟漪 `effectScatter`：`rippleEffect: { scale, brushType }`。
- 多系列分组：每个分组列一个 series，或单 series + `visualMap` 按列分色。
- 直方图（分布）：先纯函数分桶（bin 边界），再走 bar 渲染——分桶逻辑是 L1 主战场。

## 还原设计图关键旋钮

点形 `symbol`（`circle/rect/triangle/diamond` + 自定义 SVG path）；`itemStyle.opacity`（密集散点半透明是惯例）；轴起点 `xAxis.min`（散点默认不从 0 起，还原设计稿留白时显式设）。

## L1 纯函数测点

分桶边界；symbolSize 映射函数；encode 形状（x/y/size 列名）。

## L2 断言通道

convertToPixel：`chart.convertToPixel({ seriesIndex: 0 }, [x值, y值])` 断任意数据点像素；visualMap 色阶断 `getOption().visualMap[0].min/max`。

## 确定性陷阱

- effectScatter 涟漪动画无限循环 → 测试中关 `rippleEffect` 或 `animation: false`；L3 基线必然截在动画某帧，涟漪图只做 L2 + 像素采样、基线跳过或 mask。
- 大数据散点开了 `large: true` 时 symbolSize 函数式失效（走统一渲染路径）——还原设计稿的大小通道时勿开 large。

## 官方 demo

`scatter-simple`、`bubble-gradient`（气泡渐变）、`scatter-effect`（涟漪）。

## 官方手册

- 配置项：`https://echarts.apache.org/zh/option.html#series-scatter`、`https://echarts.apache.org/zh/option.html#series-scatter.symbolSize`、`https://echarts.apache.org/zh/option.html#series-effectScatter`、`https://echarts.apache.org/zh/option.html#series-effectScatter.rippleEffect`
- 示例：`https://echarts.apache.org/examples/zh/editor.html?c=<本族 demo 节里的 id>`（目录 `https://echarts.apache.org/examples/zh/index.html`，通用入口模板见 `../chart-families.md` 末节）
