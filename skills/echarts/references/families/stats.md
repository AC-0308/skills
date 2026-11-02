# stats 族：K线/箱线

选族入口：`../chart-families.md`。铁律 ✅（candlestick 官方支持 dataset；boxplot 亦走 dataset——注意 boxplot 的 L1 变换是把原始观察值先算成五数概括）。

## 数据形状 → option 骨架

K线：日期列 + 开/收/低/高四数值列：

```ts
dataset: { source: [['date', 'open', 'close', 'low', 'high'], ['2024-01', 232, 210, 190, 260], ...] }
series: [{ type: 'candlestick', encode: { x: 'date', y: ['open', 'close', 'low', 'high'] } }]
```

- encode y 是**四列数组**（顺序固定 open/close/low/high）；`itemStyle` 分别配色阳线/阴线（`color` 阳、`color0` 阴、`borderColor/borderColor0`）。
- 箱线：`type: 'boxplot'`，data 每行 `[min, Q1, median, Q3, max]`（五数概括）+ 类目轴；原始观察 → 五数是 L1 纯函数（分位数算法选型也在这层定）。须单 series 承载全部行（勿按类目拆多 series）。
- 常配 markLine 均线/网格（SKILL.md 白名单第 2 类，不含业务数据可 series 外声明）。

## 还原设计图关键旋钮

K线阳阴色对（设计稿的红绿/绿红习惯直给 `itemStyle`）；烛芯宽 `barWidth`（K 线即柱宽）；箱线 `boxWidth`；离群点 `boxplot` 需要另配 scatter series（离群值列表由 L1 变换产出）。

## L1 纯函数测点

五数概括（含分位数插值方式的选定）；离群值摘取（1.5×IQR 规则）；K线涨跌派生列；encode 形状（boxplot 的 y 数组序、candlestick 四列序）。

## L2 断言通道

convertToPixel：K线 `[日期, close]` 断收盘线像素；箱线 `[类目, median]` 断中位线；涨跌色像素采样（阳线区域采样断 `itemStyle.color`）。

## 确定性陷阱

- K线时间轴 dataZoom 常驻 → 测试显式定 `dataZoom.startValue/endValue`，勿用百分比（随数据量漂移）；
- 箱线离群点 scatter 是另一 series，勿因「数据在两个 series」误判铁律违规——boxplot 主 series 走 dataset，scatter 离群点是白名单第 2 类标注性质（或独立 dataset）。

## 官方 demo

`candlestick-sh-2015`（标准 K 线）、`candlestick-sh`（另有 brush 类组合示例见 catalog）、`boxplot-light-velocity` / `boxplot-light-velocity2`（光速箱线）。

## 官方手册

- 配置项：`https://echarts.apache.org/zh/option.html#series-candlestick`、`https://echarts.apache.org/zh/option.html#series-candlestick.itemStyle`、`https://echarts.apache.org/zh/option.html#series-boxplot`、`https://echarts.apache.org/zh/option.html#series-boxplot.boxWidth`
- 示例：`https://echarts.apache.org/examples/zh/editor.html?c=<本族 demo 节里的 id>`（目录 `https://echarts.apache.org/examples/zh/index.html`，通用入口模板见 `../chart-families.md` 末节）
