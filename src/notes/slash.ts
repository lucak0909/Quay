import { Extension, type Editor, type Range } from '@tiptap/core'
import Suggestion, { type SuggestionProps } from '@tiptap/suggestion'

// Typing "/" opens a menu of blocks to insert, so formatting is discoverable
// without knowing the Markdown shortcuts (which still work and are shown as hints).

export interface SlashItem {
  title: string
  hint: string
  keywords: string
  run: (editor: Editor, range: Range) => void
}

const chain = (editor: Editor, range: Range) => editor.chain().focus().deleteRange(range)

export const SLASH_ITEMS: SlashItem[] = [
  { title: 'Heading 1', hint: '#', keywords: 'h1 title big', run: (e, r) => chain(e, r).setNode('heading', { level: 1 }).run() },
  { title: 'Heading 2', hint: '##', keywords: 'h2 subtitle', run: (e, r) => chain(e, r).setNode('heading', { level: 2 }).run() },
  { title: 'Heading 3', hint: '###', keywords: 'h3', run: (e, r) => chain(e, r).setNode('heading', { level: 3 }).run() },
  { title: 'Text', hint: '', keywords: 'paragraph plain normal', run: (e, r) => chain(e, r).setParagraph().run() },
  { title: 'Bullet list', hint: '-', keywords: 'ul unordered points', run: (e, r) => chain(e, r).toggleBulletList().run() },
  { title: 'Numbered list', hint: '1.', keywords: 'ol ordered steps', run: (e, r) => chain(e, r).toggleOrderedList().run() },
  { title: 'Checklist', hint: '[ ]', keywords: 'todo task checkbox', run: (e, r) => chain(e, r).toggleTaskList().run() },
  { title: 'Quote', hint: '>', keywords: 'blockquote citation', run: (e, r) => chain(e, r).toggleBlockquote().run() },
  {
    title: 'Table',
    hint: '',
    keywords: 'grid columns rows',
    run: (e, r) => chain(e, r).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  { title: 'Code block', hint: '```', keywords: 'code pre programming', run: (e, r) => chain(e, r).toggleCodeBlock().run() },
  { title: 'Divider', hint: '---', keywords: 'hr line separator rule', run: (e, r) => chain(e, r).setHorizontalRule().run() },
]

export function filterSlashItems(query: string): SlashItem[] {
  const q = query.toLowerCase().trim()
  if (!q) return SLASH_ITEMS
  return SLASH_ITEMS.filter((item) => item.title.toLowerCase().includes(q) || item.keywords.includes(q))
}

export type SlashState = Pick<SuggestionProps<SlashItem>, 'items' | 'command' | 'clientRect' | 'query'>

interface SlashOptions {
  onState: (state: SlashState | null) => void
  // Arrow keys, Enter and Tab go to the open menu. (A function, because Tiptap copies option objects.)
  onKey: (event: KeyboardEvent) => boolean
}

export const SlashCommands = Extension.create<SlashOptions>({
  name: 'slashCommands',
  // Above the editor's own Enter / Tab handling, so they go to the menu while it's open.
  priority: 2000,

  addOptions() {
    return { onState: () => {}, onKey: () => false }
  },

  addProseMirrorPlugins() {
    const { onState, onKey } = this.options
    return [
      Suggestion<SlashItem>({
        editor: this.editor,
        char: '/',
        items: ({ query }) => filterSlashItems(query),
        command: ({ editor, range, props }) => props.run(editor, range),
        render: () => {
          let open = false
          const show = (p: SuggestionProps<SlashItem>) => {
            open = true
            onState({ items: p.items, command: p.command, clientRect: p.clientRect, query: p.query })
          }
          return {
            onStart: show,
            onUpdate: show,
            onExit: () => {
              open = false
              onState(null)
            },
            onKeyDown: ({ event }) => {
              if (!open) return false
              if (event.key === 'Escape') {
                open = false
                onState(null)
                return true
              }
              return onKey(event)
            },
          }
        },
      }),
    ]
  },
})
