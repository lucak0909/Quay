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

// The lines that contain block i, outermost first (for the zoom breadcrumb).
export function ancestors(blocks: BlockInfo[], i: number): number[] {
  const ends = childEnds(blocks)
  const out: number[] = []
  for (let k = 0; k < i; k++) if (ends[k] > i && blocks[k].kind !== 'other') out.push(k)
  return out
}

export interface Move {
  // The moving range: a block and all its children, [from, to).
  from: number
  to: number
  // Insert before this index of the original list (equal to the list length for "at the end").
  insertAt: number
  // How much to change the indent of every moved block.
  indentDelta: number
}

// Alt+Shift+↑/↓: swap a line (with its children) with its neighbouring sibling (with its children).
// Lines never leave their parent this way; null when there's no sibling to swap with.
export function moveSibling(blocks: BlockInfo[], i: number, direction: 'up' | 'down'): Move | null {
  const ranks = blocks.map(rank)
  const ends = childEnds(blocks)
  const to = ends[i]
  if (direction === 'up') {
    let k = i - 1
    while (k >= 0 && ranks[k] > ranks[i]) k--
    if (k < 0 || ranks[k] !== ranks[i]) return null
    return { from: i, to, insertAt: k, indentDelta: 0 }
  }
  if (to >= blocks.length || ranks[to] !== ranks[i]) return null
  return { from: i, to, insertAt: ends[to], indentDelta: 0 }
}

// Dragging a line by its bullet: drop it in the gap before block `at` (0..length), at the indent the
// pointer suggests. The indent is limited to one deeper than the line above, and a line can't be
// dropped inside its own children. Null when the drop would change nothing or isn't allowed.
export function dropMove(blocks: BlockInfo[], i: number, at: number, wantedIndent: number): Move | null {
  const to = childEnds(blocks)[i]
  if (at > i && at < to) return null
  // The line that will sit directly above the dropped one (skipping the lines being moved).
  const above = [...blocks.slice(0, at)].reverse().find((_, k) => !(at - 1 - k >= i && at - 1 - k < to))
  const maxIndent = above && above.kind !== 'other' ? above.indent + 1 : above ? above.indent : 0
  const indent = Math.max(0, Math.min(wantedIndent, maxIndent, MAX_INDENT))
  const indentDelta = indent - blocks[i].indent
  if ((at === i || at === to) && indentDelta === 0) return null
  return { from: i, to, insertAt: at, indentDelta }
}

// Apply a move to a plain list (used by tests, and mirrors what the editor does to the document).
export function applyMove<T extends BlockInfo>(blocks: T[], move: Move): T[] {
  const moved = blocks.slice(move.from, move.to).map((b) => ({
    ...b,
    indent: Math.max(0, Math.min(MAX_INDENT, b.indent + move.indentDelta)),
  }))
  const before = blocks.slice(0, move.insertAt).filter((_, k) => k < move.from || k >= move.to)
  const after = blocks.slice(move.insertAt).filter((_, k) => k + move.insertAt < move.from || k + move.insertAt >= move.to)
  return [...before, ...moved, ...after]
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
