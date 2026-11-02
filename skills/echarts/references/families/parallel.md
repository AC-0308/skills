# parallel 族：平行坐标

选族入口：`../chart-families.md`。铁律 ✅（官方支持 dataset）。

## 数据形状 → option 骨架

每行一个样本、每列一个维度轴：

```ts
dataset: { source: [['指标A', '指标B', '指标C'], [30, 80, 45], ...] }
parallelAxis: [
  { dim: 0, name: '指标A', min, max },   // 每列一轴
  { dim: 1, name: '指标B' },
]
series: [{ type: 'parallel', lineStyle: { width, opacity }, encode: ... }]
```

- 多行共享一 series（折线束）；分组着色：多 series（每组一束）+ `visualMap` 或 per-series `color`。
- `parallel: { left, right, top, bottom, layoutOrientation }` 全局布局。

## 还原设计图关键旋钮

轴序 = 列序（还原时按设计稿重排列序——数据变换纯函数）；`lineStyle.opacity`（束线半透明叠出密度感，惯例 0.25~0.5）；轴刻度反转 `parallelAxis[].inverse`（如成本越低越好）。

## L1 纯函数测点

列重排（设计稿轴序 ≠ 数据列序）；分组拆行（一宽表 → 多 series 数据）；轴 min/max 摘取函数。

## L2 断言通道

convertToPixel（平行系支持）：`chart.convertToPixel({ seriesIndex: 0 }, [30, 80, 45])` 断折线顶点像素；`getOption().parallelAxis` 断轴序与 inverse。

## 确定性陷阱

- 轴 min/max 不显式给则随数据自动推算 → 换一行数据全部折线跳动；测试与产线均显式 min/max（从设计稿/数据规格取）。
- 束线 hover 高亮 `emphasis.focus` 状态在实例残留 → 测试重挂载。

## 官方 demo

`parallel-simple`、`parallel-aqi`（双 series 分城市）、`parallel-nutrients`（visualMap 着色）。

## 官方手册

- 配置项：`https://echarts.apache.org/zh/option.html#series-parallel`、`https://echarts.apache.org/zh/option.html#series-parallel.lineStyle`、`https://echarts.apache.org/zh/option.html#parallelAxis`
- 示例：`https://echarts.apache.org/examples/zh/editor.html?c=<本族 demo 节里的 id>`（目录 `https://echarts.apache.org/examples/zh/index.html`，通用入口模板见 `../chart-families.md` 末节）
