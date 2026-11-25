// Folder colours. Class names are written out in full so Tailwind keeps them.
export const FOLDER_COLORS = {
  slate: { label: 'Grey', icon: 'text-slate-400', swatch: 'bg-slate-400' },
  red: { label: 'Red', icon: 'text-red-500', swatch: 'bg-red-500' },
  orange: { label: 'Orange', icon: 'text-orange-500', swatch: 'bg-orange-500' },
  amber: { label: 'Yellow', icon: 'text-amber-400', swatch: 'bg-amber-400' },
  green: { label: 'Green', icon: 'text-green-500', swatch: 'bg-green-500' },
  teal: { label: 'Teal', icon: 'text-teal-500', swatch: 'bg-teal-500' },
  blue: { label: 'Blue', icon: 'text-blue-500', swatch: 'bg-blue-500' },
  violet: { label: 'Purple', icon: 'text-violet-500', swatch: 'bg-violet-500' },
  pink: { label: 'Pink', icon: 'text-pink-500', swatch: 'bg-pink-500' },
} as const

export type FolderColor = keyof typeof FOLDER_COLORS

export const COLOR_IDS = Object.keys(FOLDER_COLORS) as FolderColor[]

export function colorInfo(color: string) {
  return FOLDER_COLORS[color as FolderColor] ?? FOLDER_COLORS.slate
}
