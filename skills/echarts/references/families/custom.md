# custom 族：自定义系列（设计稿还原的逃生舱）

选族入口：`../chart-families.md`。铁律 ✅（custom 官方支持 dataset）。设计稿出现 ECharts 无原生形态的图形时进本族——用 `renderItem` 逐数据项自绘，数据仍走 dataset。

## 数据形状 → option 骨架

```ts
dataset: { source: [['x', 'y'], ...] }
series: [{
  type: 'custom',
  renderItem: (params, api) => {
    const x = api.coord([api.value(0), api.value(1)])  // 值→像素（api.coord 同 convertToPixel）
    const size = api.size([1, 1])                       // 数据单位→像素宽高
    return { type: 'rect', shape: { x: x[0], y: x[1], width: size[0], height: 20 },
             style: { fill: '#37a2da' } }               // zrender 图元：rect/circle/sector/text/group/poly/line...
  },
  encode: { x: 'x', y: 'y' },
}]
```

- `api.coord / api.value / api.size / api.width() / api.height()` 是 renderItem 的全部世界；clip 区域用 `params.coordSys`；
- 可返回的图元（含只有 custom 系列才支持的 `path` / `compoundPath`）与各图元必填项 → `../shapes.md`；
- `z2` 控制同 series 内层叠；返回 group 可组合多图元（gauge 刻度、timeline 节点、时序表格条带等经典用途）。

## 还原设计图关键旋钮

像素是本族的主场：`api.coord` 出来的坐标直接对设计稿标注坐标；`shape` 尺寸像素直给（不走数据换算就别用 api.size）；文字用 `{ type: 'text', style: { text, font, textAlign } }`，字体声明与渲染一致（pixel-pipeline.md 文字测量节）。

## L1 纯函数测点

renderItem 是回调（依赖 echarts api，L2 领地），但**布局计算逻辑抽出来纯函数化**：给定 `[x值, y值, 视口宽]` → `{ shape 像素 }`，L1 直测；设计稿坐标 → 数据域换算函数；色值/文案派生。

## L2 断言通道

- convertToPixel 断锚点（与 renderItem 的 api.coord 一致性）；
- 像素采样断自绘形状（颜色/边界）；
- `getOption().series[0].renderItem` 存在性 + encode 形状（浅断言，深行为交像素）。

## 确定性陷阱

- renderItem 里**勿读全局态**（外部变量、Date.now、随机）——同数据两次渲染不同结果，L3 基线直接废；需要的量全走 params/api；
- 自绘动画要 `transition` 声明式（echarts 声明式动画管线），勿在 renderItem 里手写 rAF。

## 官方 demo

`custom-profile`（坡面图，renderItem 教学）、`custom-gantt-flight`（甘特条）。

## 官方手册

- 配置项：`https://echarts.apache.org/zh/option.html#series-custom`、`https://echarts.apache.org/zh/option.html#series-custom.renderItem`、`https://echarts.apache.org/zh/option.html#series-custom.encode`、`https://echarts.apache.org/zh/option.html#graphic.elements`
- 示例：`https://echarts.apache.org/examples/zh/editor.html?c=<本族 demo 节里的 id>`（目录 `https://echarts.apache.org/examples/zh/index.html`，通用入口模板见 `../chart-families.md` 末节）
