# pie 族：饼/环/玫瑰/漏斗

选族入口：`../chart-families.md`。铁律 ✅（pie 与 funnel 均支持 dataset）。无坐标系族。

## 数据形状 → option 骨架

二维表 name/value 两列（encode：name 列 + value 列）：

```ts
dataset: { source: [['name', 'value'], ['准确', 3], ['召回', 2]] }
series: [{ type: 'pie', radius: '60%', encode: { itemName: 'name', value: 'value' } }]
```

- 环形：`radius: ['45%', '65%']`（内半径数组即环形）；中心文案（总数/标题）用 graphic 或 `title`，居中于 `center`。
- 玫瑰：`roseType: 'radius' | 'area'`。
- 漏斗：`type: 'funnel'`，`left/top/width/height` 直角画布布局 + `min/minSize/max/maxSize` 漏斗区间映射；排序是漏斗灵魂（见 L1）。
- 起始角与方向：`startAngle`、`clockwise`——还原设计稿第一刀常在这里。

## 还原设计图关键旋钮

扇区间隙 `itemStyle.borderColor: '#fff'` + `borderWidth`（白描边断扇）；标签引线 `labelLine: { length, length2 }`；富文本中心文案 `label` + `emphasis` 位移；色序进主题（option-recipes.md）。

## L1 纯函数测点

- 漏斗排序变换（降序归一化，乱序输入归一为设计稿顺序）；
- value 占比/累计百分比 formatter；
- encode 形状（itemName/value 列名）、radius/roseType 形状断言。

## L2 断言通道（无 convertToPixel）

- `getOption()` 断 series 形状与数据；
- 像素采样：中心点向外径向采样断色环分段位置（`getImageData` 沿过圆心直线走，色段边界即扇区角度）；环形容错：半径取 `(内+外)/2`；
- tooltip：dispatchAction `showTip` + `getByText`。

## 确定性陷阱

- 玫瑰/饼的入场展开动画与 label 引线动画 → `animation: false`；
- 百分比 formatter 读时钟无关，但「今日」类中心文案要冻结时钟。

## 官方 demo

`pie-simple`、`pie-doughnut`（环）、`pie-roseType`（玫瑰）、`funnel`、`pie-nest`（环心富文本）。

## 官方手册

- 配置项：`https://echarts.apache.org/zh/option.html#series-pie`、`https://echarts.apache.org/zh/option.html#series-pie.label.rich`、`https://echarts.apache.org/zh/option.html#series-pie.roseType`、`https://echarts.apache.org/zh/option.html#series-funnel`
- 示例：`https://echarts.apache.org/examples/zh/editor.html?c=<本族 demo 节里的 id>`（目录 `https://echarts.apache.org/examples/zh/index.html`，通用入口模板见 `../chart-families.md` 末节）
