# themeRiver 族：主题河流

选族入口：`../chart-families.md`。铁律 ❌（`series.data` 唯一通道：实测 dataset 版只画出空壳，与无数据一致）。单值时间轴族。

## 数据形状 → option 骨架

```ts
singleAxis: { type: 'time' }   // 单值时间轴
series: [{
  type: 'themeRiver',
  boundaryGap: ['10%', '10%'],
  label: { show: false },
  emphasis: { focus: 'adjacency' },
  data: buildRiverData(rows),   // 纯函数：[['2024-01', '主题A', 12], ['2024-01', '主题B', 8], ...]
}]
```

- data 每行 `[时间, 主题名, 值]`；同一时刻可多主题多条（堆成流层）；
- 主题配色取色循环对输入顺序敏感——显式 `color` 数组对齐主题名序（见陷阱）。

## 还原设计图关键旋钮

`boundaryGap`（河岸留白）；`label.show`（层内主题名，挤则关）；河流带的可视高度 = 容器高 − 上下留白，按主题数量摊派——精确间距还原走 pixel-pipeline.md（容器高度先求和再设定）。

## L1 纯函数测点

`buildRiverData`：宽表（时间 × 主题值）→ 行三元组（补零主题行——不补则该时刻流层缺失，是否补是业务决策，L1 可测）；主题名序（配色 key）；时刻采样/聚合窗口。

## L2 断言通道（无 convertToPixel）

`getOption().series[0].data` 断三元组结构；`getOption().color` 断配色序对齐主题名序；像素采样断河流带颜色分区。

## 确定性陷阱

- 单列颜色周期性复用（主题多于色数时取余循环）→ 显式 `color` 数组与主题名序对齐，否则增删一个主题全河变色；
- 时间轴起始边界自适应 → 冻结时钟 + 数据固定起止时刻。

## 官方 demo

`themeRiver-lastfm`（经典）、`themeRiver-basic`。

## 官方手册

- 配置项：`https://echarts.apache.org/zh/option.html#series-themeRiver`、`https://echarts.apache.org/zh/option.html#series-themeRiver.boundaryGap`、`https://echarts.apache.org/zh/option.html#singleAxis`
- 示例：`https://echarts.apache.org/examples/zh/editor.html?c=<本族 demo 节里的 id>`（目录 `https://echarts.apache.org/examples/zh/index.html`，通用入口模板见 `../chart-families.md` 末节）
