# flow 族：桑基/关系图/和弦图

选族入口：`../chart-families.md`。铁律 ❌（官方不支持 dataset，`series.data` 唯一通道）。无坐标系族，布局迭代自算——**像素断言受限族**。

## 数据形状 → option 骨架

nodes/edges 分离：

```ts
series: [{
  type: 'sankey',
  emphasis: { focus: 'adjacency' },
  nodeAlign: 'justify', nodeGap: 12, nodeWidth: 16,
  data: buildNodes(raw),       // 纯函数：{ name, itemStyle? }
  links: buildLinks(raw),      // 纯函数：{ source, target, value }
}]
```

- 桑基 layoutIterations 越多越稳定；`nodeAlign`（justify/left/right）影响泳道对齐；`nodeWidth/nodeGap` 直控设计稿密度。
- 关系图 `graph`：`layout: 'none'`（自给坐标 `x/y`）或 `'force'`（力导向，`force.repulsion/gravity`）；`categories` + `legend` 联动分色；`edgeSymbol: ['circle', 'arrow']` 边箭头。

## 和弦图（chord，6.x 新增系列）

数据形状与桑基同构（nodes + 边表），骨架：

```ts
series: [{
  type: 'chord',
  minAngle: 1,                       // 极小扇区兜底，防 0 值扇区视觉消失
  nodeWidth: 10,                      // 弧段宽度（像素）
  label: { show: true },
  data: buildNodes(raw), links: buildLinks(raw),  // 与桑基共用同一套纯函数
  linkStyle: { color: 'gradient' },   // 边色可编码方向/强度（chord-lineStyle-color）
}]
```

- 关系强度编码：边宽映射 `link.value` + 边色；节点扇区弧长 = 流量占比。
- L1：buildNodes/buildLinks 与桑基同套复用（增同名边聚合、双向合并）；chord 专属：minAngle/nodeWidth 形状断言。
- L2：`getOption().series[0].links` 断结构；极坐标环形态无 convertToPixel → 像素采样断弧段/弦色；dispatchAction highlight 断邻接高亮（同桑基）。
- 确定性：入场展开动画关；`minAngle` 不设则微扇区视觉漂移；官方 demo `chord-simple`、`chord-minAngle`、`chord-lineStyle-color`、`chord-style`。
- graph 的 force 布局**跨运行不确定**：迭代收敛位置随初值变 → 要像素级断言时用 `layout: 'none'` + 显式坐标。

## 还原设计图关键旋钮

桑基节点色 `data[].itemStyle.color`（桑基不自动分色，逐节点给）；边色 `links[].lineStyle.color: 'gradient'`（source→target 渐变）；graph 边宽映射 `lineStyle.width: (v) => ...`；`label.position` 节点标签侧。

## L1 纯函数测点

buildNodes/buildLinks（原始数据 → 节点/边）；流量聚合（同名边合并）；graph categories 指派；桑基 value 单位换算。

## L2 断言通道（无 convertToPixel）

- `getOption().series[0].data/links` 断结构（主通道）；
- focus 高亮交互：dispatchAction `highlight` + 像素采样断邻接边变色；
- 桑基若须像素级：固定 layoutIterations + 同一输入（稳态可复现），先在两台机器跑两次确认基线稳定再入库。

## 确定性陷阱

- force 布局勿做像素断言与 L3 基线（同数据不同帧）→ 测试用 `layout: 'none'` 坐标版，产线用力导向版，`props.deterministic` 切换；
- 桑基节点重叠自动微调 → `layoutIterations: 0` 可关迭代（产线慎用）。

## 官方 demo

`sankey-energy`（能源流经典）、`sankey-levels`（层级）、`graph-force`（力导向）、`graph-circular-layout`（环布局）、`graph-webkit-dep`（categories 分色）。

## 官方手册

- 配置项：`https://echarts.apache.org/zh/option.html#series-sankey`、`https://echarts.apache.org/zh/option.html#series-sankey.layoutIterations`、`https://echarts.apache.org/zh/option.html#series-graph`、`https://echarts.apache.org/zh/option.html#series-lines`、`https://echarts.apache.org/zh/option.html#series-chord`、`https://echarts.apache.org/zh/option.html#series-chord.links`
- 示例：`https://echarts.apache.org/examples/zh/editor.html?c=<本族 demo 节里的 id>`（目录 `https://echarts.apache.org/examples/zh/index.html`，通用入口模板见 `../chart-families.md` 末节）
