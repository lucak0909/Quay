import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState, type DragEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Dialog from '../components/Dialog'
import Menu from '../components/Menu'
import { db, type Folder, type Note } from '../db'
import {
  createFolder,
  createNote,
  deleteDeck,
  deleteFolder,
  deleteNote,
  moveDeck,
  moveFolder,
  moveNote,
  renameDeck,
  updateFolder,
} from '../folders/actions'
import { colorInfo, COLOR_IDS, FOLDER_COLORS } from '../folders/colors'
import { canMoveFolder, childFolders, decksIn, flattenTree, folderPath, folderTotals, parentIn, subtreeIds } from '../folders/tree'
import { totalDue } from '../srs/queue'
import { useDeckSummaries, type DeckSummary } from '../srs/store'
import { btn, btnDanger, btnSecondary, input, link, muted, panel , title } from '../ui'

type Item = { kind: 'deck' | 'folder' | 'note'; id: string; name: string }
type Pending =
  | { kind: 'move'; item: Item }
  | { kind: 'deleteFolder'; folder: Folder }
  | { kind: 'deleteDeck'; deck: DeckSummary }
  | { kind: 'deleteNote'; note: Note }

const noteName = (note: { name: string }) => note.name || 'Untitled note'

const OPEN_KEY = 'quay:openFolders'
const smallBtn = btn.replace('px-5 py-2.5', 'px-3.5 py-1.5')
const row = 'group flex items-center gap-2 rounded-2xl px-2.5 py-2 transition hover:bg-white/60 dark:hover:bg-white/[.06]'

export default function Decks() {
  const decks = useDeckSummaries()
  const folders = useLiveQuery(() => db.folders.toArray())
  const notes = useLiveQuery(() => db.notes.toArray())
  if (!decks || !folders || !notes) return null
  return <Library decks={decks} folders={folders} notes={notes} />
}

function Library({ decks, folders, notes }: { decks: DeckSummary[]; folders: Folder[]; notes: Note[] }) {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const focus = params.get('folder') ?? undefined

  const [open, setOpen] = useState<Set<string>>(() => {
    let saved: string[] = []
    try {
      saved = JSON.parse(localStorage.getItem(OPEN_KEY) ?? '[]')
    } catch {
      // Storage unavailable: start with everything closed.
    }
    return new Set([...saved, ...folderPath(folders, focus).map((f) => f.id)])
  })
  useEffect(() => {
    try {
      localStorage.setItem(OPEN_KEY, JSON.stringify([...open]))
    } catch {
      // Not critical.
    }
  }, [open])

  const [editing, setEditing] = useState<string | null>(null)
  const [pending, setPending] = useState<Pending | null>(null)
  const [dragging, setDragging] = useState<Item | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)

  const withDue = decks.map((d) => ({ ...d, dueCount: totalDue(d.due) }))
  const totals = folderTotals(folders, withDue, notes)
  const [query, setQuery] = useState('')

  const setFolderOpen = (id: string, value: boolean) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (value) next.add(id)
      else next.delete(id)
      return next
    })

  async function newFolder(parentId?: string) {
    const id = await createFolder('New folder', parentId)
    if (parentId) setFolderOpen(parentId, true)
    setEditing(id)
  }

  async function newNote(folderId?: string) {
    navigate(`/notes/${await createNote(folderId)}`)
  }

  // Where an item currently lives, and whether it can go into `target` (undefined = top level).
  const locationOf = (item: Item) =>
    item.kind === 'deck'
      ? parentIn(folders, decks.find((d) => d.id === item.id)?.folderId)
      : item.kind === 'note'
        ? parentIn(folders, notes.find((n) => n.id === item.id)?.folderId)
        : parentIn(folders, folders.find((f) => f.id === item.id)?.parentId)
  const canDrop = (item: Item, target: string | undefined) =>
    locationOf(item) !== target && (item.kind !== 'folder' || canMoveFolder(folders, item.id, target))

  async function move(item: Item, target: string | undefined) {
    if (!canDrop(item, target)) return
    if (item.kind === 'deck') await moveDeck(item.id, target)
    else if (item.kind === 'note') await moveNote(item.id, target)
    else await moveFolder(item.id, target)
    if (target) setFolderOpen(target, true)
  }

  const dragProps = (item: Item) => ({
    draggable: editing !== item.id,
    onDragStart: (e: DragEvent) => {
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/plain', item.name)
      setDragging(item)
    },
    onDragEnd: () => {
      setDragging(null)
      setDropTarget(null)
    },
  })

  const dropProps = (target: string | undefined, key: string) => ({
    onDragOver: (e: DragEvent) => {
      if (!dragging || !canDrop(dragging, target)) return
      e.preventDefault()
      setDropTarget(key)
    },
    onDragLeave: (e: DragEvent) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDropTarget((t) => (t === key ? null : t))
    },
    onDrop: (e: DragEvent) => {
      e.preventDefault()
      if (dragging) move(dragging, target)
      setDragging(null)
      setDropTarget(null)
    },
  })

  function renderLevel(parentId: string | undefined) {
    const subfolders = childFolders(folders, parentId)
    const levelDecks = decksIn(folders, withDue, parentId)
    const levelNotes = decksIn(folders, notes, parentId)
    if (parentId && subfolders.length === 0 && levelDecks.length === 0 && levelNotes.length === 0) {
      return <p className={`${muted} px-2 py-1.5`}>Empty folder</p>
    }
    return (
      <ul>
        {subfolders.map((folder) => {
          const isOpen = open.has(folder.id)
          const t = totals.get(folder.id)!
          const item: Item = { kind: 'folder', id: folder.id, name: folder.name }
          return (
            <li key={folder.id}>
              <div
                {...dragProps(item)}
                {...dropProps(folder.id, folder.id)}
                className={`${row} ${dropTarget === folder.id ? 'bg-indigo-500/10 ring-2 ring-indigo-400/70' : ''} ${focus === folder.id ? 'bg-white/60 dark:bg-white/[.06]' : ''}`}
              >
                <button
                  type="button"
                  aria-label={isOpen ? `Close ${folder.name}` : `Open ${folder.name}`}
                  aria-expanded={isOpen}
                  onClick={() => setFolderOpen(folder.id, !isOpen)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <svg
                    viewBox="0 0 12 12"
                    aria-hidden="true"
                    className={`h-3 w-3 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                  >
                    <path d="M4 2.5 7.5 6 4 9.5" className="fill-none stroke-current" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <FolderIcon className={colorInfo(folder.color).icon} />
                  {editing === folder.id ? null : <span className="truncate font-medium">{folder.name}</span>}
                </button>
                {editing === folder.id && (
                  <NameInput
                    initial={folder.name}
                    onDone={(name) => {
                      if (name) updateFolder(folder.id, { name })
                      setEditing(null)
                    }}
                  />
                )}
                <span className={`${muted} shrink-0`}>
                  {(t.decks > 0 || t.notes > 0) && (
                    <span className="hidden sm:inline">
                      {[
                        t.notes > 0 && `${t.notes} ${t.notes === 1 ? 'note' : 'notes'}`,
                        t.decks > 0 && `${t.decks} ${t.decks === 1 ? 'deck' : 'decks'}`,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                      {t.due > 0 && ' · '}
                    </span>
                  )}
                  {t.due > 0 && `${t.due} to study`}
                </span>
                <Menu
                  label={`Options for ${folder.name}`}
                  extra={(close) => (
                    <div className="flex flex-wrap gap-1.5 border-b border-black/[.06] px-3 pb-2 pt-1 dark:border-white/10">
                      {COLOR_IDS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          aria-label={FOLDER_COLORS[c].label}
                          title={FOLDER_COLORS[c].label}
                          onClick={() => {
                            updateFolder(folder.id, { color: c })
                            close()
                          }}
                          className={`h-5 w-5 rounded-full ${FOLDER_COLORS[c].swatch} ${folder.color === c ? 'ring-2 ring-slate-900 ring-offset-1 dark:ring-white dark:ring-offset-slate-900' : ''}`}
                        />
                      ))}
                    </div>
                  )}
                  items={[
                    { label: 'Rename', onSelect: () => setEditing(folder.id) },
                    { label: 'New note here', onSelect: () => newNote(folder.id) },
                    { label: 'New folder inside', onSelect: () => newFolder(folder.id) },
                    { label: 'Make cards here', onSelect: () => navigate(`/generate?folder=${folder.id}`) },
                    { label: 'Move to…', onSelect: () => setPending({ kind: 'move', item }) },
                    { label: 'Delete', danger: true, onSelect: () => setPending({ kind: 'deleteFolder', folder }) },
                  ]}
                />
              </div>
              {isOpen && <div className="ml-4 border-l border-black/[.08] pl-2 dark:border-white/10">{renderLevel(folder.id)}</div>}
            </li>
          )
        })}
        {levelNotes.map((note) => {
          const item: Item = { kind: 'note', id: note.id, name: noteName(note) }
          return (
            <li key={note.id} {...dragProps(item)} className={row}>
              <span className="w-3" />
              <NoteIcon />
              <div className="min-w-0 flex-1">
                <Link to={`/notes/${note.id}`} draggable={false} className={`${link} block truncate ${note.name ? '' : 'italic'}`}>
                  {noteName(note)}
                </Link>
              </div>
              <span className={`${muted} hidden shrink-0 sm:inline`}>{shortDate(note.updatedAt)}</span>
              <Menu
                label={`Options for ${noteName(note)}`}
                items={[
                  { label: 'Make cards', onSelect: () => navigate(`/generate?note=${note.id}`) },
                  { label: 'Move to…', onSelect: () => setPending({ kind: 'move', item }) },
                  { label: 'Delete', danger: true, onSelect: () => setPending({ kind: 'deleteNote', note }) },
                ]}
              />
            </li>
          )
        })}
        {levelDecks.map((deck) => {
          const item: Item = { kind: 'deck', id: deck.id, name: deck.name }
          return (
            <li key={deck.id} {...dragProps(item)} className={row}>
              <span className="w-3" />
              <DeckIcon />
              <div className="min-w-0 flex-1">
                {editing === deck.id ? (
                  <NameInput
                    initial={deck.name}
                    onDone={(name) => {
                      if (name) renameDeck(deck.id, name)
                      setEditing(null)
                    }}
                  />
                ) : (
                  <Link to={`/decks/${deck.id}`} draggable={false} className={`${link} block truncate`}>
                    {deck.name}
                  </Link>
                )}
              </div>
              <span className={`${muted} hidden shrink-0 sm:inline`}>
                {deck.cardCount} cards{deck.dueCount === 0 && deck.cardCount > 0 ? ' · all caught up' : ''}
              </span>
              {deck.dueCount > 0 && (
                <Link to={`/decks/${deck.id}/study`} draggable={false} className={smallBtn}>
                  Study ({deck.dueCount})
                </Link>
              )}
              <Menu
                label={`Options for ${deck.name}`}
                items={[
                  { label: 'Rename', onSelect: () => setEditing(deck.id) },
                  { label: 'Move to…', onSelect: () => setPending({ kind: 'move', item }) },
                  { label: 'Delete', danger: true, onSelect: () => setPending({ kind: 'deleteDeck', deck }) },
                ]}
              />
            </li>
          )
        })}
      </ul>
    )
  }

  const empty = decks.length === 0 && folders.length === 0 && notes.length === 0
  const searching = query.trim() !== ''

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className={title}>Library</h1>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btnSecondary} onClick={() => newNote()}>
            New note
          </button>
          <button type="button" className={btnSecondary} onClick={() => newFolder()}>
            New folder
          </button>
          <Link to="/generate" className={btnSecondary}>
            Make cards
          </Link>
        </div>
      </div>

      {!empty && (
        <input
          type="search"
          aria-label="Search notes and decks"
          placeholder="Search notes and decks"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={input}
        />
      )}

      {empty ? (
        <p className={muted}>
          Nothing here yet. Write a note, or make cards from your class notes and save them to a deck.
        </p>
      ) : searching ? (
        <SearchResults query={query} folders={folders} notes={notes} decks={decks} />
      ) : (
        <div className={`${panel} space-y-2 p-2`}>
          {dragging && locationOf(dragging) !== undefined && (
            <div
              {...dropProps(undefined, 'top')}
              className={`rounded-2xl border-2 border-dashed px-3 py-2.5 text-center text-sm ${dropTarget === 'top' ? 'border-indigo-400 bg-indigo-500/10' : 'border-slate-400/40 text-slate-500 dark:border-white/15'}`}
            >
              Drop here to move to the top level
            </div>
          )}
          {renderLevel(undefined)}
        </div>
      )}
      {!empty && !searching && folders.length === 0 && (
        <p className={muted}>Tip: make folders to organise your notes and decks by subject. Drag things onto a folder to move them.</p>
      )}

      {pending?.kind === 'move' && (
        <MoveDialog
          item={pending.item}
          folders={folders}
          current={locationOf(pending.item)}
          onMove={(target) => {
            move(pending.item, target)
            setPending(null)
          }}
          onClose={() => setPending(null)}
        />
      )}
      {pending?.kind === 'deleteFolder' && (
        <DeleteFolderDialog
          folder={pending.folder}
          folders={folders}
          totals={totals.get(pending.folder.id) ?? { decks: 0, cards: 0, due: 0, notes: 0 }}
          onClose={() => setPending(null)}
        />
      )}
      {pending?.kind === 'deleteNote' && (
        <Dialog title={`Delete "${noteName(pending.note)}"?`} onClose={() => setPending(null)}>
          <p className="text-sm">This can't be undone. Cards you made from it are kept.</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={btnDanger}
              onClick={() => {
                deleteNote(pending.note.id)
                setPending(null)
              }}
            >
              Delete note
            </button>
            <button type="button" className={btnSecondary} onClick={() => setPending(null)}>
              Cancel
            </button>
          </div>
        </Dialog>
      )}
      {pending?.kind === 'deleteDeck' && (
        <Dialog title={`Delete "${pending.deck.name}"?`} onClose={() => setPending(null)}>
          <p className="text-sm">
            Its {pending.deck.cardCount} cards and study history will be deleted. This can't be undone.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={btnDanger}
              onClick={() => {
                deleteDeck(pending.deck.id)
                setPending(null)
              }}
            >
              Delete deck
            </button>
            <button type="button" className={btnSecondary} onClick={() => setPending(null)}>
              Cancel
            </button>
          </div>
        </Dialog>
      )}
    </div>
  )
}

function NameInput({ initial, onDone }: { initial: string; onDone: (name: string | null) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  const done = useRef(false)
  useEffect(() => ref.current?.select(), [])
  const finish = (name: string | null) => {
    if (done.current) return
    done.current = true
    onDone(name)
  }
  return (
    <input
      ref={ref}
      aria-label="Name"
      defaultValue={initial}
      maxLength={100}
      autoFocus
      onKeyDown={(e) => {
        if (e.key === 'Enter') finish(e.currentTarget.value.trim() || null)
        if (e.key === 'Escape') finish(null)
      }}
      onBlur={(e) => finish(e.currentTarget.value.trim() || null)}
      className="min-w-0 flex-1 rounded-lg border border-indigo-300 bg-white/80 px-2 py-0.5 text-sm outline-none ring-4 ring-indigo-400/20 dark:bg-white/10"
    />
  )
}

function MoveDialog({
  item,
  folders,
  current,
  onMove,
  onClose,
}: {
  item: Item
  folders: Folder[]
  current: string | undefined
  onMove: (target: string | undefined) => void
  onClose: () => void
}) {
  const options = flattenTree(folders, item.kind === 'folder' ? new Set([item.id]) : new Set())
  const option = 'flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm hover:bg-black/[.05] disabled:cursor-default disabled:opacity-50 disabled:hover:bg-transparent dark:hover:bg-white/10'
  return (
    <Dialog title={`Move "${item.name}" to…`} onClose={onClose}>
      <div className="max-h-80 overflow-y-auto">
        <button type="button" className={option} disabled={current === undefined} onClick={() => onMove(undefined)}>
          Top level {current === undefined && <span className={muted}>(here now)</span>}
        </button>
        {options.map(({ folder, depth }) => (
          <button
            key={folder.id}
            type="button"
            className={option}
            style={{ paddingLeft: `${0.5 + (depth + 1) * 1}rem` }}
            disabled={current === folder.id}
            onClick={() => onMove(folder.id)}
          >
            <FolderIcon className={colorInfo(folder.color).icon} />
            <span className="truncate">{folder.name}</span>
            {current === folder.id && <span className={muted}>(here now)</span>}
          </button>
        ))}
      </div>
      <button type="button" className={btnSecondary} onClick={onClose}>
        Cancel
      </button>
    </Dialog>
  )
}

function DeleteFolderDialog({
  folder,
  folders,
  totals,
  onClose,
}: {
  folder: Folder
  folders: Folder[]
  totals: { decks: number; cards: number; notes: number }
  onClose: () => void
}) {
  const subfolders = subtreeIds(folders, folder.id).size - 1
  const parent = folders.find((f) => f.id === parentIn(folders, folder.parentId))
  const isEmpty = totals.decks === 0 && totals.notes === 0 && subfolders === 0
  const run = (mode: 'keep' | 'all') => {
    deleteFolder(folder.id, mode)
    onClose()
  }

  const parts = [
    totals.notes > 0 && `${totals.notes} ${totals.notes === 1 ? 'note' : 'notes'}`,
    totals.decks > 0 && `${totals.decks} ${totals.decks === 1 ? 'deck' : 'decks'} (${totals.cards} cards)`,
    subfolders > 0 && `${subfolders} ${subfolders === 1 ? 'folder' : 'folders'}`,
  ].filter((p): p is string => Boolean(p))
  const contents = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : parts[0]

  return (
    <Dialog title={`Delete "${folder.name}"?`} onClose={onClose}>
      {isEmpty ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btnDanger} onClick={() => run('keep')}>
            Delete folder
          </button>
          <button type="button" className={btnSecondary} onClick={onClose}>
            Cancel
          </button>
        </div>
      ) : (
        <>
          <p className="text-sm">It contains {contents}. What should happen to them?</p>
          <div className="space-y-2">
            <button type="button" className={`${btn} w-full`} onClick={() => run('keep')}>
              Keep them, move to {parent ? `"${parent.name}"` : 'the top level'}
            </button>
            <button type="button" className={`${btnDanger} w-full`} onClick={() => run('all')}>
              Delete everything in it too
            </button>
            <button type="button" className={`${btnSecondary} w-full`} onClick={onClose}>
              Cancel
            </button>
          </div>
        </>
      )}
    </Dialog>
  )
}

function FolderIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={`h-5 w-5 shrink-0 fill-current ${className}`}>
      <path d="M2 5.5A1.5 1.5 0 0 1 3.5 4h4l2 2h7A1.5 1.5 0 0 1 18 7.5v7a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 2 14.5z" />
    </svg>
  )
}

function shortDate(ms: number) {
  const d = new Date(ms)
  const sameYear = d.getFullYear() === new Date().getFullYear()
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: sameYear ? undefined : 'numeric' })
}

// A short piece of text around the first match, so students can see why a note matched.
function snippet(text: string, q: string) {
  const at = text.toLowerCase().indexOf(q)
  if (at < 0) return ''
  const start = Math.max(0, at - 40)
  const end = Math.min(text.length, at + q.length + 60)
  return (start > 0 ? '…' : '') + text.slice(start, end).replace(/\s+/g, ' ') + (end < text.length ? '…' : '')
}

function SearchResults({ query, folders, notes, decks }: { query: string; folders: Folder[]; notes: Note[]; decks: DeckSummary[] }) {
  const q = query.trim().toLowerCase()
  const where = (folderId?: string) =>
    folderPath(folders, folderId)
      .map((f) => f.name)
      .join(' / ')
  const matchingNotes = notes
    .filter((n) => n.name.toLowerCase().includes(q) || n.text.toLowerCase().includes(q))
    .sort((a, b) => b.updatedAt - a.updatedAt)
  const matchingDecks = decks.filter((d) => d.name.toLowerCase().includes(q))

  if (matchingNotes.length === 0 && matchingDecks.length === 0) {
    return <p className={muted}>Nothing matches "{query.trim()}".</p>
  }
  return (
    <ul className={`${panel} space-y-1 p-2`}>
      {matchingNotes.map((note) => (
        <li key={note.id} className={row}>
          <NoteIcon />
          <div className="min-w-0 flex-1">
            <Link to={`/notes/${note.id}`} className={`${link} block truncate`}>
              {noteName(note)}
            </Link>
            <p className={`${muted} truncate`}>
              {[where(note.folderId), note.name.toLowerCase().includes(q) ? '' : snippet(note.text, q)].filter(Boolean).join(' · ')}
            </p>
          </div>
        </li>
      ))}
      {matchingDecks.map((deck) => (
        <li key={deck.id} className={row}>
          <DeckIcon />
          <div className="min-w-0 flex-1">
            <Link to={`/decks/${deck.id}`} className={`${link} block truncate`}>
              {deck.name}
            </Link>
            {deck.folderId && <p className={`${muted} truncate`}>{where(deck.folderId)}</p>}
          </div>
        </li>
      ))}
    </ul>
  )
}

function NoteIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-5 w-5 shrink-0 text-slate-400">
      <path d="M5.5 2.75h6l3.75 3.75v10a.75.75 0 0 1-.75.75h-9a.75.75 0 0 1-.75-.75V3.5a.75.75 0 0 1 .75-.75z" className="fill-none stroke-current" strokeWidth="1.5" />
      <path d="M7.5 10h5M7.5 13h5" className="fill-none stroke-current" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function DeckIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-5 w-5 shrink-0 text-slate-400">
      <rect x="5" y="3" width="11" height="13" rx="1.5" className="fill-none stroke-current" strokeWidth="1.5" />
      <path d="M3.5 6v10.5A1.5 1.5 0 0 0 5 18h8" className="fill-none stroke-current" strokeWidth="1.5" />
    </svg>
  )
}
