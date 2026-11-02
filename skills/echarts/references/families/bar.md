# bar 族：基础/堆叠/极坐标/瀑布/象形柱

选族入口：`../chart-families.md`。铁律 ✅（全族 dataset）。

## 数据形状 → option 骨架

二维表，与 worked example 同构（见 `../worked-example/buildOption.ts`）：

```ts
dataset: { source: [['dimension', '段A', '段B'], ['甲', 3, 2], ['乙', 1, 2]] }
series: 段名列.map(name => ({ name, type: 'bar', stack: 'total', encode: { x: name, y: 'dimension' } }))
```

- 横向（条）：x 数值轴 + y 类目轴 + `yAxis.inverse: true`（见 worked example）。
- 纵向：交换 encode（`x: 'dimension'` 类目，`y: 段名`）。
- 并列（不堆叠）：删 `stack`；`barGap`（系列间）与 `barCategoryGap`（类目间）控制组内/组间密度。
- 极坐标柱：`polar: { radius, center }` + `angleAxis`（类目）+ `radiusAxis`（数值），series 写 `coordinateSystem: 'polar'`。树状/径向条带图形态。
- 瀑布：两个 series 交替——「占位柱」（透明 `itemStyle: { color: 'transparent' }`）与「实值柱」堆叠出台阶；数据变换（累计偏移）是纯函数，L1 直测。
- 象形柱 `pictorialBar`：`symbolRepeat` 平铺图标，`symbolSize` 图元尺寸。

## 还原设计图关键旋钮

固定柱宽 `series.barWidth`（像素）；柱底色 `showBackground: true` + `backgroundStyle`；圆角 `itemStyle.borderRadius`（数组可只圆顶角：`[r, r, 0, 0]`）；行尾合计 label 挂堆叠末段（worked example 的 `makeRowTotalLabel`）；坐标轴翻转 `yAxis.inverse`。

## L1 纯函数测点

`toDataset` 宽表/补零；瀑布累计偏移计算；行尾百分比 formatter；encode/stack 形状断言（无 series.data）。

## L2 断言通道

convertToPixel（直角系）：`chart.convertToPixel({ seriesIndex }, [值, 类目下标])` 断堆叠累计像素；极坐标柱同样支持（返回 [px, py] 极点像素）。canvas 墨迹、tooltip 走 dispatchAction（见 testing-layers.md）。

## 确定性陷阱

- 负值堆叠：零线下方单独堆叠，行尾 label 位置逻辑随符号变化——L1 覆盖正负混合用例。
- 极坐标柱的 `angleAxis.startAngle` 不设则取默认，还原时显式声明。

## 官方 demo

`bar-y-category`（横向条）、`bar-stack`、`bar-waterfall`（瀑布，双 series 占位法）、`bar-polar-real-estate`（极坐标）、`pictorialBar-vehicle`（象形，另有 8 个象形柱示例）。

## 官方手册

- 配置项：`https://echarts.apache.org/zh/option.html#series-bar`、`https://echarts.apache.org/zh/option.html#series-bar.markLine`、`https://echarts.apache.org/zh/option.html#series-bar.showBackground`、`https://echarts.apache.org/zh/option.html#series-pictorialBar`
- 示例：`https://echarts.apache.org/examples/zh/editor.html?c=<本族 demo 节里的 id>`（目录 `https://echarts.apache.org/examples/zh/index.html`，通用入口模板见 `../chart-families.md` 末节）
