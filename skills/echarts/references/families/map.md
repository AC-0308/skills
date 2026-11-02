# map 族：地图/geo/lines

选族入口：`../chart-families.md`。铁律 ✅(map，但**不写 `encode`**)/lines ❌（map 系列支持 dataset；lines 不支持，`series.data` 唯一通道）。

## 数据形状 → option 骨架

先注册 GeoJSON（一次，全局）：

```ts
import chinaJson from './china.json'
echarts.registerMap('china', chinaJson)   // 收敛到共享注册模块（option-recipes.md tree-shaking 节同理由）
```

map 系列 + 二维表（region 列 + value 列）：

```ts
dataset: { source: [['region', 'value'], ['广东', 91], ...] }
series: [{ type: 'map', map: 'china' }]   // ⚠ 不要写 encode：首列区域名、次列值靠默认映射
visualMap: { min, max, inRange: { color } }
```

实测（6.1.0）：显式写 `encode: { name: 'region', value: 'value' }` 会让 visualMap 失效、整图退回默认配色——map 的 encode 缺省器（`makeSeriesEncodeForNameBased`）才是正确通道，不写即对。

- geo 组件 + scatter 系列打点：`geo: { map, roam }` + series `coordinateSystem: 'geo'`；
- 飞线 `lines`：`series.data: [{ coords: [[lng, lat], [lng, lat]], ... }]`（不支持 dataset）+ `effect: { show: true, period, trailLength }`；
- 地图上散点值标注、nameProperty 对齐 GeoJSON 的名称字段。

## 还原设计图关键旋钮

`visualMap.inRange.color` 色阶（分省填色，与设计稿色板逐色对）；`itemStyle.areaColor`（无数据区底色）、`borderColor`（省界描边）；`emphasis` 高亮；`label.show`（省名显隐）；`layoutCenter/layoutSize`（像素级地图定位）；`aspectScale`（宽高比微调）。

## L1 纯函数测点

`buildLines`（坐标对→lines data）；区域名归一化（数据 region 名 ↔ GeoJSON name 对齐表）；色阶分段构建。

## L2 断言通道（无 convertToPixel——geo 支持有限，以像素为主）

`getOption().series[0]` 断 map/encode（map 系列）；像素采样断某省填色（取该省视觉中心坐标采样，需 GeoJSON 大致方位已知）；geo 定点打点断 `convertToPixel({ geoIndex: 0 }, [lng, lat])`（geo 坐标系 convertToPixel 支持，实测为准）。

## 确定性陷阱

- **GeoJSON 注册全局污染**：`registerMap` 注册后不可卸载——测试里注册独立命名的 map（`registerMap('test-china', json)`）避免与产线名冲突，或整套 map 测试共享一个注册模块；
- lines 的 effect 流光动画无限循环 → 测试关 effect 或断 `getOption` 结构不像素断言；
- 视觉中心采样依赖 GeoJSON 内容，换底图即漂移——采样坐标与 GeoJSON 文件版本绑定，写在同一 fixture。

## 官方 demo

`map-HK`（choropleth 填色）、`map-usa`（换底图）、`lines-airline` / `geo-svg-lines`（飞线、SVG 飞线）、`geo-choropleth-scatter`（定点打点）、`geo-svg-scatter-simple`。

## 官方手册

- 配置项：`https://echarts.apache.org/zh/option.html#series-map`、`https://echarts.apache.org/zh/option.html#geo`、`https://echarts.apache.org/zh/option.html#series-lines`、`https://echarts.apache.org/zh/option.html#series-lines.effect`、`https://echarts.apache.org/zh/option.html#visualMap-continuous.inRange`
- 示例：`https://echarts.apache.org/examples/zh/editor.html?c=<本族 demo 节里的 id>`（目录 `https://echarts.apache.org/examples/zh/index.html`，通用入口模板见 `../chart-families.md` 末节）
