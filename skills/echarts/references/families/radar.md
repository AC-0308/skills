# radar 族：雷达

选族入口：`../chart-families.md`。铁律 ❌（`series.data` 唯一通道）。实测：不写 encode 时 dataset 能渲染，但**显式 `encode: { value: [...] }` 直接抛错**（`radarLayout` 读 undefined）→ 不要走 dataset。极坐标多轴族。

## 数据形状 → option 骨架

```ts
radar: {
  indicator: [{ name: '正确性', max: 5 }, { name: '易理解', max: 5 }, ...],  // 指标轴
  radius: '60%', center: ['50%', '50%'],
  axisName: { color },
}
series: [{
  type: 'radar',
  data: buildRadarData(rows),   // 纯函数：[{ value: [3, 4, 2, 5, 3], name: '本期' }, { value: [...], name: '上期' }]
}]
```

- `indicator` 的 `max` **必须显式**（默认取数据最大值，一变全跳）；
- 多系对比（本期/上期/基线）一 data 数组多元素；`area` 填充。

## 还原设计图关键旋钮

`shape: 'polygon' | 'circle'`（雷达网形状，设计稿常见 polygon）；轴名换行 `axisName.formatter` + `\n`；`splitNumber`（环数）；面积 `areaStyle.opacity`（对比雷达惯例 0.2~0.35）；填充描边色进主题。

## L1 纯函数测点

`buildRadarData`：指标行 → value 向量（含顺序对齐 indicator）；max 归一；对比系装配。

## L2 断言通道（radar 支持 convertToPixel）

`chart.convertToPixel({ seriesIndex: 0 }, [3, 4, 2, 5, 3])` 返回首指标点像素（radar 坐标系实现了 `convertToPixel`，6.1.0 实核）；`getOption().radar[0].indicator` 断指标与 max。

## 确定性陷阱

- indicator.name 是断言 key，改指标名即断言碎——指标名常量收敛一处；
- 多系面积半透明叠加色像素断言受叠序影响 → 断 `getOption` 的 series data，像素交给 L3。

## 官方 demo

`radar`（基础）、`radar-multiple`（多系对比）、`radar-custom`（深色定制样式）。

## 官方手册

- 配置项：`https://echarts.apache.org/zh/option.html#series-radar`、`https://echarts.apache.org/zh/option.html#radar`、`https://echarts.apache.org/zh/option.html#radar.indicator`、`https://echarts.apache.org/zh/option.html#radar.shape`
- 示例：`https://echarts.apache.org/examples/zh/editor.html?c=<本族 demo 节里的 id>`（目录 `https://echarts.apache.org/examples/zh/index.html`，通用入口模板见 `../chart-families.md` 末节）
