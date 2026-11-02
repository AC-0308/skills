---
name: echarts
description: ECharts 图表编码与红绿测试纪律（dataset 铁律 / 红绿六步 / 像素实测）。使用场景：编写或修改 echarts 图表、按设计图还原图表、决定数据走 dataset.source 还是 series.data、为图表写 vitest browser mode 测试、排查图表空白/不更新/尺寸错误。
compatibility: "echarts 6.x · Vue 3 · VueUse · vitest 5（vitest-browser-vue 3、@vitest/browser-playwright 5、@vitejs/plugin-vue）"
license: MIT
metadata:
  version: "0.1.0"
  生效范围: 项目级（Vue 3 + 裸 echarts 技术栈，未用 vue-echarts 等 wrapper）
---

# ECharts 编码与红绿测试

三个词跑完全程：**铁律**（dataset 支持即强制，不支持的系列 series.data 是唯一通道）、**红绿**（L1/L2 测试驱动编码）、**实测**（像素级布局先渲染后测量）。

## 决策树

```
任务进来
├─ 项目用 vue-echarts 等 wrapper，或不是 Vue → option 配方与铁律仍适用，但实例通道（useEChart /
│   getInstanceByDom）与 L2 断言写法不成立，测试按 wrapper 官方文档走
├─ 从设计图还原新图表 → 先查 references/chart-families.md 选族，再产出编号 spec（红绿六步第 1 步）
├─ 项目里已有图表 → 先找 composable / 注册模块 / 主题复用，匹配既有 import 风格
├─ 写 / 改 option → 查本族配方 references/families/<族>.md（无配方再读 references/option-recipes.md），守住 dataset 铁律
├─ 要自绘图元（哪个形状、各形状要哪几个必填项、定位/层叠/对齐旋钮）→ 读 references/shapes.md
├─ 设计需求超出单一图表形态（混搭/双轴/标注/富文本/刷选/联动/状态切换）→ 读 references/techniques.md
├─ 布局要像素级精确（分组块 / 段内文字 / 精确间距）→ 读 references/pixel-pipeline.md
├─ 要测试 → 读 references/testing-layers.md，L1/L2 进红绿，L3 只做护栏
└─ 图不对（空白 / 不更新 / 尺寸错 / 报 Component not exists）→ 读 references/failure-modes.md
```

第一次在本项目用本 skill，或想对照输出形状：读 `references/worked-example/README.md`。

## dataset 铁律

**支持即强制**：凡支持 dataset 的系列（清单以 `references/chart-families.md`「铁律的官方边界」为唯一口径），数据一律进 `dataset.source`（首行表头），一个段一个 series，series 只写 `encode` 和共享 `stack`；这些系列里出现 `data` 字段即坏味道。（唯一例外：`map` 不要写 `encode`，首列区域名/次列值靠默认映射，理由见 chart-families.md）

`series.data` 是唯一通道的系列（同上清单的排除项：treemap、sunburst、tree、sankey、graph、chord、lines、themeRiver、gauge、radar）不适用本铁律——纯函数原则照旧：构建其数据结构的变换函数照样进 L1。

白名单例外（铁律之外仍可用的数据/标注通道）：

1. **实测后注入的 graphic**——数据已在 source 里，graphic 元素是像素布局的产物；
2. **标注选项**（在 series 内）——markLine 阈值线、markPoint、markArea 等不含业务数据的评注层；
3. **百万级 `appendData` 增量加载**——官方明确不支持 dataset。

动机：数据与配置解耦，option 构建器可写成纯函数，L1 红绿达到秒级反馈。

## 红绿六步

每步带完成判据，判据不满足就停在该步。

1. **编号 spec**：设计图逐条翻译成「需求N」可验收条目。
   判据：每条能指向一个将写的断言；指向不了的条目拆分，或标注交由 L3 护栏兜底。
2. **L1 红**：写 `buildOption` 纯函数与失败测试（数据变换、option 形状）。
   判据：`vitest --project unit` 只因目标功能失败，无关测试全绿。
3. **L1 绿**：实现到测试通过。
   判据：unit 全绿，且 `buildOption` 仍是无 vue/echarts 运行时依赖的纯函数（`import type` 可用）。
4. **L2 红**：组件挂载测试（实例存在、option 进实例、像素、canvas 有墨迹）。
   判据：`vitest --project browser` 新断言失败，失败信息指向渲染契约而非环境错误。
5. **L2 绿**：接线 `useEChart` 让组件跑通。
   判据：browser 工程全绿。
6. **L3 护栏**：`vrt` 截图基线。首跑生成基线并失败属预期，人工审核后提交。
   判据：`vitest --project vrt` 连续两次运行全绿，基线已入库。

L3 不进红绿循环：截图 diff 反馈慢、失败语义弱（「差 3px」不是可行动的红灯），只做合入前回归护栏。

## 版本锚定

本 skill 锚定 vitest 5（`toMatchScreenshot` / Test Projects / `expect.element`）与 echarts 6。升级任一大版本时，先核对 `references/testing-layers.md` 与 worked example 是否仍与官方 API 一致。

官方入口（手册/API/示例/使用手册）的 URL 模板只在 `references/chart-families.md` 末节维护；各族与各参考文件末尾都写了本文件专属的具体链接，查细节直接跳那里。

**参照物可跑是硬约束**：worked example 会被逐行照抄，跑不通等于把 bug 教出去。核对方式——把 `references/worked-example/*` 拷进临时项目 `src/`，`tsc --noEmit` 无错、`vitest --project unit` 与 `--project browser` 全绿；改完参照物必须重跑这一遍再交付。
