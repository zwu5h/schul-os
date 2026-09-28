"use client";
import { useRef, useState } from "react";
import {
  Copy,
  Download,
  FolderOpen,
  Layers,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  ArrowUpRight,
} from "lucide-react";
import { get, set, del } from "idb-keyval";
import type { ExcalidrawInitialDataState } from "@excalidraw/excalidraw/types";
import { trackDelete, useWorkspace } from "@/lib/store";
import { entity, type Board } from "@/types/school";
import { Empty, Modal, download } from "@/components/ui";

export function BoardLibrary({
  subjectId,
  chooseSubject,
  open,
  create,
}: {
  subjectId: string | null;
  chooseSubject: (id: string | null) => void;
  open: (id: string) => void;
  create: () => void;
}) {
  const w = useWorkspace();
  const [query, setQuery] = useState("");
  const [edit, setEdit] = useState<Board | null>(null);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const boards = w.boards
    .filter(
      (b) =>
        (!subjectId || b.subjectId === subjectId) &&
        b.title.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  async function duplicate(board: Board) {
    try {
      const copy = { ...board, ...entity(), title: `${board.title} · Kopie` };
      const scene = await get(`board:${board.id}`);
      if (scene) await set(`board:${copy.id}`, scene);
      const latest = useWorkspace.getState();
      latest.patch({ boards: [copy, ...latest.boards] });
      open(copy.id);
    } catch {
      setError("Das Whiteboard konnte nicht dupliziert werden.");
    }
  }
  async function exportBoard(board: Board) {
    try {
      const data = await get<ExcalidrawInitialDataState>(`board:${board.id}`);
      const { serializeAsJSON } = await import("@excalidraw/excalidraw");
      download(
        `${board.title.replace(/[<>:"/\\|?*]/g, "_")}.excalidraw`,
        serializeAsJSON(
          data?.elements || [],
          data?.appState || {},
          data?.files || {},
          "local",
        ),
      );
    } catch {
      setError("Der Export ist fehlgeschlagen. Bitte versuche es erneut.");
    }
  }
  async function importBoard(file: File) {
    try {
      if (file.size > 50 * 1024 * 1024)
        throw new Error("Whiteboards dürfen maximal 50 MB groß sein.");
      const { loadFromBlob } = await import("@excalidraw/excalidraw");
      const data = await loadFromBlob(file, null, null);
      const board = {
        ...entity(),
        title: file.name.replace(/\.(excalidraw|json)$/i, ""),
        subjectId,
      };
      await set(`board:${board.id}`, {
        elements: data.elements,
        appState: { viewBackgroundColor: data.appState.viewBackgroundColor },
        files: data.files || {},
      });
      const latest = useWorkspace.getState();
      latest.patch({ boards: [board, ...latest.boards] });
      open(board.id);
    } catch (e) {
      setError(
        e instanceof Error && e.message.includes("50 MB")
          ? e.message
          : "Diese Datei ist kein gültiges Excalidraw-Whiteboard.",
      );
    }
  }
  return (
    <section className="board-library">
      <div className="board-welcome">
        <div>
          <span className="eyebrow">DEIN DENKRAUM</span>
          <h1>
            {subjectId
              ? w.subjects.find((s) => s.id === subjectId)?.name
              : "Deine Ideen brauchen Platz."}
          </h1>
          <p>Zeichnen. Einfügen. Verschieben. Auf deinem eigenen Whiteboard.</p>
        </div>
        <button className="button primary" onClick={create}>
          <Plus size={17} /> Neues Whiteboard
        </button>
      </div>
      <div className="board-intro-strip">
        <div>
          <Pencil size={17} />
          <span>Mit Stift, Maus oder Touch</span>
        </div>
        <div>
          <Layers size={17} />
          <span>Unendlich viel Arbeitsfläche</span>
        </div>
        <div>
          <FolderOpen size={17} />
          <span>Automatisch lokal gespeichert</span>
        </div>
      </div>
      <div className="board-library-controls">
        <div className="board-subject-tabs">
          <button
            className={!subjectId ? "active" : ""}
            onClick={() => chooseSubject(null)}
          >
            Alle Whiteboards <span>{w.boards.length}</span>
          </button>
          {w.subjects.map((s) => (
            <button
              key={s.id}
              className={subjectId === s.id ? "active" : ""}
              onClick={() => chooseSubject(s.id)}
            >
              <i style={{ background: s.color }} />
              {s.name}
            </button>
          ))}
        </div>
        <div className="board-search">
          <Search size={15} />
          <input
            aria-label="Whiteboards durchsuchen"
            placeholder="Whiteboard suchen …"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="button" onClick={() => fileInput.current?.click()}>
            <Upload size={14} /> Importieren
          </button>
          <input
            ref={fileInput}
            type="file"
            hidden
            accept=".excalidraw,.json"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void importBoard(file);
              e.target.value = "";
            }}
          />
        </div>
      </div>
      {error && (
        <div role="status" className="notice">
          {error}
          <button onClick={() => setError("")}>×</button>
        </div>
      )}
      <div className="whiteboard-grid">
        <button className="new-board-card" onClick={create}>
          <span>
            <Plus size={26} />
          </span>
          <strong>Ein neues Whiteboard</strong>
          <small>Eine leere Fläche. Alle Möglichkeiten.</small>
        </button>
        {boards.map((board) => {
          const subject = w.subjects.find((s) => s.id === board.subjectId);
          return (
            <article className="whiteboard-card" key={board.id}>
              <button
                className="whiteboard-open"
                onClick={() => open(board.id)}
              >
                <div className="whiteboard-cover">
                  <div
                    className="whiteboard-paper"
                    style={{ borderColor: subject?.color || "#a3b78c" }}
                  >
                    <span style={{ color: subject?.color || "#a3b78c" }}>
                      {subject?.icon || "✳"}
                    </span>
                    <i />
                    <i />
                    <i />
                  </div>
                  <span className="whiteboard-cover-label">
                    {subject?.name || "Freier Denkraum"}
                  </span>
                  <ArrowUpRight size={17} />
                </div>
                <div className="whiteboard-description">
                  <h2>{board.title}</h2>
                  <small>
                    <i style={{ background: subject?.color || "#a3b78c" }} />
                    {subject?.name || "Inbox"} ·{" "}
                    {new Date(board.updatedAt).toLocaleDateString("de-AT", {
                      day: "numeric",
                      month: "short",
                    })}
                  </small>
                </div>
              </button>
              <div className="whiteboard-card-actions">
                <button
                  onClick={() => setEdit(board)}
                  aria-label={`${board.title} umbenennen`}
                >
                  <Pencil size={13} /> Benennen
                </button>
                <button
                  onClick={() => void duplicate(board)}
                  aria-label={`${board.title} duplizieren`}
                  title="Duplizieren"
                >
                  <Copy size={14} />
                </button>
                <button
                  onClick={() => void exportBoard(board)}
                  aria-label={`${board.title} exportieren`}
                  title="Datei herunterladen"
                >
                  <Download size={14} />
                </button>
                <button
                  aria-label={`${board.title} löschen`}
                  title="Löschen"
                  onClick={async () => {
                    if (
                      !confirm(`Whiteboard „${board.title}“ endgültig löschen?`)
                    )
                      return;
                    try {
                      await del(`board:${board.id}`);
                      const latest = useWorkspace.getState();
                      latest.patch({
                        boards: latest.boards.filter((b) => b.id !== board.id),
                      });
                      trackDelete(board.id);
                    } catch {
                      setError("Löschen fehlgeschlagen.");
                    }
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </article>
          );
        })}
      </div>
      {query && !boards.length && (
        <Empty
          title="Kein Whiteboard gefunden"
          description="Versuche einen anderen Namen oder ein anderes Fach."
        />
      )}
      <div className="board-bottom-hint">
        <MoreHorizontal size={18} />
        <p>
          Jedes Fach kann beliebig viele Whiteboards haben. Deine alten Boards
          bleiben erhalten, wenn du ein neues anlegst.
        </p>
      </div>
      {edit && (
        <Modal title="Whiteboard benennen" close={() => setEdit(null)}>
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              const title = String(form.get("title")).trim();
              if (!title) return;
              const latest = useWorkspace.getState();
              latest.patch({
                boards: latest.boards.map((b) =>
                  b.id === edit.id
                    ? {
                        ...b,
                        title,
                        subjectId: String(form.get("subject")) || null,
                        updatedAt: new Date().toISOString(),
                      }
                    : b,
                ),
              });
              setEdit(null);
            }}
          >
            <label>
              Name
              <input
                autoFocus
                name="title"
                required
                maxLength={140}
                defaultValue={edit.title}
              />
            </label>
            <label>
              Fach
              <select name="subject" defaultValue={edit.subjectId || ""}>
                <option value="">Inbox · Ohne Fach</option>
                {w.subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <button className="button primary">Änderungen speichern</button>
          </form>
        </Modal>
      )}
    </section>
  );
}
