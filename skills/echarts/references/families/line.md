# line 族：基础/堆叠/面积/阶梯/平滑

选族入口：`../chart-families.md`。铁律 ✅（dataset）。

## 数据形状 → option 骨架

时间序列二维表，`xAxis.type: 'time'` + `[timestamp, value]` 对（勿把日期预格式化成字符串类目轴）：

```ts
dataset: { source: [['date', '系列A', '系列B'], [1719800000000, 3, 2], ...] }
series: 系列列.map(name => ({ name, type: 'line', encode: { x: 'date', y: name } }))
```

- 堆叠：`stack: 'total'`。
- 面积：`areaStyle: {}`（配合堆叠构成层叠面积；`areaStyle.origin` 控制起点：`start`/`end`/`auto`）。
- 阶梯：`step: 'start' | 'middle' | 'end'`。
- 平滑：`smooth: true`（设计稿曲线感；还原以设计稿是否圆滑为准）。

## 还原设计图关键旋钮

线宽 `lineStyle.width`；虚线 `lineStyle.type: 'dashed'`；端点 `symbol: 'circle', symbolSize`（`showSymbol: false` 只显 hover 点）；多线颜色收敛进主题（option-recipes.md 配色节）；渐变面积 `areaStyle.color` 用 echarts `graphic.LinearGradient`。

## L1 纯函数测点

时间序列变换（补齐缺口行、聚合窗口）；encode/stack 形状；xAxis time 类型断言。

## L2 断言通道

convertToPixel：`chart.convertToPixel({ seriesIndex: 0 }, [ts, value])` 断趋势端点像素位置；dataZoom 后再断视窗内首点。tooltip 走 `trigger: 'axis'`，dispatchAction `showTip` 断内容。

## 确定性陷阱

- time 轴首末刻度标签随数据范围自适应 → 冻结时钟（`vi.setSystemTime`）+ 固定数据范围。
- 平滑曲线的贝塞尔采样点数不定 → 勿对 path 像素逐点断言，走端点像素 + L3 基线。

## 官方 demo

`line-simple`、`line-stack`、`area-stack-gradient`（渐变层叠面积）、`line-step`、`line-smooth`。

## 官方手册

- 配置项：`https://echarts.apache.org/zh/option.html#series-line`、`https://echarts.apache.org/zh/option.html#series-line.sampling`、`https://echarts.apache.org/zh/option.html#series-line.areaStyle`、`https://echarts.apache.org/zh/option.html#series-line.step`
- 示例：`https://echarts.apache.org/examples/zh/editor.html?c=<本族 demo 节里的 id>`（目录 `https://echarts.apache.org/examples/zh/index.html`，通用入口模板见 `../chart-families.md` 末节）
