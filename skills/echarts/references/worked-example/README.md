# worked-example：维度堆叠柱（dataset 风格完整闭环）

一个最小但完整的对照锚点：组件、composable、L1/L2/L3 三个测试文件齐全。第一次用本 skill 时通读一遍，后续编码对照这里的输出形状。

## 文件关系

```
buildOption.ts ─(纯函数，运行时零依赖)→ buildOption.test.ts            L1  vitest --project unit
       │
TrendChart.vue ─(useEChart 接线)→ TrendChart.browser.test.ts          L2  vitest --project browser
                                      TrendChart.vrt.test.ts           L3  vitest --project vrt

useEChart.ts（init / dispose / resize；产线与测试共用同一条实例通道）
```

本目录是**参照物**，不参与运行。拷进真实项目 `src/` 下即可跑（前提：testing-layers.md 的依赖与三工程 config 就位）。

**已验证组合**（改动本目录后须重跑）：echarts 6.1.0 · vitest 5.0.5 · vitest-browser-vue 3.1.0 · @vitest/browser-playwright 5.0.5 → `tsc --noEmit` 无错、unit 7 绿、browser 6 绿、vrt 首跑生成基线后稳定。

## 与 skill 规则的对应

| 规则（出处） | 落点 |
|---|---|
| dataset 铁律：数据全进 source，series 只写 encode + stack | `buildOption.ts` 的 `toDataset` / series 构建 |
| 像素实测三段管线（flush → 实测 → 二次注入）与 graphic 语法（id/$action/堆叠防护） | `TrendChart.vue` 的 `injectRowBadges`（pixel-pipeline.md §graphic 语法骨架/§矩阵叠加/§三段式的组件化示范） |
| option 构建器是纯函数（L1 秒级红绿） | `buildOption.ts` 无 vue/echarts 运行时 import |
| init 前容器非零尺寸（空白图防线） | `TrendChart.vue` 容器尺寸来自 props |
| dispose / 容器 resize / 观察容器非 window | `useEChart.ts` |
| 数据全量重建 → `notMerge: true` | `TrendChart.vue` 的 watchEffect |
| 行尾合计挂堆叠末段，formatter 收到整行数组 | `buildOption.ts` 的 `makeRowTotalLabel` |
| L1 断变换与形状，L2 断「进了实例」，不重复 | 两个测试文件的断言分布 |
| L2 断言通道：getOption / convertToPixel / canvas 墨迹 / console.error spy | `TrendChart.browser.test.ts` |
| graphic 注入断言：按行生成、id 稳定 merge、块不越出画布左缘 | `TrendChart.browser.test.ts` 的 graphic 用例 |
| 数据行减少 → notMerge 重建后仅剩当前行（改 merge 就必须补 `$action:'remove'`） | `TrendChart.browser.test.ts` 最后用例 + pixel-pipeline.md §graphic |
| L3 确定性：固定尺寸 + animation false + 静态 fixture | `TrendChart.vrt.test.ts` 的 props |

## 数据形状

```ts
;[
  { dimension: '正确性', children: [{ name: '准确', value: 3 }, { name: '召回', value: 2 }] },
  { dimension: '易理解', children: [{ name: '召回', value: 1 }, { name: '覆盖', value: 2 }] },
]
```

- `dimension` 行序 = y 轴从上到下顺序。
- 段名跨行**共享**（图例按段名着色的前提）；某行缺的段在宽表里补 0，堆叠总长不受影响。
- 满分 `fullScore`（默认 5），行尾标签 = 行总分 / 满分 → 百分比。
