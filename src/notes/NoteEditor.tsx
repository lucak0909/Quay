import Highlight from '@tiptap/extension-highlight'
import { TaskItem, TaskList } from '@tiptap/extension-list'
import { TableKit } from '@tiptap/extension-table'
import { Placeholder } from '@tiptap/extensions'
import { EditorContent, useEditor, useEditorState, type Editor, type JSONContent } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import { useEffect, useState } from 'react'
import { Outline } from './outline'
import { SlashCommands, type SlashItem, type SlashState } from './slash'

// Rich-text editor that formats as you type, like RemNote or Markdown:
// "# " heading, "- " bullet, "1. " numbered list, "[ ] " checklist, "> " quote,
// **bold**, *italic*, `code`, ==highlight==, ~~strike~~, "---" line, ``` code block.
// Tab / Shift+Tab indent, lines with children collapse, "/" opens a block menu
// (including tables), selecting text shows a formatting bar, and the cursor in a
// table shows table actions.
export default function NoteEditor({
  content,
  onChange,
}: {
  content: JSONContent
  onChange: (content: JSONContent, text: string) => void
}) {
  const [slash, setSlash] = useState<SlashState | null>(null)
  // While the "/" menu is open it handles arrow keys and Enter; it registers its handler here.
  const [slashKeys] = useState(() => {
    const holder: { current: ((event: KeyboardEvent) => boolean) | null } = { current: null }
    return { holder, register: (handler: ((event: KeyboardEvent) => boolean) | null) => (holder.current = handler) }
  })

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: { openOnClick: false, autolink: true },
        // Keep an empty line after tables, lists and code (so you can get out of them), not after text or headings.
        trailingNode: { notAfter: ['paragraph', 'heading'] },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight,
      TableKit.configure({ table: { resizable: true, cellMinWidth: 60 } }),
      Outline,
      SlashCommands.configure({ onState: setSlash, onKey: (event) => slashKeys.holder.current?.(event) ?? false }),
      Placeholder.configure({
        placeholder: ({ editor, node }) =>
          editor.isEmpty
            ? 'Start writing. Type / for headings, lists and more, or Tab to indent.'
            : node.type.name === 'heading'
              ? `Heading ${node.attrs.level}`
              : 'Type / for commands',
      }),
    ],
    content,
    editorProps: { attributes: { class: 'note-editor', 'aria-label': 'Note' } },
    onUpdate: ({ editor }) => onChange(editor.getJSON(), editor.getText({ blockSeparator: '\n' })),
  })

  return (
    <>
      <EditorContent editor={editor} />
      {editor && <FormatBar editor={editor} />}
      {editor && <TableBar editor={editor} />}
      {slash && <SlashMenu key={slash.query} state={slash} register={slashKeys.register} />}
    </>
  )
}

const MARKS = [
  { name: 'bold', label: 'Bold', shortcut: 'Ctrl+B', icon: <b>B</b>, run: (e: Editor) => e.chain().focus().toggleBold().run() },
  { name: 'italic', label: 'Italic', shortcut: 'Ctrl+I', icon: <i className="font-serif">I</i>, run: (e: Editor) => e.chain().focus().toggleItalic().run() },
  { name: 'strike', label: 'Strikethrough', shortcut: 'Ctrl+Shift+S', icon: <s>S</s>, run: (e: Editor) => e.chain().focus().toggleStrike().run() },
  {
    name: 'highlight',
    label: 'Highlight',
    shortcut: 'Ctrl+Shift+H',
    icon: <span className="rounded bg-yellow-200 px-1 text-slate-900">H</span>,
    run: (e: Editor) => e.chain().focus().toggleHighlight().run(),
  },
  { name: 'code', label: 'Code', shortcut: 'Ctrl+E', icon: <code className="text-xs">{'</>'}</code>, run: (e: Editor) => e.chain().focus().toggleCode().run() },
] as const

// Appears above selected text.
function FormatBar({ editor }: { editor: Editor }) {
  const active = useEditorState({
    editor,
    selector: ({ editor }) => Object.fromEntries(MARKS.map((m) => [m.name, editor.isActive(m.name)])) as Record<string, boolean>,
  })
  return (
    <BubbleMenu editor={editor} options={{ placement: 'top', offset: 8 }} className="glass-thick z-40 flex items-center gap-0.5 rounded-full !bg-white/95 p-1 dark:!bg-slate-800/95">
      {MARKS.map((m) => (
        <button
          key={m.name}
          type="button"
          aria-label={m.label}
          aria-pressed={active[m.name]}
          title={`${m.label} (${m.shortcut})`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => m.run(editor)}
          className={`flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-sm transition ${
            active[m.name] ? 'bg-indigo-500 text-white' : 'text-slate-700 hover:bg-black/[.06] dark:text-slate-200 dark:hover:bg-white/10'
          }`}
        >
          {m.icon}
        </button>
      ))}
    </BubbleMenu>
  )
}

const TABLE_ACTIONS = [
  { label: '+ Row', title: 'Add a row below', run: (e: Editor) => e.chain().focus().addRowAfter().run() },
  { label: '+ Column', title: 'Add a column to the right', run: (e: Editor) => e.chain().focus().addColumnAfter().run() },
  { label: '− Row', title: 'Delete this row', run: (e: Editor) => e.chain().focus().deleteRow().run() },
  { label: '− Column', title: 'Delete this column', run: (e: Editor) => e.chain().focus().deleteColumn().run() },
  { label: 'Header', title: 'Turn the header row on or off', run: (e: Editor) => e.chain().focus().toggleHeaderRow().run() },
  { label: 'Delete table', title: 'Delete the whole table', run: (e: Editor) => e.chain().focus().deleteTable().run(), danger: true },
]

// Appears while the cursor is inside a table.
function TableBar({ editor }: { editor: Editor }) {
  return (
    <BubbleMenu
      editor={editor}
      pluginKey="tableBar"
      shouldShow={({ editor, state }) => editor.isEditable && editor.isActive('table') && state.selection.empty}
      // Sit just below the whole table rather than over the rows being edited.
      getReferencedVirtualElement={() => {
        const { node } = editor.view.domAtPos(editor.state.selection.from)
        const table = (node instanceof Element ? node : node.parentElement)?.closest('table')
        return table ? { getBoundingClientRect: () => table.getBoundingClientRect() } : null
      }}
      options={{ placement: 'bottom-start', offset: 8 }}
      className="glass-thick z-40 flex flex-wrap items-center gap-0.5 rounded-full !bg-white/95 p-1 text-xs dark:!bg-slate-800/95"
    >
      {TABLE_ACTIONS.map((a) => (
        <button
          key={a.label}
          type="button"
          title={a.title}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => a.run(editor)}
          className={`rounded-full px-2.5 py-1.5 font-medium transition hover:bg-black/[.06] dark:hover:bg-white/10 ${
            a.danger ? 'text-red-600 dark:text-red-300' : 'text-slate-700 dark:text-slate-200'
          }`}
        >
          {a.label}
        </button>
      ))}
    </BubbleMenu>
  )
}

function SlashMenu({ state, register }: { state: SlashState; register: (handler: ((event: KeyboardEvent) => boolean) | null) => void }) {
  const [index, setIndex] = useState(0)
  const { items, command } = state
  const rect = state.clientRect?.()

  useEffect(() => {
    register((event) => {
      if (items.length === 0) return false
      if (event.key === 'ArrowDown') setIndex((i) => (i + 1) % items.length)
      else if (event.key === 'ArrowUp') setIndex((i) => (i - 1 + items.length) % items.length)
      else if (event.key === 'Enter' || event.key === 'Tab') command(items[index])
      else return false
      return true
    })
    return () => register(null)
  }, [register, items, command, index])

  if (!rect) return null
  const below = rect.bottom + 320 < window.innerHeight
  return (
    <div
      role="listbox"
      aria-label="Insert a block"
      className="glass-thick fixed z-50 w-60 rounded-2xl p-1.5 text-sm"
      style={{ left: Math.min(rect.left, window.innerWidth - 256), ...(below ? { top: rect.bottom + 6 } : { bottom: window.innerHeight - rect.top + 6 }) }}
    >
      {items.length === 0 ? (
        <p className="px-3 py-2 text-slate-500">No matches</p>
      ) : (
        items.map((item: SlashItem, i: number) => (
          <button
            key={item.title}
            type="button"
            role="option"
            aria-selected={i === index}
            onMouseDown={(e) => e.preventDefault()}
            onMouseEnter={() => setIndex(i)}
            onClick={() => command(item)}
            className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left ${
              i === index ? 'bg-indigo-500 text-white' : 'hover:bg-black/[.05] dark:hover:bg-white/10'
            }`}
          >
            {item.title}
            {item.hint && <span className={`font-mono text-xs ${i === index ? 'text-indigo-100' : 'text-slate-400'}`}>{item.hint}</span>}
          </button>
        ))
      )}
    </div>
  )
}
