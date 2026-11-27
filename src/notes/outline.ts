import { Extension, InputRule, type Editor } from '@tiptap/core'
import { Fragment, type Node as PMNode } from '@tiptap/pm/model'
import { Plugin, PluginKey, TextSelection, type EditorState } from '@tiptap/pm/state'
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view'
import { ancestors, childEnds, dropMove, hiddenBlocks, MAX_INDENT, moveSibling, type BlockInfo, type Move } from './outlineTree'

// RemNote-style outlining: Tab / Shift+Tab indent any line, and any line with
// lines under it (or a list item with sub-items) can be collapsed. Both the
// indent and the collapsed state are saved in the note.

const INDENTABLE = ['paragraph', 'heading']
const ITEMS = ['listItem', 'taskItem']
const LISTS = ['bulletList', 'orderedList', 'taskList']

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    outline: {
      indent: (delta: 1 | -1) => ReturnType
      setAllCollapsed: (collapsed: boolean) => ReturnType
      // Show only one line and what's under it (null shows the whole note again).
      setZoom: (pos: number | null) => ReturnType
    }
  }
}

function info(node: PMNode): BlockInfo {
  if (node.type.name === 'heading') return { kind: 'heading', level: node.attrs.level, indent: node.attrs.indent ?? 0 }
  if (node.type.name === 'paragraph') return { kind: 'text', indent: node.attrs.indent ?? 0 }
  return { kind: 'other', indent: 0 }
}

interface Analysis {
  // Top-level blocks that have children: position and whether collapsed.
  parents: { pos: number; node: PMNode }[]
  // Top-level blocks hidden by a collapsed parent, with the parent's position.
  hidden: { pos: number; node: PMNode; owner: number }[]
  // List items with sub-items.
  items: { pos: number; node: PMNode }[]
}

function analyse(doc: PMNode): Analysis {
  const nodes: { pos: number; node: PMNode }[] = []
  doc.forEach((node, offset) => nodes.push({ pos: offset, node }))
  const blocks = nodes.map((n) => info(n.node))
  const ends = childEnds(blocks)
  const hiddenMap = hiddenBlocks(
    blocks,
    nodes.map((n) => Boolean(n.node.attrs.collapsed)),
  )
  const parents = nodes.filter((_, i) => ends[i] > i + 1)
  const hidden = [...hiddenMap].map(([i, owner]) => ({ ...nodes[i], owner: nodes[owner].pos }))
  const items: { pos: number; node: PMNode }[] = []
  doc.descendants((node, pos) => {
    if (ITEMS.includes(node.type.name)) {
      let nested = false
      node.forEach((child) => {
        if (LISTS.includes(child.type.name)) nested = true
      })
      if (nested) items.push({ pos, node })
    }
    return !INDENTABLE.includes(node.type.name)
  })
  return { parents, hidden, items }
}

function toggleAt(view: EditorView, pos: number) {
  const node = view.state.doc.nodeAt(pos)
  if (!node) return
  const collapsed = !node.attrs.collapsed
  const tr = view.state.tr.setNodeAttribute(pos, 'collapsed', collapsed)
  if (collapsed) {
    // Keep the cursor visible: move it out of anything that is about to be hidden.
    const { from } = view.state.selection
    const { hidden } = analyse(tr.doc)
    const inHidden =
      hidden.some((h) => from >= h.pos && from <= h.pos + h.node.nodeSize) ||
      (ITEMS.includes(node.type.name) && from > pos + node.firstChild!.nodeSize && from < pos + node.nodeSize)
    if (inHidden) {
      const firstText = ITEMS.includes(node.type.name) ? pos + 1 + node.firstChild!.nodeSize - 1 : pos + node.nodeSize - 1
      tr.setSelection(TextSelection.create(tr.doc, firstText))
    }
  }
  view.dispatch(tr)
  view.focus()
}

function toggleButton(view: EditorView, getPos: () => number | undefined, collapsed: boolean) {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = collapsed ? 'outline-toggle is-collapsed' : 'outline-toggle'
  button.contentEditable = 'false'
  button.setAttribute('aria-label', collapsed ? 'Expand' : 'Collapse')
  button.setAttribute('aria-expanded', String(!collapsed))
  button.innerHTML =
    '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M4 2.5 7.5 6 4 9.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  button.addEventListener('mousedown', (e) => {
    e.preventDefault()
    e.stopPropagation()
    const widgetPos = getPos()
    if (widgetPos !== undefined) toggleAt(view, widgetPos - 1)
  })
  return button
}

// ---- Top-level lines, zooming and moving -------------------------------------------------

interface Top {
  pos: number
  node: PMNode
  info: BlockInfo
}

function topBlocks(doc: PMNode): Top[] {
  const out: Top[] = []
  doc.forEach((node, pos) => out.push({ pos, node, info: info(node) }))
  return out
}

function indexAt(blocks: Top[], pos: number): number {
  return blocks.findIndex((b) => pos >= b.pos && pos <= b.pos + b.node.nodeSize)
}

const key = new PluginKey<{ zoom: number | null }>('outline')

interface ZoomRange {
  root: number
  from: number
  to: number
  rootIndent: number
}

// The zoomed-in line and the range of lines shown with it.
function zoomRange(state: EditorState): ZoomRange | null {
  const zoom = key.getState(state)?.zoom
  if (zoom == null) return null
  const blocks = topBlocks(state.doc)
  const root = blocks.findIndex((b) => b.pos === zoom)
  if (root < 0 || !INDENTABLE.includes(blocks[root].node.type.name)) return null
  return { root, from: root + 1, to: childEnds(blocks.map((b) => b.info))[root], rootIndent: blocks[root].info.indent }
}

export interface ZoomInfo {
  // The lines above the zoomed line (outermost first), then the zoomed line itself.
  path: { pos: number; text: string }[]
}

export function zoomInfo(state: EditorState): ZoomInfo | null {
  const range = zoomRange(state)
  if (!range) return null
  const blocks = topBlocks(state.doc)
  const chain = [...ancestors(blocks.map((b) => b.info), range.root), range.root]
  return { path: chain.map((i) => ({ pos: blocks[i].pos, text: blocks[i].node.textContent || 'Untitled line' })) }
}

function zoomTo(view: EditorView, pos: number | null) {
  const tr = view.state.tr.setMeta(key, { zoom: pos })
  if (pos != null) {
    const node = tr.doc.nodeAt(pos)
    if (!node) return
    // Zooming into a collapsed line opens it, and the cursor moves to the end of it.
    if (node.attrs.collapsed) tr.setNodeAttribute(pos, 'collapsed', false)
    tr.setSelection(TextSelection.create(tr.doc, pos + node.nodeSize - 1))
  }
  view.dispatch(tr.scrollIntoView())
  view.focus()
}

// Move lines (with their children) in one step, keeping the cursor where it was in the moved text.
function applyMoveInView(view: EditorView, move: Move) {
  const { state } = view
  const blocks = topBlocks(state.doc)
  const start = blocks[move.from].pos
  const last = blocks[move.to - 1]
  const end = last.pos + last.node.nodeSize
  const insert = move.insertAt < blocks.length ? blocks[move.insertAt].pos : state.doc.content.size
  const nodes = blocks.slice(move.from, move.to).map(({ node }) =>
    INDENTABLE.includes(node.type.name) && move.indentDelta
      ? node.type.create(
          { ...node.attrs, indent: Math.max(0, Math.min(MAX_INDENT, (node.attrs.indent ?? 0) + move.indentDelta)) },
          node.content,
          node.marks,
        )
      : node,
  )
  const { from } = state.selection
  const offset = from >= start && from <= end ? from - start : null
  const tr = state.tr.delete(start, end)
  const at = tr.mapping.map(insert)
  tr.insert(at, Fragment.from(nodes))
  if (offset != null) tr.setSelection(TextSelection.near(tr.doc.resolve(Math.min(at + offset, tr.doc.content.size))))
  view.dispatch(tr.scrollIntoView())
}

function moveCurrent(editor: Editor, direction: 'up' | 'down'): boolean {
  const { state, view } = editor
  const blocks = topBlocks(state.doc)
  const i = indexAt(blocks, state.selection.from)
  if (i < 0) return true
  const move = moveSibling(
    blocks.map((b) => b.info),
    i,
    direction,
  )
  const zoom = zoomRange(state)
  // While zoomed in, lines stay inside the zoomed line.
  if (!move || (zoom && (i < zoom.from || move.insertAt < zoom.from || move.insertAt > zoom.to))) return true
  applyMoveInView(view, move)
  return true
}

// Pressing a bullet: a click zooms into the line; dragging moves it (with its children).
function bulletGesture(view: EditorView, getPos: () => number | undefined, down: PointerEvent) {
  if (down.button !== 0) return
  const widgetPos = getPos()
  if (widgetPos === undefined) return
  down.preventDefault()
  const blockPos = widgetPos - 1
  const blocks = topBlocks(view.state.doc)
  const index = blocks.findIndex((b) => b.pos === blockPos)
  if (index < 0) return
  const infos = blocks.map((b) => b.info)
  const to = childEnds(infos)[index]
  const zoom = zoomRange(view.state)
  const step = parseFloat(getComputedStyle(document.documentElement).fontSize) * 1.5
  const shift = zoom ? zoom.rootIndent + 1 : 0
  let dragging = false
  let target: Move | null = null
  const indicator = document.createElement('div')
  indicator.className = 'outline-drop-indicator'
  const sources = blocks.slice(index, to).map((b) => view.nodeDOM(b.pos)).filter((el): el is HTMLElement => el instanceof HTMLElement)

  const onMove = (ev: PointerEvent) => {
    if (!dragging && Math.hypot(ev.clientX - down.clientX, ev.clientY - down.clientY) < 5) return
    if (!dragging) {
      dragging = true
      sources.forEach((el) => el.classList.add('is-drag-source'))
      document.body.appendChild(indicator)
      document.body.classList.add('is-dragging-line')
    }
    // Find the gap the pointer is over, among the lines that are visible.
    const visible = blocks
      .map((b, i) => ({ i, el: view.nodeDOM(b.pos) }))
      .filter((v): v is { i: number; el: HTMLElement } => v.el instanceof HTMLElement && v.el.offsetParent !== null)
    if (!visible.length) return
    let at = blocks.length
    let y = visible.at(-1)!.el.getBoundingClientRect().bottom
    for (const v of visible) {
      const r = v.el.getBoundingClientRect()
      if (ev.clientY < r.top + r.height / 2) {
        at = v.i
        y = r.top
        break
      }
    }
    // Lines that come after a collapsed (hidden) group land after the whole group.
    const line = visible.find((v) => INDENTABLE.includes(blocks[v.i].node.type.name))?.el ?? visible[0].el
    const base = line.getBoundingClientRect().left
    const wanted = Math.floor((ev.clientX - base) / step) + shift
    target = dropMove(infos, index, at, wanted)
    if (target && zoom && (at < zoom.from || at > zoom.to || blocks[index].info.indent + target.indentDelta <= zoom.rootIndent)) target = null
    if (!target) {
      indicator.style.display = 'none'
      return
    }
    const depth = blocks[index].info.indent + target.indentDelta - shift
    const left = base + depth * step + step / 2
    const right = view.dom.getBoundingClientRect().right
    Object.assign(indicator.style, { display: 'block', top: `${y - 1}px`, left: `${left}px`, width: `${Math.max(40, right - left)}px` })
  }
  const finish = (commit: boolean) => {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    window.removeEventListener('pointercancel', onCancel)
    window.removeEventListener('keydown', onKey, true)
    indicator.remove()
    sources.forEach((el) => el.classList.remove('is-drag-source'))
    document.body.classList.remove('is-dragging-line')
    if (!commit) return
    if (dragging && target) applyMoveInView(view, target)
    else if (!dragging) zoomTo(view, blockPos)
  }
  const onUp = () => finish(true)
  const onCancel = () => finish(false)
  const onKey = (ev: KeyboardEvent) => {
    if (ev.key === 'Escape') {
      ev.preventDefault()
      ev.stopPropagation()
      finish(false)
    }
  }
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  window.addEventListener('pointercancel', onCancel)
  window.addEventListener('keydown', onKey, true)
}

// Every top-level line gets a real bullet element: click it to zoom in, drag it to move the line.
// Lines with children also get a collapse arrow beside it.
function bulletWidget(view: EditorView, getPos: () => number | undefined, state: 'plain' | 'parent' | 'collapsed') {
  const bullet = document.createElement('span')
  bullet.className = `outline-bullet is-${state}`
  bullet.contentEditable = 'false'
  bullet.title = 'Click to zoom in, drag to move'
  bullet.appendChild(document.createElement('span'))
  bullet.addEventListener('pointerdown', (e) => bulletGesture(view, getPos, e))
  return bullet
}

function decorations(state: EditorState): DecorationSet {
  const { parents, hidden, items } = analyse(state.doc)
  const decos: Decoration[] = []
  const parentPositions = new Set(parents.map((p) => p.pos))
  const zoom = zoomRange(state)
  let index = -1
  state.doc.forEach((node, pos) => {
    index++
    if (zoom && (index < zoom.root || index >= zoom.to)) {
      decos.push(Decoration.node(pos, pos + node.nodeSize, { class: 'outline-out-of-zoom' }))
      return
    }
    if (!INDENTABLE.includes(node.type.name)) return
    if (zoom && index === zoom.root) {
      decos.push(Decoration.node(pos, pos + node.nodeSize, { class: 'outline-line is-zoom-root' }))
      return
    }
    const isParent = parentPositions.has(pos)
    const collapsed = isParent && Boolean(node.attrs.collapsed)
    const kind = collapsed ? 'collapsed' : isParent ? 'parent' : 'plain'
    decos.push(
      Decoration.node(pos, pos + node.nodeSize, {
        class: ['outline-line', isParent && 'outline-parent', collapsed && 'is-collapsed'].filter(Boolean).join(' '),
      }),
      Decoration.widget(pos + 1, (view, getPos) => bulletWidget(view, getPos, kind), {
        side: -1,
        ignoreSelection: true,
        key: `bullet-${kind}`,
        stopEvent: () => true,
      }),
    )
    if (isParent) {
      decos.push(
        Decoration.widget(pos + 1, (view, getPos) => toggleButton(view, getPos, collapsed), {
          side: -1,
          ignoreSelection: true,
          key: `toggle-${collapsed ? 'c' : 'o'}`,
          stopEvent: () => true,
        }),
      )
    }
  })
  for (const { pos, node } of items) {
    const collapsed = Boolean(node.attrs.collapsed)
    decos.push(Decoration.node(pos, pos + node.nodeSize, { class: collapsed ? 'outline-parent is-collapsed' : 'outline-parent' }))
    decos.push(
      Decoration.widget(pos + 1, (view, getPos) => toggleButton(view, getPos, collapsed), {
        side: -1,
        ignoreSelection: true,
        key: `toggle-${collapsed ? 'c' : 'o'}`,
        stopEvent: () => true,
      }),
    )
  }
  for (const { pos, node } of hidden) decos.push(Decoration.node(pos, pos + node.nodeSize, { class: 'outline-hidden' }))
  return DecorationSet.create(state.doc, decos)
}


function changeIndent(editor: Editor, delta: 1 | -1): boolean {
  const { state } = editor
  const { from, to } = state.selection
  const tr = state.tr
  let changed = false
  // While zoomed in, lines can't be outdented out of the zoomed line (they'd disappear from view).
  const zoom = zoomRange(state)
  const minIndent = zoom ? zoom.rootIndent + 1 : 0
  state.doc.nodesBetween(from, to, (node, pos, parent) => {
    if (parent === state.doc && INDENTABLE.includes(node.type.name) && !(zoom && pos === topBlocks(state.doc)[zoom.root].pos)) {
      const next = Math.max(minIndent, Math.min(MAX_INDENT, (node.attrs.indent ?? 0) + delta))
      if (next !== node.attrs.indent) {
        tr.setNodeAttribute(pos, 'indent', next)
        changed = true
      }
    }
    return parent !== state.doc || !INDENTABLE.includes(node.type.name)
  })
  if (changed) editor.view.dispatch(tr)
  return changed
}

function inItem(editor: Editor): string | null {
  return ITEMS.find((t) => editor.isActive(t)) ?? null
}

export const Outline = Extension.create<{ bulletsOn: () => boolean }>({
  name: 'outline',
  priority: 1000,

  addGlobalAttributes() {
    return [
      {
        types: INDENTABLE,
        attributes: {
          indent: {
            default: 0,
            keepOnSplit: true,
            parseHTML: (el) => Number(el.getAttribute('data-indent')) || 0,
            // The depth goes into a CSS variable, which sets the padding and draws the guide lines.
            renderHTML: (attrs) => (attrs.indent ? { 'data-indent': attrs.indent, style: `--indent: ${attrs.indent}` } : {}),
          },
        },
      },
      {
        types: [...INDENTABLE, ...ITEMS],
        attributes: {
          collapsed: {
            default: false,
            keepOnSplit: false,
            parseHTML: (el) => el.getAttribute('data-collapsed') === 'true',
            renderHTML: (attrs) => (attrs.collapsed ? { 'data-collapsed': 'true' } : {}),
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      indent:
        (delta) =>
        ({ editor }) =>
          changeIndent(editor, delta),
      setAllCollapsed:
        (collapsed) =>
        ({ state, dispatch }) => {
          const { parents, items } = analyse(state.doc)
          const tr = state.tr
          for (const { pos, node } of [...parents, ...items]) {
            if (Boolean(node.attrs.collapsed) !== collapsed) tr.setNodeAttribute(pos, 'collapsed', collapsed)
          }
          // Keep the cursor on something visible.
          if (collapsed) tr.setSelection(TextSelection.atStart(tr.doc))
          if (dispatch) dispatch(tr)
          return true
        },
      setZoom:
        (pos) =>
        ({ view }) => {
          zoomTo(view, pos)
          return true
        },
    }
  },

  addOptions() {
    return { bulletsOn: () => true }
  },

  addInputRules() {
    // With bullets on, every line already is a bullet, so "- " or "* " at the start of a line just clears
    // instead of starting a separate bullet list (which would look like a second kind of bullet).
    return [
      new InputRule({
        find: /^\s*[-+*]\s$/,
        handler: ({ state, range }) => {
          const $from = state.doc.resolve(range.from)
          if (!this.options.bulletsOn() || $from.depth !== 1 || $from.parent.type.name !== 'paragraph') return null
          state.tr.delete(range.from, range.to)
        },
      }),
    ]
  },

  addKeyboardShortcuts() {
    return {
      // Tab never leaves the note: it indents, or nests a list item. In a table it moves between cells.
      Tab: ({ editor }) => {
        if (editor.isActive('table')) return false
        const item = inItem(editor)
        if (item) {
          editor.commands.sinkListItem(item)
          return true
        }
        if (editor.isActive('codeBlock')) return editor.commands.insertContent('  ')
        changeIndent(editor, 1)
        return true
      },
      'Shift-Tab': ({ editor }) => {
        if (editor.isActive('table')) return false
        const item = inItem(editor)
        if (item) {
          editor.commands.liftListItem(item)
          return true
        }
        changeIndent(editor, -1)
        return true
      },
      // Backspace at the start of an indented line outdents it first.
      Backspace: ({ editor }) => {
        const { selection } = editor.state
        const { $from, empty } = selection
        if (!empty || $from.parentOffset !== 0 || $from.depth !== 1) return false
        const node = $from.parent
        if (!INDENTABLE.includes(node.type.name) || !node.attrs.indent) return false
        return changeIndent(editor, -1)
      },
      // Ctrl/Cmd + Up/Down collapse and expand the current line, like RemNote.
      'Mod-ArrowUp': ({ editor }) => setCollapsed(editor, true),
      'Mod-ArrowDown': ({ editor }) => setCollapsed(editor, false),
      // Alt+Shift + Up/Down move the current line (with everything under it) past its neighbour.
      'Alt-Shift-ArrowUp': ({ editor }) => moveCurrent(editor, 'up'),
      'Alt-Shift-ArrowDown': ({ editor }) => moveCurrent(editor, 'down'),
      // Escape zooms out one level.
      Escape: ({ editor }) => {
        const info = zoomInfo(editor.state)
        if (!info) return false
        zoomTo(editor.view, info.path.length > 1 ? info.path.at(-2)!.pos : null)
        return true
      },
      // Enter on the zoomed-in line starts its first child, rather than a sibling that would be out of view.
      Enter: ({ editor }) => {
        const zoom = zoomRange(editor.state)
        if (!zoom) return false
        const rootPos = topBlocks(editor.state.doc)[zoom.root].pos
        if (editor.state.selection.$from.before(1) !== rootPos) return false
        return editor
          .chain()
          .splitBlock()
          .command(({ tr }) => {
            const pos = tr.selection.$from.before(1)
            const node = tr.doc.nodeAt(pos)
            if (node?.type.name === 'paragraph') tr.setNodeAttribute(pos, 'indent', zoom.rootIndent + 1)
            return true
          })
          .run()
      },
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key,
        // Which line is zoomed into (by position, kept up to date as the note changes).
        state: {
          init: () => ({ zoom: null as number | null }),
          apply: (tr, value) => {
            const meta = tr.getMeta(key) as { zoom: number | null } | undefined
            if (meta) return { zoom: meta.zoom }
            if (value.zoom == null || !tr.docChanged) return value
            const mapped = tr.mapping.mapResult(value.zoom)
            const node = mapped.deleted ? null : tr.doc.nodeAt(mapped.pos)
            return { zoom: node && INDENTABLE.includes(node.type.name) ? mapped.pos : null }
          },
        },
        props: {
          decorations: decorations,
          // While zoomed in, everything shifts left so the zoomed line's children start at the margin.
          attributes: (state): Record<string, string> => {
            const zoom = zoomRange(state)
            return zoom ? { class: 'is-zoomed', style: `--zoom-indent: ${zoom.rootIndent + 1}` } : {}
          },
        },
        // If the cursor ends up inside hidden lines (arrow keys, undo...), open them up.
        appendTransaction: (_trs, _old, state) => {
          const { from } = state.selection
          // While zoomed in, keep the cursor inside the zoomed line and its children.
          const zoom = zoomRange(state)
          if (zoom) {
            const blocks = topBlocks(state.doc)
            const first = blocks[zoom.root].pos
            const last = blocks[zoom.to - 1]
            const end = last.pos + last.node.nodeSize
            if (from < first || from > end) return state.tr.setSelection(TextSelection.near(state.doc.resolve(Math.min(end - 1, Math.max(first + 1, from)))))
          }
          const { hidden, items } = analyse(state.doc)
          const owner = hidden.find((h) => from >= h.pos && from <= h.pos + h.node.nodeSize)?.owner
          if (owner !== undefined) return state.tr.setNodeAttribute(owner, 'collapsed', false)
          const item = items.find(
            (i) => i.node.attrs.collapsed && from > i.pos + i.node.firstChild!.nodeSize && from < i.pos + i.node.nodeSize,
          )
          if (item) return state.tr.setNodeAttribute(item.pos, 'collapsed', false)
          return null
        },
      }),
    ]
  },
})

function setCollapsed(editor: Editor, collapsed: boolean): boolean {
  const { state, view } = editor
  const { from } = state.selection
  const { parents, items } = analyse(state.doc)
  // The innermost collapsible thing around the cursor: a list item first, then a top-level line.
  const target =
    [...items].reverse().find((i) => from > i.pos && from < i.pos + 1 + i.node.firstChild!.nodeSize) ??
    parents.find((p) => from > p.pos && from < p.pos + p.node.nodeSize)
  if (!target || Boolean(target.node.attrs.collapsed) === collapsed) return Boolean(target)
  toggleAt(view, target.pos)
  return true
}
