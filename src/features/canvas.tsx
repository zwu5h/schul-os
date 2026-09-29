"use client";
import {
  Excalidraw,
  convertToExcalidrawElements,
  exportToBlob,
  serializeAsJSON,
} from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import type {
  ExcalidrawImperativeAPI,
  ExcalidrawInitialDataState,
} from "@excalidraw/excalidraw/types";
import { get, set } from "@/lib/local-data";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Download,
  ImageDown,
  Maximize,
  MousePointer2,
  Pencil,
  Plus,
  Save,
  Sparkles,
} from "lucide-react";
import { useWorkspace } from "@/lib/store";
import { download } from "@/components/ui";

export default function Canvas({
  id,
  ask,
  back,
  create,
  switchBoard,
}: {
  id: string;
  ask: (context: string) => void;
  back: () => void;
  create: () => void;
  switchBoard: (id: string) => void;
}) {
  const [initial, setInitial] = useState<ExcalidrawInitialDataState | null>(
    null,
  );
  const [status, setStatus] = useState("Lade Whiteboard …");
  const api = useRef<ExcalidrawImperativeAPI | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<ExcalidrawInitialDataState | null>(null);
  const signature = useRef("");
  const wrapper = useRef<HTMLDivElement>(null);
  const writes = useRef<Promise<void>>(Promise.resolve());
  const w = useWorkspace();
  const board = w.boards.find((b) => b.id === id);

  async function save() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const snapshot = pending.current;
    if (!snapshot) return true;
    const write = writes.current
      .catch(() => {})
      .then(() => set(`board:${id}`, snapshot));
    writes.current = write;
    try {
      await write;
      if (pending.current === snapshot) setStatus("Lokal gespeichert");
      const state = useWorkspace.getState();
      state.patch({
        boards: state.boards.map((b) =>
          b.id === id ? { ...b, updatedAt: new Date().toISOString() } : b,
        ),
      });
      return true;
    } catch {
      setStatus(
        "Speichern fehlgeschlagen. Bitte lade eine Sicherung herunter.",
      );
      return false;
    }
  }
  useEffect(() => {
    let active = true;
    get<ExcalidrawInitialDataState>(`board:${id}`)
      .then((data) => {
        if (!active) return;
        const addition = sessionStorage.getItem(`canvas-addition:${id}`);
        const next = data || {};
        if (addition) {
          next.elements = [
            ...(next.elements || []),
            ...convertToExcalidrawElements([
              {
                type: "text",
                x: 100,
                y: 100,
                text: addition,
                width: 600,
                fontSize: 20,
              },
            ]),
          ];
          sessionStorage.removeItem(`canvas-addition:${id}`);
        }
        next.appState = {
          ...next.appState,
          scrollX: next.appState?.scrollX || 0,
          scrollY: next.appState?.scrollY || 0,
        };
        setInitial(next);
        setStatus("Lokal gespeichert");
      })
      .catch(() => {
        if (active)
          setStatus(
            "Whiteboard konnte nicht geladen werden. Bitte lade die Seite neu.",
          );
      });
    const warn = (event: BeforeUnloadEvent) => {
      if (timer.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      active = false;
      window.removeEventListener("beforeunload", warn);
      if (timer.current) clearTimeout(timer.current);
      if (pending.current) {
        const snapshot = pending.current;
        void writes.current
          .catch(() => {})
          .then(() => set(`board:${id}`, snapshot))
          .catch(() =>
            useWorkspace.setState({
              storageError: "Whiteboard konnte nicht gespeichert werden.",
            }),
          );
      }
    };
  }, [id]);
  async function exportFile() {
    if (!api.current) return;
    try {
      download(
        `${board?.title || "Whiteboard"}.excalidraw`,
        serializeAsJSON(
          api.current.getSceneElements(),
          api.current.getAppState(),
          api.current.getFiles(),
          "local",
        ),
      );
    } catch {
      setStatus("Die Sicherung konnte nicht exportiert werden.");
    }
  }
  async function exportPNG() {
    if (!api.current) return;
    try {
      const blob = await exportToBlob({
        elements: api.current.getSceneElements(),
        appState: { ...api.current.getAppState(), exportBackground: true },
        files: api.current.getFiles(),
        maxWidthOrHeight: 4096,
      });
      download(`${board?.title || "Whiteboard"}.png`, blob, "image/png");
    } catch {
      setStatus(
        "PNG-Export fehlgeschlagen. Enthält das Board bereits Elemente?",
      );
    }
  }
  return (
    <div className="canvas-workspace" ref={wrapper}>
      <div className="whiteboard-header">
        <button
          className="icon-button"
          aria-label="Zur Whiteboard-Übersicht"
          onClick={async () => {
            if (await save()) back();
          }}
        >
          <ArrowLeft size={18} />
        </button>
        <div className="whiteboard-title-group">
          <input
            key={board?.id}
            aria-label="Whiteboard-Name"
            defaultValue={board?.title}
            maxLength={140}
            onBlur={(e) => {
              const value = e.target.value.trim();
              if (!value) {
                e.target.value = board?.title || "Whiteboard";
                return;
              }
              const state = useWorkspace.getState();
              state.patch({
                boards: state.boards.map((b) =>
                  b.id === id
                    ? {
                        ...b,
                        title: value,
                        updatedAt: new Date().toISOString(),
                      }
                    : b,
                ),
              });
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
          />
          <span>
            <i className="live-dot" />
            {status}
          </span>
        </div>
        <select
          aria-label="Fach des Whiteboards"
          value={board?.subjectId || ""}
          onChange={(e) => {
            const state = useWorkspace.getState();
            state.patch({
              boards: state.boards.map((b) =>
                b.id === id
                  ? {
                      ...b,
                      subjectId: e.target.value || null,
                      updatedAt: new Date().toISOString(),
                    }
                  : b,
              ),
            });
          }}
        >
          <option value="">Inbox</option>
          {w.subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <button className="button" onClick={create}>
          <Plus size={15} /> Neues Board
        </button>
      </div>
      <div className="canvas-bar">
        <div className="canvas-tool-actions">
          <button
            className="icon-button"
            title="Auswählen & verschieben"
            onClick={() => api.current?.setActiveTool({ type: "selection" })}
          >
            <MousePointer2 size={17} />
          </button>
          <button
            className="button pen-button"
            onClick={() => api.current?.setActiveTool({ type: "freedraw" })}
          >
            <Pencil size={15} /> Stift
          </button>
          <span className="toolbar-divider" />
          <button
            className="icon-button"
            title="Jetzt lokal speichern"
            onClick={() => void save()}
          >
            <Save size={16} />
          </button>
          <button
            className="icon-button"
            title="Bearbeitbares Whiteboard herunterladen"
            onClick={() => void exportFile()}
          >
            <Download size={16} />
          </button>
          <button
            className="icon-button"
            title="Als PNG exportieren"
            onClick={() => void exportPNG()}
          >
            <ImageDown size={16} />
          </button>
          <button
            className="icon-button"
            title="Vollbild"
            onClick={async () => {
              try {
                if (document.fullscreenElement) await document.exitFullscreen();
                else await wrapper.current?.requestFullscreen();
              } catch {
                setStatus("Vollbild ist in diesem Browser nicht verfügbar.");
              }
            }}
          >
            <Maximize size={16} />
          </button>
        </div>
        <div className="canvas-tool-actions">
          <select
            aria-label="Whiteboard wechseln"
            value={id}
            onChange={async (e) => {
              const next = e.target.value;
              if (await save()) switchBoard(next);
            }}
          >
            {w.boards.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title}
              </option>
            ))}
          </select>
          <button
            className="button"
            onClick={() => {
              const elements = api.current
                ?.getSceneElements()
                .filter(
                  (e) => api.current?.getAppState().selectedElementIds[e.id],
                );
              const text = elements
                ?.map((e) =>
                  "text" in e
                    ? String(e.text)
                    : `[${e.type}-Element; Bildinhalt wird nicht analysiert]`,
                )
                .join("\n");
              if (text) ask(text);
              else setStatus("Wähle zuerst Elemente auf dem Whiteboard aus.");
            }}
          >
            <Sparkles size={15} />
            <span>Auswahl an KI</span>
          </button>
        </div>
      </div>
      <div className="canvas-surface">
        {initial && (
          <Excalidraw
            initialData={initial}
            theme={w.theme}
            langCode="de-DE"
            excalidrawAPI={(value) => {
              api.current = value;
            }}
            onChange={(elements, appState, files) => {
              const sig = JSON.stringify([
                elements.map((e) => [e.id, e.version, e.isDeleted]),
                Object.keys(files),
                appState.viewBackgroundColor,
                appState.scrollX,
                appState.scrollY,
                appState.zoom.value,
              ]);
              if (sig === signature.current) return;
              signature.current = sig;
              pending.current = {
                elements,
                appState: {
                  viewBackgroundColor: appState.viewBackgroundColor,
                  scrollX: appState.scrollX,
                  scrollY: appState.scrollY,
                  zoom: appState.zoom,
                },
                files,
              };
              setStatus("Wird gespeichert …");
              if (timer.current) clearTimeout(timer.current);
              timer.current = setTimeout(() => {
                timer.current = null;
                void save();
              }, 400);
            }}
          />
        )}
      </div>
      <div className="canvas-hint">
        <span>
          Bilder & Screenshots einfügen mit Ctrl+V · Text per Doppelklick ·
          Elemente frei verschieben
        </span>
        <span>Scrollen: verschieben · Ctrl + Mausrad: zoomen</span>
      </div>
    </div>
  );
}
