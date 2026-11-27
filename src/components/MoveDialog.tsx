import type { Folder } from '../db'
import { colorInfo } from '../folders/colors'
import { flattenTree } from '../folders/tree'
import { btnSecondary, muted } from '../ui'
import Dialog from './Dialog'

export interface MovableItem {
  kind: 'deck' | 'folder' | 'note'
  id: string
  name: string
}

// "Move to…": pick a folder (or the top level) for a deck, note or folder.
export default function MoveDialog({
  item,
  folders,
  current,
  onMove,
  onClose,
}: {
  item: MovableItem
  folders: Folder[]
  current: string | undefined
  onMove: (target: string | undefined) => void
  onClose: () => void
}) {
  // A folder can't go inside itself, so leave it (and everything in it) out.
  const options = flattenTree(folders, item.kind === 'folder' ? new Set([item.id]) : new Set())
  const option =
    'flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm hover:bg-black/[.05] disabled:cursor-default disabled:opacity-50 disabled:hover:bg-transparent dark:hover:bg-white/10'
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

export function FolderIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={`h-5 w-5 shrink-0 fill-current ${className}`}>
      <path d="M2 5.5A1.5 1.5 0 0 1 3.5 4h4l2 2h7A1.5 1.5 0 0 1 18 7.5v7a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 2 14.5z" />
    </svg>
  )
}
