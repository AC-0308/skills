// buildOption.test.ts —— L1：纯逻辑（红绿六步第 2/3 步的主战场）
// 归属 unit 工程：vitest --project unit（Node 环境，毫秒级）
import { describe, expect, it } from 'vitest'
import { buildOption, makeRowTotalLabel, toDataset, type DimensionDatum } from './buildOption'

const fixture: DimensionDatum[] = [
  { dimension: '正确性', children: [{ name: '准确', value: 3 }, { name: '召回', value: 2 }] },
  { dimension: '易理解', children: [{ name: '召回', value: 1 }, { name: '覆盖', value: 2 }] },
]

describe('toDataset：树 → 宽表', () => {
  it('表头 = 维度列 + 段名按首次出现顺序（列序即堆叠序）', () => {
    expect(toDataset(fixture).source[0]).toEqual(['dimension', '准确', '召回', '覆盖'])
  })

  it('缺段补 0，行序保持输入顺序', () => {
    const { source } = toDataset(fixture)
    expect(source.slice(1)).toEqual([
      ['正确性', 3, 2, 0],
      ['易理解', 0, 1, 2],
    ])
  })
})

describe('buildOption：dataset 铁律与坐标', () => {
  const option = buildOption(fixture, { animation: false })

  it('数据只进 dataset.source，series 只写 encode，无 series.data', () => {
    expect(option.dataset.source).toHaveLength(3)
    for (const series of option.series) {
      expect(series.encode).toEqual({ x: series.name, y: 'dimension' })
      expect((series as { data?: unknown }).data).toBeUndefined()
    }
  })

  it('所有 series 共享同一 stack（堆叠前提）', () => {
    expect(new Set(option.series.map((s) => s.stack))).toEqual(new Set(['total']))
  })

  it('x 轴满分上限，y 轴类目倒序（data[0] 在最上方）', () => {
    expect(option.xAxis.max).toBe(5)
    expect(option.yAxis.inverse).toBe(true)
  })
})

describe('makeRowTotalLabel：行尾合计', () => {
  it('行总分/满分 → 百分比', () => {
    expect(makeRowTotalLabel(5)({ value: ['正确性', 3, 2] })).toBe('100%')
    expect(makeRowTotalLabel(5)({ value: ['易理解', 1, 2] })).toBe('60%')
  })

  it('零分行返回空串（不显示标签）', () => {
    expect(makeRowTotalLabel(5)({ value: ['空', 0, 0] })).toBe('')
  })
})
