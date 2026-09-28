"use client";
import {
  Excalidraw,
  convertToExcalidrawElements,
} from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import type {
  ExcalidrawImperativeAPI,
  ExcalidrawInitialDataState,
} from "@excalidraw/excalidraw/types";
import { get, set } from "idb-keyval";
import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { useWorkspace } from "@/lib/store";
export default function Canvas({
  id,
  ask,
}: {
  id: string;
  ask: (context: string) => void;
}) {
  const [initial, setInitial] = useState<ExcalidrawInitialDataState | null>(
    null,
  );
  const [status, setStatus] = useState("Lade Canvas …");
  const api = useRef<ExcalidrawImperativeAPI | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<ExcalidrawInitialDataState | null>(null);
  const signature = useRef("");
  const theme = useWorkspace((s) => s.theme);
  useEffect(() => {
    let active = true;
    get<ExcalidrawInitialDataState>(`board:${id}`)
      .then((data) => {
        if (active) {
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
          setInitial(next);
          setStatus("Lokal gespeichert");
        }
      })
      .catch(() => {
        if (active)
          setStatus(
            "Canvas konnte nicht geladen werden. Bitte lade die Seite neu.",
          );
      });
    return () => {
      active = false;
      if (timer.current) clearTimeout(timer.current);
      if (pending.current)
        void set(`board:${id}`, pending.current).catch(() =>
          useWorkspace.setState({
            storageError: "Canvas konnte nicht gespeichert werden.",
          }),
        );
    };
  }, [id]);
  return (
    <div className="canvas-workspace">
      <div className="canvas-bar">
        <span>{status}</span>
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
            else setStatus("Wähle zuerst Elemente auf dem Canvas aus.");
          }}
        >
          <Sparkles size={15} /> Auswahl an KI
        </button>
      </div>
      <div className="canvas-surface">
        {initial && (
          <Excalidraw
            initialData={initial}
            theme={theme}
            langCode="de-DE"
            excalidrawAPI={(value) => {
              api.current = value;
            }}
            onChange={(elements, appState, files) => {
              const sig = JSON.stringify([
                elements.map((e) => [e.id, e.version, e.isDeleted]),
                Object.keys(files),
                appState.viewBackgroundColor,
              ]);
              if (sig === signature.current) return;
              signature.current = sig;
              pending.current = {
                elements,
                appState: { viewBackgroundColor: appState.viewBackgroundColor },
                files,
              };
              setStatus("Wird gespeichert …");
              if (timer.current) clearTimeout(timer.current);
              timer.current = setTimeout(() => {
                void set(`board:${id}`, pending.current)
                  .then(() => setStatus("Lokal gespeichert"))
                  .catch(() =>
                    setStatus(
                      "Speichern fehlgeschlagen – bitte exportiere den Canvas.",
                    ),
                  );
              }, 400);
            }}
          />
        )}
      </div>
    </div>
  );
}
