import { describe, expect, it } from 'vitest'
import { canMoveFolder, childFolders, decksIn, flattenTree, folderPath, folderTotals, subtreeIds } from './tree'

// School
// ├─ Biology
// │  └─ Cells
// └─ Maths
// Hobbies
const folders = [
  { id: 'school', name: 'School' },
  { id: 'bio', name: 'Biology', parentId: 'school' },
  { id: 'cells', name: 'Cells', parentId: 'bio' },
  { id: 'maths', name: 'Maths', parentId: 'school' },
  { id: 'hobbies', name: 'Hobbies' },
]

describe('folder tree', () => {
  it('lists children by name, naturally ordered', () => {
    const list = [
      { id: 'a', name: 'Week 10' },
      { id: 'b', name: 'week 2' },
      { id: 'c', name: 'Week 1' },
    ]
    expect(childFolders(list, undefined).map((f) => f.name)).toEqual(['Week 1', 'week 2', 'Week 10'])
    expect(childFolders(folders, 'school').map((f) => f.id)).toEqual(['bio', 'maths'])
  })

  it('shows items whose folder is missing at the top level', () => {
    const decks = [
      { id: 'd1', name: 'Lost', folderId: 'deleted' },
      { id: 'd2', name: 'Top' },
      { id: 'd3', name: 'Cell parts', folderId: 'cells' },
    ]
    expect(decksIn(folders, decks, undefined).map((d) => d.id)).toEqual(['d1', 'd2'])
    expect(decksIn(folders, decks, 'cells').map((d) => d.id)).toEqual(['d3'])
    expect(childFolders([{ id: 'x', name: 'Orphan', parentId: 'gone' }], undefined)).toHaveLength(1)
  })

  it('finds everything inside a folder', () => {
    expect([...subtreeIds(folders, 'school')].sort()).toEqual(['bio', 'cells', 'maths', 'school'])
    expect([...subtreeIds(folders, 'hobbies')]).toEqual(['hobbies'])
  })

  it("won't move a folder into itself or its own subfolders", () => {
    expect(canMoveFolder(folders, 'school', 'cells')).toBe(false)
    expect(canMoveFolder(folders, 'school', 'school')).toBe(false)
    expect(canMoveFolder(folders, 'bio', 'maths')).toBe(true)
    expect(canMoveFolder(folders, 'cells', undefined)).toBe(true)
  })

  it('builds the path from the top level', () => {
    expect(folderPath(folders, 'cells').map((f) => f.id)).toEqual(['school', 'bio', 'cells'])
    expect(folderPath(folders, undefined)).toEqual([])
  })

  it('stops on a corrupted loop instead of hanging', () => {
    const loop = [
      { id: 'a', name: 'A', parentId: 'b' },
      { id: 'b', name: 'B', parentId: 'a' },
    ]
    expect(folderPath(loop, 'a').map((f) => f.id)).toEqual(['b', 'a'])
  })

  it('adds up decks, cards and due counts through parent folders', () => {
    const decks = [
      { id: 'd1', name: 'Organelles', folderId: 'cells', cardCount: 10, dueCount: 4 },
      { id: 'd2', name: 'Algebra', folderId: 'maths', cardCount: 5, dueCount: 1 },
      { id: 'd3', name: 'Loose', cardCount: 3, dueCount: 3 },
    ]
    const totals = folderTotals(folders, decks)
    expect(totals.get('school')).toEqual({ decks: 2, cards: 15, due: 5 })
    expect(totals.get('bio')).toEqual({ decks: 1, cards: 10, due: 4 })
    expect(totals.get('hobbies')).toEqual({ decks: 0, cards: 0, due: 0 })
  })

  it('flattens the tree with depths, leaving out excluded branches', () => {
    expect(flattenTree(folders).map(({ folder, depth }) => `${depth}:${folder.id}`)).toEqual([
      '0:hobbies',
      '0:school',
      '1:bio',
      '2:cells',
      '1:maths',
    ])
    expect(flattenTree(folders, new Set(['bio'])).map(({ folder }) => folder.id)).toEqual(['hobbies', 'school', 'maths'])
  })
})
