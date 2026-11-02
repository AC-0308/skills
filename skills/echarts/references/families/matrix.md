# matrix 族：矩阵坐标系（6.x 新增）

选族入口：`../chart-families.md`。**matrix 是坐标系不是系列**——声明 `matrix` 组件后，任意系列（heatmap/scatter/bar/line/pie/graph/k线…）挂 `coordinateSystem: 'matrix'` 进格子。设计稿形态是「矩阵卡片墙」：相关矩阵、混淆矩阵、微型图网格、周期表。

铁律 ❌（惯例 series.data）：官方 matrix 示例绝大多数走 `series.data`（6.1.0 目录 14 个 matrix 示例）；dataset 可用但非首选，只出现在少数示例里。数据变换照旧纯函数化进 L1。

## 数据形状 → option 骨架（已核实：官方示例源码）

```ts
matrix: {
  x: { data: ['A1', 'A2', { value: 'A3', children: ['A31', 'A32'] }] },  // 列类目树：可嵌套分组
  y: { data: ['U', 'V'] },
  top: 150, bottom: 150,       // 或 left/'center' + width: 900——组件尺寸像素直给
  // x/y 各自带 label/itemStyle/dividerLineStyle（格线样式）、backgroundStyle、body.itemStyle
}
visualMap: { type: 'continuous', min, max, dimension: 2 }   // 值通道取第 3 列
series: {
  type: 'heatmap',             // 或 scatter/bar/pie/graph...
  coordinateSystem: 'matrix',
  data: [['A1', 'U', 10], ['A1', 'V', 20], ['A2', 'U', 30]],  // [x格, y格, value] 三元组行
  label: { show: true },
}
```

**不用 encode**：matrix 系列的映射靠坐标元组语义（data 行 = x格/y格/值），encode 无参与点。visualMap 的 `dimension: 2` 指向三元组第 3 列。

## 五种典型形态

- **相关矩阵/协方差**（`matrix-correlation-heatmap/scatter`、`matrix-covariance`）：格=变量对，色/点编码相关值；`visualMap` 色阶 + `label.formatter: p => p.value[2].toFixed(2)`。
- **混淆矩阵**（`matrix-confusion`）：格=预测×真实，label 数值 + 对角高亮。
- **微型图网格 sparkline/mini-bar**（`matrix-sparkline`、`matrix-mini-bar-geo`）：格=迷你 series；mini-bar-geo 用每个格子挂一个小 bar series（`data: [[值, '']]`）+ 独立小坐标轴（grid 亦被 matrix 定位）。
- **周期表/关系强度表**（`matrix-periodic-table`、`matrix-mbti`）：格=自由 graphic 内容；**官方用 convertToPixel 拿格中心后注入 text/rect graphic**（见下）。
- **布局容器**（`matrix-grid-layout`）：`sectionCoordMap` 把任意组件/多系列塞进格子行列（如 `[0, [3, 4]]` = x 0 列、y 3~4 行合并），配 `media` query 响应式换行列数——「矩阵卡片墙」设计稿的正统还原通道。

## 还原设计图关键旋钮

行列树结构（分组→children 展开层级）；`dividerLineStyle.width: 0` 隐藏格线（周期表式干净画布）；`itemStyle.borderWidth` 格边框；`width/left/top` 组件尺寸像素直给；`backgroundStyle` 整块底色；label 显隐/字体。

## L1 纯函数测点

扁平行 → [x格, y格, value] 三元组变换（含行列笛卡尔补全——矩阵要的是全格覆盖，缺格是 L1 可断的业务决策）；相关系数计算；行列树构建；`sectionCoordMap` 的格坐标分配。

## L2 断言通道（convertToPixel 已核实支持）

- **`chart.convertToPixel({ matrixIndex: 0 }, [x格, y格])` → 格中心像素**（periodic-table 官方用法，finder 是 `matrixIndex` 而非 seriesIndex）；
- `getOption().matrix[0]` 断行列树/尺寸；
- 格内像素采样断色（`visualMap` 色阶）；
- graphic 注入后元素存在性断言（同 worked example 模式）。

## 确定性陷阱

- sparkline 网格多格动画相位差 → `animation: false`；
- 相关矩阵色阶范围随数据漂移 → `visualMap` 显式 min/max（同 parallel 族陷阱）；
- media query 响应式布局（grid-layout 模式）在固定 viewport 测试里取默认分支——断响应式分支须显式改 viewport 再断。

## 官方 demo

`matrix-simple`（嵌套行列树入门）、`matrix-correlation-heatmap`、`matrix-correlation-scatter`、`matrix-confusion`、`matrix-grid-layout`（sectionCoordMap 布局）、`matrix-sparkline`、`matrix-periodic-table`（convertToPixel+graphic 教学）、`matrix-mbti`、`matrix-stock`、`matrix-covariance`、`matrix-pie`、`matrix-graph`。

## 官方手册

- 配置项：`https://echarts.apache.org/zh/option.html#matrix`、`https://echarts.apache.org/zh/option.html#matrix.x`、`https://echarts.apache.org/zh/option.html#matrix.y`、`https://echarts.apache.org/zh/option.html#matrix.body`
- 示例：`https://echarts.apache.org/examples/zh/editor.html?c=<本族 demo 节里的 id>`（目录 `https://echarts.apache.org/examples/zh/index.html`，通用入口模板见 `../chart-families.md` 末节）
