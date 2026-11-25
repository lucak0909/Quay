import { describe, expect, it } from 'vitest'
import { childEnds, hiddenBlocks, type BlockInfo } from './outlineTree'

const h = (level: number, indent = 0): BlockInfo => ({ kind: 'heading', level, indent })
const p = (indent = 0): BlockInfo => ({ kind: 'text', indent })
const list: BlockInfo = { kind: 'other', indent: 0 }

describe('note outline', () => {
  it('indented lines belong to the line above them', () => {
    // 0 Topic / 1   detail / 2     more / 3   detail / 4 Next topic
    expect(childEnds([p(), p(1), p(2), p(1), p()])).toEqual([4, 3, 3, 4, 5])
  })

  it('headings own everything until the next heading of the same level', () => {
    // 0 H1 / 1 text / 2 H2 / 3 text / 4 list / 5 H2 / 6 H1
    expect(childEnds([h(1), p(), h(2), p(), list, h(2), h(1)])).toEqual([6, 2, 5, 4, 5, 6, 7])
  })

  it('lists can be children but never parents', () => {
    expect(childEnds([list, p(1)])).toEqual([1, 2])
    expect(childEnds([p(), list])).toEqual([1, 2])
  })

  it('a line with nothing indented under it has no children', () => {
    expect(childEnds([p(), p(), p()])).toEqual([1, 2, 3])
  })

  it('hides the children of collapsed blocks, credited to the outermost one', () => {
    const blocks = [h(1), p(), p(1), p(2), h(1)]
    const hidden = hiddenBlocks(blocks, [false, false, true, false, false])
    expect([...hidden.entries()]).toEqual([[3, 2]])
    const both = hiddenBlocks(blocks, [true, false, true, false, false])
    expect([...both.entries()]).toEqual([[1, 0], [2, 0], [3, 0]])
  })
})
