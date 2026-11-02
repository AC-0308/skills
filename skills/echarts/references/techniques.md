# techniques：非标准技法（逃生舱轴心）

设计稿的需求超出本族标准形态时查本文。每条技法必须回答「它还原了什么」才收录；路由表先走，指针域不重复收录（single source of truth）。

| 设计需求 | 技法 | 落点 |
|---|---|---|
| 柱+线同图、左右双轴 | 混搭与双轴 | 本文 ① |
| 阈值线、目标区间、重点点标注 | markPoint/Line/Area | 本文 ② |
| 段内多行多色文字排版 | 富文本 rich label | 本文 ③ |
| 点击画布反查数据域（下钻入口） | convertFromPixel | 本文 ④ |
| 编程联动（外部触发高亮/选中/缩放） | dispatchAction + 事件 | 本文 ⑤ |
| 年份/状态切换器 + 数据过渡 | timeline 状态机 | 本文 ⑥ |
| 框选联动过滤 | brush 刷选 | 本文 ⑦ |
| 移动端/内存敏感产线换渲染器 | SVG renderer | 本文 ⑧ |
| 面积/进度弧渐变 | LinearGradient/RadialGradient | option-recipes.md 配色节（已收拢） |
| 截图保存/报表出图 | getDataURL / saveAsImage | pixel-pipeline.md「SSR 与客户端导出」节 |
| 实时流式追加 | appendData | option-recipes.md 性能节（铁律白名单 3） |
| 无原生形态自绘 | renderItem | families/custom.md |

## ① 混搭与双轴

**还原什么**：柱表量值 + 折线表比率叠在一张图（BI 面板标配形态）。

```ts
dataset: { source: [['月', '销量', '增速'], ['1月', 320, 0.12], ...] }
yAxis: [{}, { type: 'value', axisLabel: { formatter: '{value}%' } }]  // 右轴
series: [
  { type: 'bar', encode: { x: '月', y: '销量' } },
  { type: 'line', yAxisIndex: 1, encode: { x: '月', y: '增速' } },   // 双系列共用一个 dataset——铁律仍成立
]
```

**测试影响**：L1 断 encode/yAxisIndex 形状（两系列零 series.data）；L2 convertToPixel 各自 seriesIndex 自动映射到各自轴；`axisPointer: { link: [{ xAxisIndex: 'all' }] }` 联动悬停时 tooltip 断言按轴分组。demo：`mix-line-bar`、`multiple-y-axis`。

## ② 标注三件套 markPoint / markLine / markArea

**还原什么**：阈值线、达标区间（背景色带）、极值点标记——设计稿上叠在图上的「评注层」。

```ts
series: [{
  ...,
  markLine: { symbol: 'none', lineStyle: { color: '#f5222d', type: 'dashed' },
              data: [{ yAxis: 3.5, label: { formatter: '目标 3.5' } }] },  // SKILL.md 白名单 2：纯标注
  markArea: { itemStyle: { color: 'rgba(47,194,91,0.08)' },
              data: [[{ yAxis: 3 }, { yAxis: 4 }]] },
  markPoint: { data: [{ type: 'max', name: '峰值' }] },   // 极值标记，值来自数据
}]
labelLayout: { hideOverlap: true },  // 全局标签避让（label 互压时自动隐藏次者）
```

**测试影响**：markLine/markArea 阈值进 option → L1 直断形状；markPoint `type:'max'` 的取值是渲染期计算 → L2 断 `getOption()` 或交给像素采样；`labelLayout.hideOverlap` 是渲染期避让，跨数据量漂移——勿逐点断言，交 L3 护栏。手册：`option.html#series-line.markLine`、`option.html#labelLayout`。

## ③ 富文本 rich label

**还原什么**：段内多行多色文字（大号百分比 + 小号说明），饼心/环心/段内的设计稿排版。

```ts
label: {
  formatter: () => '{big|76%}\n{small|综合得分}',
  rich: {
    big: { fontSize: 18, fontWeight: 'bold', color: '#222', lineHeight: 24 },
    small: { fontSize: 11, color: '#999', lineHeight: 14 },
  },
}
```

`{样式名|文本}` 片段 + rich 样式表；`{c}`/`{d}` 占位符可与片段混用。**测试影响**：formatter 输出串是纯函数 → L1 断字符串（含转义/截断）；排版像素（换行/行高/对齐）交 L3；字体测量坑同 pixel-pipeline 文字测量节（font 声明与渲染一致）。手册：`option.html#series-pie.label.rich`。

## ④ convertFromPixel：像素 → 数据域

**还原什么**：点击画布空白处反查类目/值域（下钻入口、自制轴区间选择）——数据点点击有 `params.dataIndex`，画布级点击必须反查。

```ts
chart.getZr().on('click', (e) => {
  const [x, y] = [e.offsetX, e.offsetY]
  const [value, categoryIndex] = chart.convertFromPixel({ seriesIndex: 0 }, [x, y]) as [number, number]
  emit('drill', { value, categoryIndex })  // 纯数据出口，可测
})
```

**测试影响**：L2 直接调用实例断 round-trip 互逆（`convertFromPixel(convertToPixel(v)) ≈ v`，浮点容差）；zr 事件 handler 里不做业务决策，把反查结果作为 emit 出口——事件回调本身进不了 L1。手册：`api.html#convertFromPixel`。

## ⑤ dispatchAction + chart.on 事件全谱

**还原什么**：编程联动——点击表格行高亮图内对应系列、外部按钮缩放 dataZoom、legend 状态同步到路由。

```ts
// 编程触发（L2 主通道）
chart.dispatchAction({ type: 'highlight', seriesIndex: 0, dataIndex: 2 })
chart.dispatchAction({ type: 'showTip', seriesIndex: 0, dataIndex: 0 })
chart.dispatchAction({ type: 'legendToggleSelect', name: '准确' })
chart.dispatchAction({ type: 'dataZoom', startValue, endValue })
// 订阅（联动出口）
chart.on('legendselectchanged', (e) => sync(e.selected))
chart.on('datazoom', (e) => sync(e.start, e.end))
chart.on('click', (e) => e.dataIndex !== undefined && emit('drill', e.data))
```

action 清单还有 `downplay / select / unselect / hideTip / treemapZoomToNode / treeExpandAndCollapse / timelineChange`。**测试影响**：L2 断言走「dispatchAction → getOption/事件监听器捕获」两通道；`highlight` 状态在实例残留 → 测试收尾 `downplay` 或重挂载；`brushselected` 事件 payload 见 ⑦。手册：`api.html#action`、`api.html#events`。

## ⑥ timeline 状态机 + 数据过渡

**还原什么**：年份/版本切换器 + 各状态一整套 option（含平滑过渡动画），「一个图表讲多个时期」。

```ts
const option = {
  baseOption: { timeline: { data: ['2023', '2024', '2025'], autoPlay: false, currentIndex: 0 },
                 ...公共骨架 },
  options: [ { series: [{ encode: {...} }] }, {...2024 帧}, {...2025 帧} ],  // 各帧差异，可由纯函数生成
}
// 编程切状态（测试与外部切换器同通道）：
chart.dispatchAction({ type: 'timelineChange', currentIndex: 1 })
```

轻量替代（无 timeline 组件）：整表替换 `setOption(新option)` + `animationDurationUpdate: 300`，ECharts 自动 diff 数据做过渡（merge 模式下图形过渡，`notMerge` 则整图重建动画）。**测试影响**：`autoPlay` 必关；过渡动画期间像素不定 → 断言前 `flush` + `animation: false`（或 `animationDurationUpdate: 0`）；各帧 option 的数据构建纯函数化 → L1 断每帧 encode/数据差异。手册：`option.html#timeline`。

## ⑦ brush 刷选

**还原什么**：框选一批数据点联动过滤（联动表格/其他图表），BI 探索交互。

```ts
option.brush: {
  toolbox: ['rect', 'polygon', 'lineX', 'keep'],  // 框形/多边形/横向/追加
  brushLink: 'all',        // 多图实例间共享选区（耦合！见测试影响）
  inBrush: { opacity: 1 }, outOfBrush: { opacity: 0.2 },  // 选内/选外视觉
  throttleType: 'debounce', throttleDelay: 60,
}
chart.on('brushselected', (e) => e.batch[0].selected[0].dataIndex)  // 选区数据出口
// 清空选区：dispatchAction({ type: 'brush', areas: [] })
```

入口也可走 `toolbox.feature.brush`（工具栏按钮）。**测试影响**：选区状态残留在实例上 → 每测试收尾 `dispatchAction({ type:'brush', areas: [] })`；`brushLink` 把多图选区耦合在一起，独立断言某图时先解链；L2 断 `brushselected` payload 的 `dataIndex` 数组（监听器捕获 + 程序触发框选）。手册：`option.html#brush`、`api.html#events.brushselected`。

## ⑧ SVG 渲染器

**还原什么**：不还原视觉——产线工程选项：移动端/内存敏感场景换 SVG 渲染（DOM 节点式绘制、内存占用低、可矢量导出）。

```ts
const chart = echarts.init(el, theme, { renderer: 'svg' })  // init 期定死，不可运行时切换
```

**测试影响**：renderer 是 init 参数——换 renderer 须 dispose 重 init；**测试通道跟随产线**（产线 canvas 测 canvas、产线 svg 测 svg，勿用 SVG 的可查询 DOM 做仅 SVG 断言再发 canvas 产物）；testing-layers 的断言通道选型基于 canvas，SVG 下「canvas 墨迹采样」换成「svg DOM 判空」。大数据/特效场景 SVG 性能劣于 canvas（decision 树：先测后换）。SSR 场景见 pixel-pipeline「SSR 与客户端导出」。

## 官方手册

- 标注：`https://echarts.apache.org/zh/option.html#series-line.markLine`、`https://echarts.apache.org/zh/option.html#series-line.markArea`、`https://echarts.apache.org/zh/option.html#series-line.markPoint`、`https://echarts.apache.org/zh/option.html#series-line.labelLayout`
- 富文本：`https://echarts.apache.org/zh/option.html#series-pie.label.rich`、`https://echarts.apache.org/zh/option.html#series-pie.label`
- 反查 / 编程交互：`https://echarts.apache.org/zh/api.html#echartsInstance.convertFromPixel`、`https://echarts.apache.org/zh/api.html#echartsInstance.dispatchAction`、`https://echarts.apache.org/zh/api.html#echartsInstance.on`、`https://echarts.apache.org/zh/api.html#action`、`https://echarts.apache.org/zh/api.html#events`
- timeline / brush：`https://echarts.apache.org/zh/option.html#timeline`、`https://echarts.apache.org/zh/option.html#brush`
- 渲染器与导出：`https://echarts.apache.org/zh/api.html#echarts.init`、`https://echarts.apache.org/zh/api.html#echartsInstance.getDataURL`、`https://echarts.apache.org/handbook/zh/how-to/cross-platform/server`

## 出处

各技法均以官方手册/示例为准（链接随条目）；混搭/标注/富文本的收录框架参考官方「特性」页能力清单。
