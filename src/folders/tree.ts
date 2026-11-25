// Pure helpers for the folder tree. A missing or unknown parent means "top level",
// so a folder or deck whose parent was lost never disappears from view.

export interface FolderNode {
  id: string
  name: string
  parentId?: string
}

export interface DeckNode {
  id: string
  name: string
  folderId?: string
}

const byName = (a: { name: string }, b: { name: string }) =>
  a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })

// The folder an item really sits in: undefined when it's at the top level or its parent is gone.
export function parentIn(folders: FolderNode[], parentId: string | undefined): string | undefined {
  return parentId !== undefined && folders.some((f) => f.id === parentId) ? parentId : undefined
}

export function childFolders<T extends FolderNode>(folders: T[], parentId: string | undefined): T[] {
  return folders.filter((f) => parentIn(folders, f.parentId) === parentId).sort(byName)
}

export function decksIn<T extends DeckNode>(folders: FolderNode[], decks: T[], folderId: string | undefined): T[] {
  return decks.filter((d) => parentIn(folders, d.folderId) === folderId).sort(byName)
}

// The folder itself and everything nested under it.
export function subtreeIds(folders: FolderNode[], id: string): Set<string> {
  const ids = new Set([id])
  let grew = true
  while (grew) {
    grew = false
    for (const f of folders) {
      if (f.parentId !== undefined && ids.has(f.parentId) && !ids.has(f.id)) {
        ids.add(f.id)
        grew = true
      }
    }
  }
  return ids
}

// A folder can't go inside itself or one of its own subfolders.
export function canMoveFolder(folders: FolderNode[], folderId: string, targetId: string | undefined): boolean {
  return targetId === undefined || !subtreeIds(folders, folderId).has(targetId)
}

// Folders from the top level down to this one, for breadcrumbs.
export function folderPath<T extends FolderNode>(folders: T[], id: string | undefined): T[] {
  const path: T[] = []
  const seen = new Set<string>()
  let current = folders.find((f) => f.id === id)
  while (current && !seen.has(current.id)) {
    seen.add(current.id)
    path.unshift(current)
    current = folders.find((f) => f.id === current!.parentId)
  }
  return path
}

export interface Totals {
  decks: number
  cards: number
  due: number
}

// Totals for each folder including everything in its subfolders.
export function folderTotals(
  folders: FolderNode[],
  decks: (DeckNode & { cardCount: number; dueCount: number })[],
): Map<string, Totals> {
  const totals = new Map<string, Totals>(folders.map((f) => [f.id, { decks: 0, cards: 0, due: 0 }]))
  for (const deck of decks) {
    for (const folder of folderPath(folders, parentIn(folders, deck.folderId))) {
      const t = totals.get(folder.id)!
      t.decks += 1
      t.cards += deck.cardCount
      t.due += deck.dueCount
    }
  }
  return totals
}

// Folders as an indented list (for "Move to…" pickers), skipping any ids in `exclude` and their contents.
export function flattenTree<T extends FolderNode>(folders: T[], exclude: Set<string> = new Set()): { folder: T; depth: number }[] {
  const out: { folder: T; depth: number }[] = []
  const walk = (parentId: string | undefined, depth: number) => {
    for (const folder of childFolders(folders, parentId)) {
      if (exclude.has(folder.id)) continue
      out.push({ folder, depth })
      walk(folder.id, depth + 1)
    }
  }
  walk(undefined, 0)
  return out
}
