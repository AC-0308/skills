# failure-modes：症状 → 根因 → 处置

图表不对时先查本表，再决定是否深入调试。

| 症状 | 根因 | 处置 |
|---|---|---|
| 空白图，无报错 | init 时容器零尺寸：隐藏 tab / flex 父级无高度 / init 早于挂载 | 组件容器尺寸由 props 固定；修正时机后补 `chart.resize()` |
| 数据变了图不更新 | merge 模式静默保留旧结构（series 数/轴变了） | 结构性变更 `notMerge: true`（判据表见 option-recipes.md） |
| 更新后 legend/dataZoom 选择丢失 | `notMerge: true` 重置交互状态 | 更新前 `getOption()` 取 `legend[0].selected`/dataZoom 范围回填，或把状态所有权移到应用侧 |
| 控制台 "Component xxx not exists"，但测试全绿 | 缺 tree-shaking 注册只报 `console.error` 不抛错 | 补 `echarts.use([...])`（收敛到共享注册模块）；测试里 spy `console.error`（写法见 testing-layers.md） |
| SPA 路由切换后内存涨 | 实例未 dispose | unmount 钩子里 `dispose()`（useEChart 已内置，自查勿绕过 composable 手 init） |
| 侧栏折叠后图尺寸错 | 监听的是 window resize，容器尺寸变化不触发 window 事件 | ResizeObserver 观察容器（VueUse `useResizeObserver`），勿监听 window |
| 同一节点 init 两次报错/异常 | 重复 init | `echarts.getInstanceByDom(el)` 先查；重 init 前 dispose |
| tooltip 被容器裁剪 | 容器 overflow hidden | `tooltip: { confine: true }` 或 `appendTo` |
| 大数据卡顿 | 动画开着、无采样 | `animation: false` + `sampling: 'lttb'` + `large: true`；百万级再上 echarts-gl |
| v6 升级后布局微移 | v6 默认开轴标签防溢出、默认主题更换 | 见 option-recipes.md「ECharts 6 迁移要点」 |

排查时的浏览器证据通道（L2 同款）：`getInstanceByDom(el)` → `getOption()` 对照期望、`convertToPixel` 查像素、console 过滤 ECharts 告警。图表实例从页面不可达时（产物 bundle 无暴露），用 DOM 代理代替 `getOption()`。

## 官方手册

- 实例生命周期：`https://echarts.apache.org/zh/api.html#echarts.init`、`https://echarts.apache.org/zh/api.html#echarts.getInstanceByDom`、`https://echarts.apache.org/zh/api.html#echartsInstance.resize`、`https://echarts.apache.org/zh/api.html#echartsInstance.dispose`
- 症状对应旋钮：`https://echarts.apache.org/zh/option.html#tooltip.confine`、`https://echarts.apache.org/zh/option.html#series-line.sampling`、`https://echarts.apache.org/zh/option.html#grid.outerBoundsMode`
- v6 升级导致布局微移：`https://echarts.apache.org/handbook/zh/basics/release-note/v6-upgrade-guide`
- 排查通道：`https://echarts.apache.org/zh/api.html#echartsInstance.getOption`、`https://echarts.apache.org/zh/api.html#echartsInstance.convertToPixel`

出处：蒸馏自 `sentimony/skills@echarts`（MIT）的 Common Failure Modes，按本项目技术栈（Vue 3 + 裸 echarts + VueUse）改写处置方案。
