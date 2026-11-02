# shapes：图元清单与配置项（自绘前查这里）

graphic 组件（pixel-pipeline.md）与 `type: 'custom'` 系列（families/custom.md）用的是同一套 zrender 图元。本文件只给「有哪些、各要哪几个必填项、通用旋钮怎么分组」，**细节以官方手册为准**（末尾链接）。

## 两套集合不一样（实测，6.1.0）

| 元素类型 | graphic 组件 | custom 系列 |
|---|---|---|
| 10 个内置图元（下表） | ✅ | ✅ |
| `group` / `text` / `image` | ✅ | ✅ |
| `path`（SVG pathData） | ❌ 抛 `graphic type path can not be found` | ✅ `shape: { d / pathData, layout }` |
| `compoundPath` | ❌ 同上 | ✅ `shape: { paths: [...] }` |

源码依据：`lib/component/graphic/GraphicView.js` 的 `nonShapeGraphicElements` 里 `path: null, compoundPath: null` 带注释「Reserved but not supported in graphic component」；`lib/chart/custom/CustomView.js` 的 `createEl` 才实现二者。**要画任意曲线路径，走 custom 系列，不要试 graphic。**

## 10 个内置图元的 shape 必填项

角度单位是**弧度**（不是度；度→弧度 `* Math.PI / 180`）。

| type | shape 字段（粗体必填） | 说明 |
|---|---|---|
| `rect` | **x y width height**，`r?` | `r` 圆角，`number` 或四角数组 `[tl, tr, br, bl]` |
| `circle` | **cx cy r** | |
| `ellipse` | **cx cy rx ry** | |
| `ring` | **cx cy r r0** | `r0` 内半径；单圆环（不能扇形） |
| `sector` | **cx cy r r0 startAngle endAngle clockwise**，`cornerRadius?` | 扇形/圆角弧段；`cornerRadius` 可数组 |
| `arc` | **cx cy r startAngle endAngle**，`clockwise?` | 无 `r0` → 单根弧线（描边用，填充无意义） |
| `polygon` | **points**（`[[x,y],...]`），`smooth?` | 闭合多边形 |
| `polyline` | **points**，`percent?` `smooth?` | 不闭合 |
| `line` | **x1 y1 x2 y2**，`percent?` | `percent` 1 = 整段（做描边动画用 0→1） |
| `bezierCurve` | **x1 y1 x2 y2 cpx1 cpy1**，`cpx2?` `cpy2?` `percent?` | 二次（只给 cpx1/cpy1）或三次贝塞尔 |

必填项漏了不报错、静默退化成零尺寸（`circle` 缺 `r`、`rect` 缺 `width` 实测 bbox 0×0）——自绘空白图先回来核这张表。

## 通用配置项（四个分组，不分图元）

- **定位**（三选一，优先级：`left/top` 系列 > `position` > shape/style 内的 x/y）：
  - `left / right / top / bottom`：像素或百分比，可写 `'center'`；设了 `left/right` 就覆盖 `shape.x/cx` 与 `position`；
  - `position: [x, y]`：元素整体平移；
  - 几何自身坐标：rect 的 `shape.x/y`、circle 的 `shape.cx/cy`、text 的 `style.x/y`。
  - `bounding: 'all' | 'raw'`（默认 all）决定定位时用「含子元素并集」还是「自身未变换」的包围盒；`width/height` 只在 text/image/group 上做缩放用。
- **文字对齐**只认两种写法，且跟定位方式绑定（实测）：`style.x/y` 或 `position` 定位 → `style.align / verticalAlign`；`left/top` 定位 → `style.textAlign / textVerticalAlign`（EC4 兼容名，zrender 会转；写 `align` 在这个模式下静默失效）。
- **层叠**：`zlevel`（离屏 canvas 层，慎用）< `z`（同层排序，系列图元 ≈2~3，压柱下 0、盖柱上 10）< `z2`（同 z 内的细分，custom 系列内自绘常用）。
- **交互**：`silent: true`（不响应鼠标，防挡 tooltip）、`cursor`、`draggable`、`onclick` 等 `on*` 事件、`ignore`、`invisible`、`info`（挂自定义数据供事件里读）。
- **动画**：`transition: ['shape'|'style'|'all']` 声明哪些属性走过渡 + `keyframeAnimation: [...]` 声明关键帧；`during(api)` 做逐帧 hook。全部声明式，**勿手写 rAF**。

## style 通用项

- 填充/描边：`fill` / `stroke` / `lineWidth` / `lineDash`（`false | number[] | 'solid' | 'dashed' | 'dotted'`）/ `lineDashOffset` / `lineCap` / `lineJoin` / `miterLimit` / `strokePercent`；
- `fill` / `stroke` 除色值外还接受 `echarts.graphic.LinearGradient` / `RadialGradient` / `PatternObject`（渐变做色带、进度弧都走这里，见 option-recipes.md 配色节）；
- 通用：`opacity` / `fillOpacity` / `strokeOpacity` / `shadowBlur` / `shadowColor` / `shadowOffsetX` / `shadowOffsetY` / `blend` / `decal`。

## 想用 zrender 有但 echarts 没注册的图元

zrender 还带 `star / rose / isogon / droplet / heart / trochoid`，echarts 只注册了上表 10 个 + group/text/image，所以直接写 `type: 'star'` 会抛 `graphic type star can not be found`。要用时自己注册（实测可用）：

```ts
import Star from 'zrender/lib/graphic/shape/Star.js'
echarts.graphic.registerShape('star', Star)   // 之后 type: 'star'，shape: { cx, cy, n, r, r0 }
```

注册是全局的，收敛到共享注册模块（同 option-recipes.md tree-shaking 节）；`registerShape` 也能覆盖内置名——别覆盖。

## 官方查询入口

- graphic 组件：`https://echarts.apache.org/zh/option.html#graphic.elements`，各图元单独一条锚点——`#graphic.elements-rect`、`-circle`、`-sector`、`-ring`、`-arc`、`-polygon`、`-polyline`、`-line`、`-bezierCurve`、`-group`、`-text`、`-image`（定位/`z`/`silent`/`transition`/`keyframeAnimation` 都在这些锚点下设）
- custom 系列：`https://echarts.apache.org/zh/option.html#series-custom`、`#series-custom.renderItem`、`#series-custom.encode`
- 各图元 shape 字段的权威定义（含未注册那批）：`node_modules/zrender/lib/graphic/shape/<Name>.d.ts`，字段就是 `XxxShape` 接口
- 可跑示例：`https://echarts.apache.org/examples/zh/editor.html?c=graphic-stroke-animation`、`?c=custom-profile`、`?c=custom-gantt-flight`

**手册与运行时有两处不一致（6.1.0 实测），以实测为准**：

- `ellipse` —— 运行时可用，手册里**没有** `#graphic.elements-ellipse` 锚点；
- `compoundPath` / `path` —— 手册里有 `#graphic.elements-compoundPath` 锚点，但 graphic 组件运行时会抛 `graphic type compoundPath can not be found`（源码 `GraphicView.js` 的 `nonShapeGraphicElements` 标的就是「Reserved but not supported」）；这两者只存在于 custom 系列。

本文件按 echarts 6.1.0 / zrender 6.1.0 的类型定义与运行时实测压缩，细节随版本漂移时以官方手册为准。
