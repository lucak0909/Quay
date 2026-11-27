import Highlight from '@tiptap/extension-highlight'
import { TaskItem, TaskList } from '@tiptap/extension-list'
import { TableKit } from '@tiptap/extension-table'
import { Placeholder } from '@tiptap/extensions'
import { EditorContent, useEditor, useEditorState, type Editor, type JSONContent } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { EditorIcons, SLASH_ICONS } from './icons'
import { Outline, zoomInfo } from './outline'
import { SlashCommands, type SlashItem, type SlashState } from './slash'

// Rich-text editor that formats as you type, like RemNote or Markdown:
// "# " heading, "1. " numbered list, "[ ] " checklist, "> " quote, **bold**, *italic*,
// `code`, ==highlight==, ~~strike~~, "---" line, ``` code block. Every line is a bullet
// (unless turned off); Tab / Shift+Tab indent, lines with children collapse, "/" opens a
// block menu, selecting text shows a formatting bar, and inside a table a table bar.
export default function NoteEditor({
  content,
  onChange,
  bullets,
  title,
  onReady,
  onExitTop,
}: {
  content: JSONContent
  onChange: (content: JSONContent, text: string) => void
  bullets: boolean
  // The note's title, shown as the first step of the breadcrumb when zoomed in.
  title: string
  // Gives the page the editor, for commands like "Collapse all".
  onReady?: (editor: Editor) => void
  // Up arrow or Backspace at the very start of the note: go back to the title.
  onExitTop?: () => void
}) {
  const [slash, setSlash] = useState<SlashState | null>(null)
  // Plain holders the editor's extensions read from (created once; not React state).
  const [live] = useState(() => {
    const holder = {
      slashKey: null as ((event: KeyboardEvent) => boolean) | null,
      bullets: true,
      exitTop: undefined as (() => void) | undefined,
    }
    return {
      holder,
      register: (handler: ((event: KeyboardEvent) => boolean) | null) => (holder.slashKey = handler),
      update: (next: { bullets: boolean; exitTop?: () => void }) => {
        holder.bullets = next.bullets
        holder.exitTop = next.exitTop
      },
    }
  })
  useEffect(() => {
    live.update({ bullets, exitTop: onExitTop })
  }, [live, bullets, onExitTop])

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
      Outline.configure({ bulletsOn: () => live.holder.bullets }),
      SlashCommands.configure({ onState: setSlash, onKey: (event) => live.holder.slashKey?.(event) ?? false }),
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
    editorProps: {
      attributes: { class: 'note-editor', 'aria-label': 'Note' },
      handleKeyDown: (view, event) => {
        const { selection, doc } = view.state
        const atStart = selection.empty && selection.from <= 1
        const firstEmpty = doc.childCount === 1 && doc.firstChild?.content.size === 0
        if (atStart && (event.key === 'ArrowUp' || (event.key === 'Backspace' && firstEmpty)) && live.holder.exitTop) {
          event.preventDefault()
          live.holder.exitTop()
          return true
        }
        return false
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getJSON(), editor.getText({ blockSeparator: '\n' })),
  })

  useEffect(() => {
    if (editor) onReady?.(editor)
  }, [editor, onReady])

  return (
    <>
      {editor && <ZoomBar editor={editor} title={title} />}
      <EditorContent editor={editor} />
      {editor && <FormatBar editor={editor} bullets={bullets} />}
      {editor && <TableBar editor={editor} />}
      {slash && <SlashMenu key={slash.query} state={slash} register={live.register} />}
    </>
  )
}

const bar =
  'glass-thick z-40 flex items-center gap-0.5 rounded-2xl !bg-white/95 p-1 text-sm shadow-xl dark:!bg-slate-800/95'
const barButton = (on = false) =>
  `flex h-8 min-w-8 items-center justify-center gap-1 rounded-xl px-2 transition ${
    on ? 'bg-indigo-500 text-white' : 'text-slate-700 hover:bg-black/[.06] dark:text-slate-200 dark:hover:bg-white/10'
  }`
const Divider = () => <span className="mx-0.5 h-5 w-px bg-black/10 dark:bg-white/15" aria-hidden="true" />

const MARKS = [
  { name: 'bold', label: 'Bold', shortcut: 'Ctrl+B', Icon: EditorIcons.Bold, run: (e: Editor) => e.chain().focus().toggleBold().run() },
  { name: 'italic', label: 'Italic', shortcut: 'Ctrl+I', Icon: EditorIcons.Italic, run: (e: Editor) => e.chain().focus().toggleItalic().run() },
  { name: 'underline', label: 'Underline', shortcut: 'Ctrl+U', Icon: EditorIcons.Underline, run: (e: Editor) => e.chain().focus().toggleUnderline().run() },
  { name: 'strike', label: 'Strikethrough', shortcut: 'Ctrl+Shift+S', Icon: EditorIcons.Strikethrough, run: (e: Editor) => e.chain().focus().toggleStrike().run() },
  { name: 'highlight', label: 'Highlight', shortcut: 'Ctrl+Shift+H', Icon: EditorIcons.Highlighter, run: (e: Editor) => e.chain().focus().toggleHighlight().run() },
  { name: 'code', label: 'Code', shortcut: 'Ctrl+E', Icon: EditorIcons.Code, run: (e: Editor) => e.chain().focus().toggleCode().run() },
] as const

const BLOCK_TYPES = [
  { id: 'paragraph', label: 'Text', icon: SLASH_ICONS.text, run: (e: Editor) => e.chain().focus().setParagraph().run() },
  { id: 'h1', label: 'Heading 1', icon: SLASH_ICONS.h1, run: (e: Editor) => e.chain().focus().setNode('heading', { level: 1 }).run() },
  { id: 'h2', label: 'Heading 2', icon: SLASH_ICONS.h2, run: (e: Editor) => e.chain().focus().setNode('heading', { level: 2 }).run() },
  { id: 'h3', label: 'Heading 3', icon: SLASH_ICONS.h3, run: (e: Editor) => e.chain().focus().setNode('heading', { level: 3 }).run() },
  { id: 'bulletList', label: 'Bullet list', icon: SLASH_ICONS.bullet, run: (e: Editor) => e.chain().focus().toggleBulletList().run() },
  { id: 'orderedList', label: 'Numbered list', icon: SLASH_ICONS.numbered, run: (e: Editor) => e.chain().focus().toggleOrderedList().run() },
  { id: 'taskList', label: 'Checklist', icon: SLASH_ICONS.check, run: (e: Editor) => e.chain().focus().toggleTaskList().run() },
  { id: 'blockquote', label: 'Quote', icon: SLASH_ICONS.quote, run: (e: Editor) => e.chain().focus().toggleBlockquote().run() },
] as const

function currentBlock(editor: Editor): string {
  for (const id of ['taskList', 'orderedList', 'bulletList', 'blockquote'] as const) if (editor.isActive(id)) return id
  for (const level of [1, 2, 3]) if (editor.isActive('heading', { level })) return `h${level}`
  return 'paragraph'
}

// Appears above selected text.
function FormatBar({ editor, bullets }: { editor: Editor; bullets: boolean }) {
  const state = useEditorState({
    editor,
    selector: ({ editor }) => ({
      marks: Object.fromEntries(MARKS.map((m) => [m.name, editor.isActive(m.name)])) as Record<string, boolean>,
      link: editor.getAttributes('link').href as string | undefined,
      block: currentBlock(editor),
    }),
  })
  const [mode, setMode] = useState<'marks' | 'link' | 'turn'>('marks')
  const [href, setHref] = useState('')
  const blockTypes = BLOCK_TYPES.filter((b) => !(bullets && b.id === 'bulletList'))
  const current = BLOCK_TYPES.find((b) => b.id === state.block) ?? BLOCK_TYPES[0]

  function applyLink() {
    const url = href.trim()
    const chain = editor.chain().focus().extendMarkRange('link')
    if (!url) chain.unsetLink().run()
    else chain.setLink({ href: /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}` }).run()
    setMode('marks')
  }

  return (
    <BubbleMenu editor={editor} options={{ placement: 'top', offset: 10, onHide: () => setMode('marks') }} className={bar}>
      {mode === 'link' ? (
        <form
          className="flex items-center gap-1"
          onSubmit={(e) => {
            e.preventDefault()
            applyLink()
          }}
        >
          <EditorIcons.Link className="mx-1.5 h-4 w-4 text-slate-400" aria-hidden="true" />
          <input
            autoFocus
            aria-label="Link address"
            placeholder="Paste a link"
            value={href}
            onChange={(e) => setHref(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && setMode('marks')}
            className="w-56 bg-transparent px-1 py-1 outline-none placeholder:text-slate-400"
          />
          <button type="submit" className={barButton()}>
            {href.trim() ? 'Apply' : 'Remove'}
          </button>
        </form>
      ) : mode === 'turn' ? (
        <div role="menu" aria-label="Turn into" className="flex flex-col p-0.5">
          {blockTypes.map((b) => (
            <button
              key={b.id}
              type="button"
              role="menuitem"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                b.run(editor)
                setMode('marks')
              }}
              className={`flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left ${
                b.id === state.block ? 'bg-indigo-500/12 text-indigo-700 dark:text-indigo-200' : 'hover:bg-black/[.05] dark:hover:bg-white/10'
              }`}
            >
              <b.icon className="h-4 w-4 opacity-70" aria-hidden="true" />
              {b.label}
            </button>
          ))}
        </div>
      ) : (
        <>
          <button
            type="button"
            title="Turn into"
            aria-label={`Turn into (now ${current.label})`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setMode('turn')}
            className={`${barButton()} pr-1.5 font-medium`}
          >
            {current.label}
            <ChevronDown className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />
          </button>
          <Divider />
          {MARKS.map((m) => (
            <button
              key={m.name}
              type="button"
              aria-label={m.label}
              aria-pressed={state.marks[m.name]}
              title={`${m.label} (${m.shortcut})`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => m.run(editor)}
              className={barButton(state.marks[m.name])}
            >
              <m.Icon className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
            </button>
          ))}
          <Divider />
          <button
            type="button"
            aria-label="Link"
            aria-pressed={Boolean(state.link)}
            title="Link"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setHref(state.link ?? '')
              setMode('link')
            }}
            className={barButton(Boolean(state.link))}
          >
            <EditorIcons.Link className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
          </button>
        </>
      )}
    </BubbleMenu>
  )
}

const TABLE_ACTIONS: { label: string; title: string; icon: ReactNode; run: (e: Editor) => boolean; danger?: boolean }[] = [
  { label: 'Row', title: 'Add a row below', icon: <EditorIcons.Rows3 className="h-4 w-4" />, run: (e) => e.chain().focus().addRowAfter().run() },
  { label: 'Column', title: 'Add a column to the right', icon: <EditorIcons.Columns3 className="h-4 w-4" />, run: (e) => e.chain().focus().addColumnAfter().run() },
  { label: 'Header', title: 'Turn the header row on or off', icon: <EditorIcons.TableProperties className="h-4 w-4" />, run: (e) => e.chain().focus().toggleHeaderRow().run() },
]
const TABLE_REMOVE: typeof TABLE_ACTIONS = [
  { label: 'Row', title: 'Delete this row', icon: <EditorIcons.Rows3 className="h-4 w-4" />, run: (e) => e.chain().focus().deleteRow().run() },
  { label: 'Column', title: 'Delete this column', icon: <EditorIcons.Columns3 className="h-4 w-4" />, run: (e) => e.chain().focus().deleteColumn().run() },
  { label: 'Table', title: 'Delete the whole table', icon: <EditorIcons.Trash2 className="h-4 w-4" />, run: (e) => e.chain().focus().deleteTable().run(), danger: true },
]

// Appears below a table while the cursor is inside it.
function TableBar({ editor }: { editor: Editor }) {
  const button = (a: (typeof TABLE_ACTIONS)[number], prefix: string) => (
    <button
      key={prefix + a.label}
      type="button"
      title={a.title}
      aria-label={a.title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => a.run(editor)}
      className={`${barButton()} text-xs font-medium ${a.danger ? '!text-red-600 dark:!text-red-300' : ''}`}
    >
      {a.icon}
      {prefix}
      {a.label}
    </button>
  )
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
      className={`${bar} flex-wrap`}
    >
      {TABLE_ACTIONS.map((a) => button(a, a.label === 'Header' ? '' : '+ '))}
      <Divider />
      {TABLE_REMOVE.map((a) => button(a, '− '))}
    </BubbleMenu>
  )
}

function SlashMenu({ state, register }: { state: SlashState; register: (handler: ((event: KeyboardEvent) => boolean) | null) => void }) {
  const [index, setIndex] = useState(0)
  const rows = useRef<(HTMLButtonElement | null)[]>([])
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

  // Keep the highlighted row visible when moving with the arrow keys. (Braces matter: newer browsers return a\n  // Promise from scrollIntoView, which React would mistake for a clean-up function.)
  useEffect(() => {
    rows.current[index]?.scrollIntoView({ block: 'nearest' })
  }, [index])

  if (!rect) return null
  const below = rect.bottom + 380 < window.innerHeight
  return (
    <div
      role="listbox"
      aria-label="Insert a block"
      className="glass-thick fixed z-50 max-h-[23rem] w-72 overflow-y-auto rounded-2xl !bg-white/95 p-1.5 text-sm shadow-xl dark:!bg-slate-800/95"
      style={{ left: Math.min(rect.left, window.innerWidth - 300), ...(below ? { top: rect.bottom + 6 } : { bottom: window.innerHeight - rect.top + 6 }) }}
    >
      {items.length === 0 ? (
        <p className="px-3 py-2 text-slate-500">No matches</p>
      ) : (
        items.map((item: SlashItem, i: number) => {
          const Icon = SLASH_ICONS[item.icon]
          const groupStart = i === 0 || items[i - 1].group !== item.group
          return (
            <div key={item.title}>
              {groupStart && (
                <p className="px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400 first:pt-1">
                  {item.group}
                </p>
              )}
              <button
                ref={(el) => {
                  rows.current[i] = el
                }}
                type="button"
                role="option"
                aria-selected={i === index}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setIndex(i)}
                onClick={() => command(item)}
                className={`flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left ${
                  i === index ? 'bg-indigo-500/12 dark:bg-indigo-400/15' : ''
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                    i === index
                      ? 'border-indigo-300 bg-white text-indigo-600 dark:border-indigo-400/40 dark:bg-white/10 dark:text-indigo-200'
                      : 'border-black/[.06] bg-white/70 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300'
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-slate-800 dark:text-slate-100">{item.title}</span>
                  <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{item.description}</span>
                </span>
                {item.hint && <span className="font-mono text-xs text-slate-400">{item.hint}</span>}
              </button>
            </div>
          )
        })
      )}
    </div>
  )
}

// While zoomed into a line: where you are, with a way back out.
function ZoomBar({ editor, title }: { editor: Editor; title: string }) {
  const zoom = useEditorState({ editor, selector: ({ editor }) => zoomInfo(editor.state) })
  if (!zoom) return null
  const crumb = 'max-w-48 truncate rounded-full px-2 py-0.5 hover:bg-black/[.05] hover:text-slate-800 dark:hover:bg-white/10 dark:hover:text-white'
  return (
    <nav aria-label="Zoomed in" className="-ml-2 mb-3 flex flex-wrap items-center gap-0.5 text-sm text-slate-500 dark:text-slate-400">
      <button type="button" className={crumb} onClick={() => editor.commands.setZoom(null)}>
        {title.trim() || 'Untitled note'}
      </button>
      {zoom.path.slice(0, -1).map((step) => (
        <span key={step.pos} className="flex items-center gap-0.5">
          <ChevronRight className="h-3.5 w-3.5 opacity-50" aria-hidden="true" />
          <button type="button" className={crumb} onClick={() => editor.commands.setZoom(step.pos)}>
            {step.text}
          </button>
        </span>
      ))}
      <ChevronRight className="h-3.5 w-3.5 opacity-50" aria-hidden="true" />
      <span className="max-w-48 truncate px-2 font-medium text-slate-700 dark:text-slate-200">{zoom.path.at(-1)!.text}</span>
      <span className="ml-auto hidden text-xs text-slate-400 sm:inline">Esc to zoom out</span>
    </nav>
  )
}