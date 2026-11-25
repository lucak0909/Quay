import type { JSONContent } from '@tiptap/react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Dialog from '../components/Dialog'
import Menu from '../components/Menu'
import { db, type Note as NoteRow } from '../db'
import { deleteNote } from '../folders/actions'
import { folderPath } from '../folders/tree'
import NoteEditor from '../notes/NoteEditor'
import { btnDanger, btnSecondary, muted } from '../ui'

const SAVE_DELAY = 400

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

function NoteView({ note }: { note: NoteRow }) {
  const navigate = useNavigate()
  const path = useLiveQuery(async () => folderPath(await db.folders.toArray(), note.folderId), [note.folderId]) ?? []
  const [name, setName] = useState(note.name)
  const [status, setStatus] = useState<'saved' | 'saving'>('saved')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [hasText, setHasText] = useState(note.text.trim() !== '')

  // Changes wait briefly, then save together. Anything pending is saved when leaving the page.
  const pending = useRef<Partial<NoteRow> | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const flush = useCallback(() => {
    window.clearTimeout(timer.current)
    const changes = pending.current
    if (!changes) return
    pending.current = null
    db.notes.update(note.id, { ...changes, updatedAt: Date.now() }).then(() => !pending.current && setStatus('saved'))
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

  const onEditorChange = (content: JSONContent, text: string) => {
    setHasText(text.trim() !== '')
    queue({ content, text })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <nav aria-label="Folders" className={`${muted} flex flex-wrap gap-x-1`}>
          <Link to="/decks" className="hover:underline">
            ← Library
          </Link>
          {path.map((folder) => (
            <span key={folder.id}>
              /{' '}
              <Link to={`/decks?folder=${folder.id}`} className="hover:underline">
                {folder.name}
              </Link>
            </span>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`${muted} text-xs`} aria-live="polite">
            {status === 'saving' ? 'Saving…' : 'Saved'}
          </span>
          <button
            type="button"
            className={btnSecondary}
            disabled={!hasText}
            title={hasText ? undefined : 'Write something first'}
            onClick={() => {
              flush()
              navigate(`/generate?note=${note.id}`)
            }}
          >
            Make cards
          </button>
          <Menu label="Note options" items={[{ label: 'Delete note', danger: true, onSelect: () => setConfirmDelete(true) }]} />
        </div>
      </div>

      <input
        aria-label="Title"
        placeholder="Untitled note"
        value={name}
        maxLength={200}
        autoFocus={!note.name && !note.text}
        onKeyDown={(e) => {
          // Enter moves on to the note itself, like RemNote.
          if (e.key === 'Enter' || e.key === 'ArrowDown') {
            e.preventDefault()
            document.querySelector<HTMLElement>('.note-editor')?.focus()
          }
        }}
        onChange={(e) => {
          setName(e.target.value)
          queue({ name: e.target.value.trim() })
        }}
        className="w-full bg-transparent text-3xl font-semibold outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
      />

      <NoteEditor content={note.content} onChange={onEditorChange} />

      {confirmDelete && (
        <Dialog title={`Delete "${name.trim() || 'Untitled note'}"?`} onClose={() => setConfirmDelete(false)}>
          <p className="text-sm">This can't be undone. Cards you made from it are kept.</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={btnDanger}
              onClick={async () => {
                pending.current = null
                window.clearTimeout(timer.current)
                await deleteNote(note.id)
                navigate(note.folderId ? `/decks?folder=${note.folderId}` : '/decks')
              }}
            >
              Delete note
            </button>
            <button type="button" className={btnSecondary} onClick={() => setConfirmDelete(false)}>
              Cancel
            </button>
          </div>
        </Dialog>
      )}
    </div>
  )
}
