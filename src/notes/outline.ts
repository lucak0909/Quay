import { Extension, InputRule, type Editor } from '@tiptap/core'
import type { Node as PMNode } from '@tiptap/pm/model'
import { Plugin, PluginKey, TextSelection, type EditorState } from '@tiptap/pm/state'
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view'
import { childEnds, hiddenBlocks, MAX_INDENT, type BlockInfo } from './outlineTree'

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

// Every top-level line gets a real bullet element (styled, and later clickable and draggable),
// and lines with children get a collapse arrow beside it.
function bulletWidget(state: 'plain' | 'parent' | 'collapsed') {
  const bullet = document.createElement('span')
  bullet.className = `outline-bullet is-${state}`
  bullet.contentEditable = 'false'
  bullet.setAttribute('aria-hidden', 'true')
  bullet.appendChild(document.createElement('span'))
  return bullet
}

function decorations(state: EditorState): DecorationSet {
  const { parents, hidden, items } = analyse(state.doc)
  const decos: Decoration[] = []
  const parentPositions = new Set(parents.map((p) => p.pos))
  state.doc.forEach((node, pos) => {
    if (!INDENTABLE.includes(node.type.name)) return
    const isParent = parentPositions.has(pos)
    const collapsed = isParent && Boolean(node.attrs.collapsed)
    const kind = collapsed ? 'collapsed' : isParent ? 'parent' : 'plain'
    decos.push(
      Decoration.node(pos, pos + node.nodeSize, {
        class: ['outline-line', isParent && 'outline-parent', collapsed && 'is-collapsed'].filter(Boolean).join(' '),
      }),
      Decoration.widget(pos + 1, () => bulletWidget(kind), { side: -1, ignoreSelection: true, key: `bullet-${kind}` }),
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

const key = new PluginKey('outline')

function changeIndent(editor: Editor, delta: 1 | -1): boolean {
  const { state } = editor
  const { from, to } = state.selection
  const tr = state.tr
  let changed = false
  state.doc.nodesBetween(from, to, (node, pos, parent) => {
    if (parent === state.doc && INDENTABLE.includes(node.type.name)) {
      const next = Math.max(0, Math.min(MAX_INDENT, (node.attrs.indent ?? 0) + delta))
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
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key,
        props: {
          decorations: decorations,
        },
        // If the cursor ends up inside hidden lines (arrow keys, undo...), open them up.
        appendTransaction: (_trs, _old, state) => {
          const { from } = state.selection
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
