// Which top-level blocks of a note belong under which. A heading owns everything
// until the next heading of the same or a higher level; any line owns the lines
// indented further than it that follow. Lists, quotes and code can be children
// but not parents (list items nest on their own).

export interface BlockInfo {
  kind: 'heading' | 'text' | 'other'
  level?: number
  indent: number
}

export const MAX_INDENT = 8

function rank(b: BlockInfo): number {
  return b.indent * 10 + (b.kind === 'heading' ? (b.level ?? 1) : 9)
}

// For each block, the index just after its last child (i + 1 when it has none).
export function childEnds(blocks: BlockInfo[]): number[] {
  const ranks = blocks.map(rank)
  return blocks.map((b, i) => {
    if (b.kind === 'other') return i + 1
    let j = i + 1
    while (j < blocks.length && ranks[j] > ranks[i]) j++
    return j
  })
}

// Blocks hidden because a block above them is collapsed, mapped to the outermost collapsed owner.
export function hiddenBlocks(blocks: BlockInfo[], collapsed: boolean[]): Map<number, number> {
  const ends = childEnds(blocks)
  const hidden = new Map<number, number>()
  for (let i = 0; i < blocks.length; i++) {
    if (!collapsed[i] || hidden.has(i)) continue
    for (let j = i + 1; j < ends[i]; j++) hidden.set(j, i)
  }
  return hidden
}
