import Highlight from '@tiptap/extension-highlight'
import { TaskItem, TaskList } from '@tiptap/extension-list'
import { Placeholder } from '@tiptap/extensions'
import { EditorContent, useEditor, type JSONContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

// Rich-text editor that formats as you type, like RemNote or Markdown:
// "# " heading, "- " bullet, "1. " numbered list, "[ ] " checklist, "> " quote,
// **bold**, *italic*, `code`, ==highlight==, ~~strike~~, "---" line, ``` code block.
export default function NoteEditor({
  content,
  onChange,
}: {
  content: JSONContent
  onChange: (content: JSONContent, text: string) => void
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: { openOnClick: false, autolink: true },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight,
      Placeholder.configure({ placeholder: 'Start writing. Type # for a heading, - for a bullet, [ ] for a checklist.' }),
    ],
    content,
    editorProps: { attributes: { class: 'note-editor', 'aria-label': 'Note' } },
    onUpdate: ({ editor }) => onChange(editor.getJSON(), editor.getText({ blockSeparator: '\n' })),
  })

  return <EditorContent editor={editor} />
}
