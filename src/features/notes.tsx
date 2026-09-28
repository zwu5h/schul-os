"use client";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  List,
  Heading2,
  Quote,
  Code,
  Undo2,
  Download,
  Sparkles,
  Trash2,
} from "lucide-react";
import { trackDelete, useWorkspace } from "@/lib/store";
import { download } from "@/components/ui";
export function NoteEditor({
  id,
  ask,
  close,
}: {
  id: string;
  ask: (text: string) => void;
  close: () => void;
}) {
  const note = useWorkspace((s) => s.notes.find((n) => n.id === id));
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "Ein Gedanke, eine Idee, ein neuer Anfang …",
      }),
    ],
    content: note?.content || "",
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const w = useWorkspace.getState();
      w.patch({
        notes: w.notes.map((n) =>
          n.id === id
            ? {
                ...n,
                content: editor.getHTML(),
                updatedAt: new Date().toISOString(),
              }
            : n,
        ),
      });
    },
  });
  if (!note) return null;
  return (
    <div className="document">
      <div className="document-top">
        <span className="eyebrow">NOTIZ · LOKAL GESPEICHERT</span>
        <div className="toolbar">
          <button
            title="Als Text exportieren"
            onClick={() =>
              download(
                `${note.title}.txt`,
                editor?.getText() || "",
                "text/plain",
              )
            }
          >
            <Download size={16} />
          </button>
          <button
            title="Notiz löschen"
            onClick={() => {
              if (confirm("Diese Notiz wirklich löschen?")) {
                const w = useWorkspace.getState();
                w.patch({ notes: w.notes.filter((n) => n.id !== id) });
                trackDelete(id);
                close();
              }
            }}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      <input
        className="document-title"
        aria-label="Notiztitel"
        value={note.title}
        onChange={(e) => {
          const w = useWorkspace.getState();
          w.patch({
            notes: w.notes.map((n) =>
              n.id === id
                ? {
                    ...n,
                    title: e.target.value,
                    updatedAt: new Date().toISOString(),
                  }
                : n,
            ),
          });
        }}
      />
      <div className="editor-toolbar toolbar">
        <button
          title="Fett"
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <Bold size={16} />
        </button>
        <button
          title="Kursiv"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <Italic size={16} />
        </button>
        <button
          title="Überschrift"
          onClick={() =>
            editor?.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          <Heading2 size={16} />
        </button>
        <button
          title="Liste"
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          <List size={16} />
        </button>
        <button
          title="Zitat"
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
        >
          <Quote size={16} />
        </button>
        <button
          title="Code"
          onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
        >
          <Code size={16} />
        </button>
        <button
          title="Rückgängig"
          onClick={() => editor?.chain().focus().undo().run()}
        >
          <Undo2 size={16} />
        </button>
        <button
          onClick={() => {
            if (!editor) return;
            const { from, to } = editor.state.selection;
            ask(
              from === to
                ? editor.getText()
                : editor.state.doc.textBetween(from, to, "\n"),
            );
          }}
        >
          <Sparkles size={15} /> KI fragen
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
