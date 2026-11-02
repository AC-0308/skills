# chart-families：图表族速查矩阵

做任何新图表前先查本表选族，再跳进 `families/<族>.md` 读配方。矩阵每列都是该族与纪律体系的接口。

**列含义**：坐标系（决定 L2 断言通道）｜数据形状｜铁律（dataset 适用性，见 SKILL.md）｜L2 断言通道｜确定性陷阱（只列该族专属的，通用清单见 testing-layers.md）

| 族 | 覆盖系列 | 坐标系 | 数据形状 | 铁律 | L2 断言通道 | 确定性陷阱 |
|---|---|---|---|---|---|---|
| [bar](families/bar.md) | 基础/堆叠/极坐标/瀑布/象形柱 | 直角/极坐标 | 二维表 | ✅ dataset | convertToPixel | 负值堆叠零线分上下 |
| [line](families/line.md) | 基础/堆叠/面积/阶梯/平滑 | 直角 | 二维表 | ✅ dataset | convertToPixel | time 轴起始刻度抖动→冻结时钟 |
| [scatter](families/scatter.md) | 散点/涟漪/气泡 | 直角 | 二维表（x/y/size 列） | ✅ dataset | convertToPixel | effectScatter 涟漪动画永不停→禁用或单帧 |
| [pie](families/pie.md) | 饼/环/玫瑰/漏斗 | 无 | 二维表（name/value） | ✅ dataset | getOption + 像素采样 | 玫瑰图 label 引线动画→关 |
| [hierarchy](families/hierarchy.md) | treemap/旭日/树 | 无（布局自算） | 嵌套树 | ❌ series.data | getOption + 像素采样 | leafDepth/上钻状态跨测试残留→重挂载 |
| [flow](families/flow.md) | 桑基/关系图/和弦 | 无（迭代布局） | nodes/edges | ❌ series.data | getOption + dispatchAction | 力导向迭代敏感→布局间不像素断言或预置坐标 |
| [matrix](families/matrix.md) | 矩阵坐标系挂任意系列（相关/混淆/sparkline 网格/周期表/sectionCoordMap 布局） | matrix 格子 | [x格,y格,value] 三元组 | ❌ 惯例 series.data（dataset 仅 1 例非首选） | convertToPixel({ matrixIndex: 0 }) + 像素采样 | sparkline 多格动画相位差→关；色阶随数据漂移→显式 min/max；media 分支需换 viewport |
| [heatmap](families/heatmap.md) | 直角热力/日历 | 直角/日历 | 二维表（x/y/value） | ✅（日历例外） | convertToPixel（日历走颜色采样） | 日历范围读时钟→固定 range |
| [parallel](families/parallel.md) | 平行坐标 | 平行轴系 | 二维表 | ✅ dataset | convertToPixel | 轴范围自动推算随数据漂移→显式 min/max |
| [stats](families/stats.md) | K线/箱线 | 直角 | OHLC/统计行 | ✅ dataset | convertToPixel | 箱线须单 series 全行数据 |
| [radar](families/radar.md) | 雷达 | 极坐标多轴 | 指标数组 | ❌ series.data | getOption + 像素采样 | 指标名即 key，改名即断言碎 |
| [gauge](families/gauge.md) | 仪表盘/进度 | 无 | 单值 | ❌ series.data | getOption + 像素采样 | 进度动画→animation:false |
| [map](families/map.md) | 地图/geo/lines | 地理坐标系 | GeoJSON + 数据表 | ✅(map)/lines ❌ | getOption + 像素采样 | GeoJSON 注册一次全局污染→测试内注册并记账 |
| [custom](families/custom.md) | 自定义系列（还原逃生舱） | 任意 | 任意（dataset 可用） | ✅ dataset | convertToPixel + 像素采样 | renderItem 里勿读全局态 |
| [themeRiver](families/themeRiver.md) | 河流 | 单值时间轴 | date/name/value 行 | ❌ series.data | getOption + 像素采样 | 单列颜色周期性→显式配色 |

## 官方入口总表（URL 模板只在本文维护，其他文件写具体链接）

- 编辑器（可改可跑）：`https://echarts.apache.org/examples/zh/editor.html?c=<示例id>`（如 `bar-y-category`、`sankey-energy`、`custom-profile`）
- 示例总目录：`https://echarts.apache.org/examples/zh/index.html`
- option 手册：`https://echarts.apache.org/zh/option.html#<锚点>`（锚点形如 `series-pie.label`、`grid.outerBoundsMode`、`graphic.elements-rect`）
- API 手册：`https://echarts.apache.org/zh/api.html#<方法名>`（如 `echartsInstance.convertToPixel`）
- 使用手册（SSR、v6 升级等长文）：`https://echarts.apache.org/handbook/zh/`

各族文件末尾都带本族的手册锚点与示例入口；参考文件的官方链接写在各自末尾。

## 铁律的官方边界（6.1.0 实测核过，本表即唯一口径）

**官方文档清单**：line、bar、pie、scatter、effectScatter、parallel、candlestick、map、funnel、custom。

**实测补充（文档未列但可用）**：

- `heatmap`——走 `createSeriesData`，直角热力用 dataset 与 `series.data` 渲染结果一致；**日历热力例外**：`coordinateSystem: 'calendar'` + dataset 静默不出数据（实测 SVG 与空数据版字节相同）→ 日历热力必须 `series.data`；
- `boxplot`——与 candlestick 共用 `whiskerBoxCommon` → `createSeriesDataSimply` → `getSource()`，实测可用。

**实测排除（文档未列且确实不能按 dataset 写）**：treemap、sunburst、tree、sankey、graph、chord、lines、themeRiver、gauge、radar。其中两个需要说清原因，免得被“源码里也有 `createSeriesDataSimply`”误导：

- `gauge`：`encode` 被忽略，两列 `name/value` 源会取错列（值变成名称串、title 丢失）；只有恰好单列（列序即 value）时能跑，不可依赖 → `series.data`；
- `radar`：不写 encode 时能渲染，**显式 `encode: { value: [...] }` 直接抛错**（`radarLayout` 读 undefined）→ `series.data`。

**`map` 特例**：支持 dataset，但**不要写 `encode`**——首列区域名、次列值靠默认映射即可；实测显式 `encode: { name, value }` 会让 visualMap 失效（整图退回默认配色）。

铁律因此是「支持即强制」：上表中支持的系列出现 `series.data` 即坏味道；不支持/实测排除的系列 `series.data` 是唯一通道，纯函数原则照旧（构建其数据结构的变换函数照样可 L1 直测）。
