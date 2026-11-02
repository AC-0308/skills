# hierarchy 族：treemap/旭日/树

选族入口：`../chart-families.md`。铁律 ❌（官方不支持 dataset，`series.data` 是唯一通道）。无坐标系族。

## 数据形状 → option 骨架

嵌套树 `{ name, value, children: [...] }[]` 进 `series.data`：

```ts
series: [{
  type: 'treemap',
  roam: false, leafDepth: 1,
  levels: [{ /* level 索引层样式 */ }, { itemStyle: { gapWidth } }],
  label: { upperLabel: { show: true } },
  data: buildTree(raw),  // 构建函数保持纯：L1 直测
}]
```

- treemap：`roam`（缩放拖拽）、`leafDepth`（下钻层级）、`breadcrumb`（面包屑导航）、`levels[]`（每层样式：边距/描边/上标签）。
- 旭日 `sunburst` 系列：`levels` 控制半径环带与分色；内环=父级。
- 树 `tree`：`orient`（LR/RL/TB/BT）、`symbolSize`、`initialTreeDepth`、`expandAndCollapse`；节点位置由布局器算，`nodeClick` 行为可设。
- 树边样式：`lineStyle.curveness`；增强边 `emphasis` 联动。

## 还原设计图关键旋钮

treemap 矩形间隙 `itemStyle.borderColor + borderWidth`（白线断块）；旭日环带宽度按层级（`levels[].r` 数组显式给像素）；树叶色阶 `visualMap` 或 per-node `itemStyle.color`（色计算纯函数化）。

## L1 纯函数测点

`buildTree`：扁平行 → 嵌套树（分组/聚合/求和）；色阶按值归一；树节点 path 构建；**形状断言改为 series.data 的树**（铁律不适用，但纯度照旧——treemap/sunburst/tree 的 data 树构建不 import echarts）。

## L2 断言通道（无 convertToPixel）

- `getOption().series[0].data` 断树形状（与 buildTree 输出一致）；
- 像素采样：treemap 断矩形块边界色变；旭日断径向环带色变；
- 下钻/展开交互：dispatchAction `treemapZoomToNode` / tree 的 `treeExpandAndCollapse`，或直接 `nodeClick` 路径，断 `getOption` 或像素变化。

## 确定性陷阱

- treemap 的 `leafDepth` 下钻状态、tree 的展开状态在实例上残留 → 每测试重挂载（unmount + mount），勿共享实例；
- sunburst 分色若未显式给，取色循环跨节点顺序敏感——显式 `color` 数组或 per-level `color`。

## 官方 demo

`treemap-drill-down`（含下钻）、`treemap-show-parent`、`sunburst-simple`（基础）、`sunburst-drink`（多层）、`tree-legend`、`tree-vertical`（orient TB）。

## 官方手册

- 配置项：`https://echarts.apache.org/zh/option.html#series-treemap`、`https://echarts.apache.org/zh/option.html#series-treemap.levels`、`https://echarts.apache.org/zh/option.html#series-sunburst`、`https://echarts.apache.org/zh/option.html#series-tree`、`https://echarts.apache.org/zh/option.html#series-tree.orient`
- 示例：`https://echarts.apache.org/examples/zh/editor.html?c=<本族 demo 节里的 id>`（目录 `https://echarts.apache.org/examples/zh/index.html`，通用入口模板见 `../chart-families.md` 末节）
