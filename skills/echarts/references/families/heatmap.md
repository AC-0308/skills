# heatmap 族：直角热力/日历

选族入口：`../chart-families.md`。铁律 ✅/日历例外（直角热力走 dataset；`coordinateSystem: 'calendar'` 的热力**实测 dataset 静默失效**——6.1.0 下 dataset 版 SVG 与空数据版字节完全相同，故日历热力必须 `series.data`）。

## 数据形状 → option 骨架

直角热力：二维表 x/y/value 三列：

```ts
dataset: { source: [['hour', 'day', 'value'], [0, '周一', 12], ...] }
series: [{
  type: 'heatmap',
  encode: { x: 'hour', y: 'day', value: 'value' },
  visualMap: { min, max, calculable: false, inRange: { color } },  // visualMap 声明在 option 顶层的组件区
}]
```

日历热力：`calendar: { range, cellSize, orient }` + series `data: [[date, value], ...]`（L1 纯函数生成日期对）。

## 还原设计图关键旋钮

色阶（visualMap `inRange.color` 数组，与设计稿色板逐色对）；直角热力格子感 `itemStyle.borderColor + borderWidth`（白描边断格，还原表格感的关键）；`emphasis` 格子高亮色；日历 `cellSize: [20, 20]`（像素直给）、`splitLine`、月份/星期标签 `dayLabel/monthLabel`。

## L1 纯函数测点

直角热力：补全稀疏格（缺 x/y 组合填 0 或 null——填什么决定渲染空白 vs 跳过，纯函数里决策可测）；日历：日期对生成与 range 裁剪；色值归一映射（value → 色阶插值，自绘时用）。

## L2 断言通道

- 直角热力：convertToPixel `[hour, day]` 断格子像素；visualMap 断 `getOption().visualMap[0].inRange.color`；
- 日历：无 grid 坐标 → 像素采样（沿行扫断色带）+ `getOption().calendar[0].range` 断言。

## 确定性陷阱

- 日历 range 若用相对日期（「今年」「近 30 天」）→ 测试冻结时钟 + 显式 range（`['2024-01-01', '2024-12-31']`）；
- visualMap `calculable: true` 出拖拽手柄，L3 截图含手柄像素——还原设计稿无手柄时关掉。

## 官方 demo

`heatmap-cartesian`（直角热力）、`heatmap-large`（大数据量）、`calendar-heatmap`（GitHub 风格贡献图）。

## 官方手册

- 配置项：`https://echarts.apache.org/zh/option.html#series-heatmap`、`https://echarts.apache.org/zh/option.html#series-heatmap.itemStyle`、`https://echarts.apache.org/zh/option.html#calendar`、`https://echarts.apache.org/zh/option.html#calendar.range`
- 示例：`https://echarts.apache.org/examples/zh/editor.html?c=<本族 demo 节里的 id>`（目录 `https://echarts.apache.org/examples/zh/index.html`，通用入口模板见 `../chart-families.md` 末节）
