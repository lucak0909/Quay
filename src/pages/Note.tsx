import type { Editor, JSONContent } from '@tiptap/react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Check, ChevronLeft, LoaderCircle, Sparkles } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Dialog from '../components/Dialog'
import Menu from '../components/Menu'
import MoveDialog from '../components/MoveDialog'
import { db, type Note as NoteRow } from '../db'
import { deleteNote, moveNote } from '../folders/actions'
import { colorInfo } from '../folders/colors'
import { folderPath } from '../folders/tree'
import NoteEditor from '../notes/NoteEditor'
import { btnDanger, btnSecondary, muted } from '../ui'

const SAVE_DELAY = 400
const BULLETS_KEY = 'noteBullets'
const MINUTE = 60_000

export default function Note() {
  const { id = '' } = useParams()
  // Load once: the editor owns the content while it's open, so live updates would fight the cursor.
  const [note, setNote] = useState<NoteRow | null | undefined>(undefined)
  useEffect(() => {
    db.notes.get(id).then((n) => setNote(n ?? null))
  }, [id])

  if (note === undefined) return null
  if (note === null) {
    return (
      <p className={muted}>
        This note doesn't exist. <Link to="/decks" className="underline">Back to your library</Link>
      </p>
    )
  }
  return <NoteView key={note.id} note={note} />
}

function countWords(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0
}

function edited(at: number, now: number) {
  const ago = now - at
  if (ago < MINUTE) return 'Edited just now'
  if (ago < 60 * MINUTE) return `Edited ${Math.round(ago / MINUTE)} min ago`
  if (ago < 24 * 60 * MINUTE) return `Edited ${Math.round(ago / (60 * MINUTE))} h ago`
  return `Edited ${new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`
}

const SHORTCUTS: [string, string][] = [
  ['Tab / Shift+Tab', 'Indent or outdent a line'],
  ['Ctrl+↑ / Ctrl+↓', 'Collapse or expand a line'],
  ['Alt+Shift+↑ / ↓', 'Move a line (and what’s under it) up or down'],
  ['Click a bullet', 'Zoom into that line (Esc to zoom out)'],
  ['Drag a bullet', 'Move a line anywhere, or nest it'],
  ['/', 'Insert a heading, list, table…'],
  ['# , ## , ###', 'Headings'],
  ['1.  or  [ ]', 'Numbered list or checklist'],
  ['>', 'Quote'],
  ['**bold**  *italic*', 'Bold and italic'],
  ['==text==', 'Highlight'],
  ['`code`', 'Inline code'],
  ['Ctrl+B / I / U / E', 'Bold, italic, underline, code'],
  ['Ctrl+Z / Ctrl+Shift+Z', 'Undo and redo'],
]

function NoteView({ note }: { note: NoteRow }) {
  const navigate = useNavigate()
  const [folderId, setFolderId] = useState(note.folderId)
  const folders = useLiveQuery(() => db.folders.toArray())
  const path = folders ? folderPath(folders, folderId) : []
  const [name, setName] = useState(note.name)
  const [text, setText] = useState(note.text)
  const [status, setStatus] = useState<'saved' | 'saving'>('saved')
  const [lastEdited, setLastEdited] = useState(note.updatedAt)
  const [now, setNow] = useState(note.updatedAt)
  const [dialog, setDialog] = useState<'delete' | 'move' | 'shortcuts' | null>(null)
  const [editor, setEditor] = useState<Editor | null>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  // Every line shows a bullet by default, like RemNote. One setting for all notes.
  const bullets = useLiveQuery(async () => (await db.appSettings.get(BULLETS_KEY))?.value !== 'false') ?? true

  // Keep "Edited 3 min ago" current.
  useEffect(() => {
    const tick = () => setNow(Date.now())
    tick()
    const timer = window.setInterval(tick, 30_000)
    return () => window.clearInterval(timer)
  }, [])

  // Changes wait briefly, then save together. Anything pending is saved when leaving the page.
  const pending = useRef<Partial<NoteRow> | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const flush = useCallback(() => {
    window.clearTimeout(timer.current)
    const changes = pending.current
    if (!changes) return
    pending.current = null
    const at = Date.now()
    db.notes.update(note.id, { ...changes, updatedAt: at }).then(() => {
      setLastEdited(at)
      setNow(at)
      if (!pending.current) setStatus('saved')
    })
  }, [note.id])
  const queue = (changes: Partial<NoteRow>) => {
    pending.current = { ...pending.current, ...changes }
    setStatus('saving')
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(flush, SAVE_DELAY)
  }
  useEffect(() => {
    window.addEventListener('pagehide', flush)
    return () => {
      window.removeEventListener('pagehide', flush)
      flush()
    }
  }, [flush])

  const onEditorChange = useCallback((content: JSONContent, newText: string) => {
    setText(newText)
    pending.current = { ...pending.current, content, text: newText }
    setStatus('saving')
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(flush, SAVE_DELAY)
  }, [flush])

  const exitToTitle = useCallback(() => {
    const title = titleRef.current
    if (!title) return
    title.focus()
    title.setSelectionRange(title.value.length, title.value.length)
  }, [])

  const hasText = text.trim() !== ''
  const words = countWords(text)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <nav aria-label="Folders" className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-sm text-slate-500 dark:text-slate-400">
          <Link to="/decks" className="flex items-center gap-0.5 rounded-full py-1 pl-1 pr-2 hover:bg-white/60 hover:text-slate-800 dark:hover:bg-white/10 dark:hover:text-white">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Library
          </Link>
          {path.map((folder) => (
            <span key={folder.id} className="flex items-center gap-1.5">
              <span className="text-slate-300 dark:text-slate-600">/</span>
              <Link
                to={`/decks?folder=${folder.id}`}
                className="flex items-center gap-1.5 rounded-full px-2 py-1 hover:bg-white/60 hover:text-slate-800 dark:hover:bg-white/10 dark:hover:text-white"
              >
                <span className={`h-2 w-2 rounded-full ${colorInfo(folder.color).swatch}`} aria-hidden="true" />
                {folder.name}
              </Link>
            </span>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="flex items-center gap-1 px-1 text-xs text-slate-500 dark:text-slate-400" aria-live="polite">
            {status === 'saving' ? (
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Check className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
            )}
            {status === 'saving' ? 'Saving…' : 'Saved'}
          </span>
          <button
            type="button"
            className={`${btnSecondary} py-2`}
            disabled={!hasText}
            title={hasText ? 'Turn this note into flashcards' : 'Write something first'}
            onClick={() => {
              flush()
              navigate(`/generate?note=${note.id}`)
            }}
          >
            <Sparkles className="h-4 w-4 text-indigo-500" aria-hidden="true" />
            Make cards
          </button>
          <Menu
            label="Note options"
            items={[
              {
                label: bullets ? 'Hide bullets' : 'Show bullets',
                onSelect: () => db.appSettings.put({ key: BULLETS_KEY, value: String(!bullets) }),
              },
              { label: 'Collapse all', onSelect: () => editor?.commands.setAllCollapsed(true) },
              { label: 'Expand all', onSelect: () => editor?.commands.setAllCollapsed(false) },
              { label: 'Move to…', onSelect: () => setDialog('move') },
              { label: 'Keyboard shortcuts', onSelect: () => setDialog('shortcuts') },
              { label: 'Delete note', danger: true, onSelect: () => setDialog('delete') },
            ]}
          />
        </div>
      </div>

      <div className={`glass rounded-[32px] py-7 pr-6 sm:py-9 sm:pr-10 ${bullets ? 'note-bullets pl-12 sm:pl-14' : 'pl-8 sm:pl-10'}`}>
        <input
          ref={titleRef}
          aria-label="Title"
          placeholder="Untitled note"
          value={name}
          maxLength={200}
          autoFocus={!note.name && !note.text}
          onKeyDown={(e) => {
            // Enter moves on to the note itself, like RemNote.
            if ((e.key === 'Enter' || e.key === 'ArrowDown') && editor) {
              e.preventDefault()
              // Focus straight away (Tiptap's focus command waits a frame, so fast typing would land in the title).
              editor.view.focus()
              editor.commands.setTextSelection(1)
            }
          }}
          onChange={(e) => {
            setName(e.target.value)
            queue({ name: e.target.value.trim() })
          }}
          className="w-full bg-transparent text-[2rem] font-bold leading-tight tracking-tight outline-none placeholder:text-slate-400/70 dark:placeholder:text-slate-500"
        />
        <p className="mb-5 mt-1.5 text-xs text-slate-500 dark:text-slate-400">
          {edited(lastEdited, now)} · {words} {words === 1 ? 'word' : 'words'}
        </p>
        <NoteEditor content={note.content} onChange={onEditorChange} bullets={bullets} title={name} onReady={setEditor} onExitTop={exitToTitle} />
      </div>

      {dialog === 'move' && folders && (
        <MoveDialog
          item={{ kind: 'note', id: note.id, name: name.trim() || 'Untitled note' }}
          folders={folders}
          current={folderId && folders.some((f) => f.id === folderId) ? folderId : undefined}
          onMove={async (target) => {
            await moveNote(note.id, target)
            setFolderId(target)
            setDialog(null)
          }}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'shortcuts' && (
        <Dialog title="Keyboard shortcuts" onClose={() => setDialog(null)}>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            {SHORTCUTS.map(([keys, what]) => (
              <div key={keys} className="contents">
                <dt>
                  <kbd className="rounded-md border border-black/10 bg-white/70 px-1.5 py-0.5 font-mono text-xs dark:border-white/15 dark:bg-white/10">
                    {keys}
                  </kbd>
                </dt>
                <dd className="text-slate-600 dark:text-slate-300">{what}</dd>
              </div>
            ))}
          </dl>
          <button type="button" className={btnSecondary} onClick={() => setDialog(null)}>
            Close
          </button>
        </Dialog>
      )}
      {dialog === 'delete' && (
        <Dialog title={`Delete "${name.trim() || 'Untitled note'}"?`} onClose={() => setDialog(null)}>
          <p className="text-sm">This can't be undone. Cards you made from it are kept.</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={btnDanger}
              onClick={async () => {
                pending.current = null
                window.clearTimeout(timer.current)
                await deleteNote(note.id)
                navigate(folderId ? `/decks?folder=${folderId}` : '/decks')
              }}
            >
              Delete note
            </button>
            <button type="button" className={btnSecondary} onClick={() => setDialog(null)}>
              Cancel
            </button>
          </div>
        </Dialog>
      )}
    </div>
  )
}
