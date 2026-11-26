import { describe, expect, it } from 'vitest'
import { ancestors, applyMove, childEnds, dropMove, hiddenBlocks, moveSibling, type BlockInfo } from './outlineTree'

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

// Named lines make moves easy to read: [name, indent].
const lines = (...spec: [string, number][]) => spec.map(([name, indent]) => ({ kind: 'text' as const, indent, name }))
const names = (blocks: { name: string; indent: number }[]) => blocks.map((b) => '.'.repeat(b.indent) + b.name).join(' ')

describe('moving lines', () => {
  const doc = lines(['A', 0], ['a1', 1], ['a2', 1], ['B', 0], ['b1', 1], ['C', 0])

  it('finds the lines that contain a line', () => {
    expect(ancestors(doc, 2)).toEqual([0])
    expect(ancestors(lines(['A', 0], ['a', 1], ['x', 2]), 2)).toEqual([0, 1])
    expect(ancestors(doc, 3)).toEqual([])
  })

  it('Alt+Shift+Down swaps a line and its children with the next sibling', () => {
    const move = moveSibling(doc, 0, 'down')!
    expect(names(applyMove(doc, move))).toBe('B .b1 A .a1 .a2 C')
  })

  it('Alt+Shift+Up swaps with the previous sibling', () => {
    expect(names(applyMove(doc, moveSibling(doc, 5, 'up')!))).toBe('A .a1 .a2 C B .b1')
    expect(names(applyMove(doc, moveSibling(doc, 2, 'up')!))).toBe('A .a2 .a1 B .b1 C')
  })

  it('never moves a line out of its parent', () => {
    expect(moveSibling(doc, 1, 'up')).toBeNull()
    expect(moveSibling(doc, 2, 'down')).toBeNull()
    expect(moveSibling(doc, 0, 'up')).toBeNull()
    expect(moveSibling(doc, 5, 'down')).toBeNull()
  })

  it('dragging moves the line with its children', () => {
    expect(names(applyMove(doc, dropMove(doc, 0, 5, 0)!))).toBe('B .b1 A .a1 .a2 C')
    expect(names(applyMove(doc, dropMove(doc, 5, 0, 0)!))).toBe('C A .a1 .a2 B .b1')
  })

  it('dragging can nest a line under the one above, at most one level deeper', () => {
    expect(names(applyMove(doc, dropMove(doc, 3, 3, 1)!))).toBe('A .a1 .a2 .B ..b1 C')
    expect(names(applyMove(doc, dropMove(doc, 3, 3, 5)!))).toBe('A .a1 .a2 ..B ...b1 C')
  })

  it("can't drop a line inside its own children, or somewhere that changes nothing", () => {
    expect(dropMove(doc, 0, 2, 2)).toBeNull()
    expect(dropMove(doc, 0, 0, 0)).toBeNull()
    expect(dropMove(doc, 0, 3, 0)).toBeNull()
  })
})