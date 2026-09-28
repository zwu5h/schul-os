"use client";
import { get, set, del } from "idb-keyval";
import Image from "next/image";
import { useRef, useState } from "react";
import { Upload, File, Download, Trash2 } from "lucide-react";
import { trackDelete, useWorkspace } from "@/lib/store";
import { entity, type SchoolFile } from "@/types/school";
import { Empty, Modal } from "@/components/ui";
export async function saveFiles(files: File[], subjectId: string | null) {
  for (const file of files) {
    if (file.size > 25 * 1024 * 1024)
      throw new Error(`${file.name}: maximal 25 MB pro Datei.`);
    const base = entity();
    await set(`file:${base.id}`, file);
    const text =
      /text\//.test(file.type) || /\.(md|txt|csv)$/i.test(file.name)
        ? (await file.text()).slice(0, 50000)
        : undefined;
    const w = useWorkspace.getState();
    w.patch({
      files: [
        {
          ...base,
          name: file.name,
          type: file.type,
          size: file.size,
          subjectId,
          text,
        },
        ...w.files,
      ],
    });
  }
}
export function Files({
  subjectId,
  ask,
}: {
  subjectId: string | null;
  ask: (text: string) => void;
}) {
  const w = useWorkspace();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<{
    file: SchoolFile;
    url: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  async function upload(files: File[]) {
    setBusy(true);
    try {
      await saveFiles(files, subjectId);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }
  async function open(file: SchoolFile) {
    const blob = await get<Blob>(`file:${file.id}`);
    if (!blob) {
      setError("Datei nicht mehr im Browserspeicher vorhanden.");
      return;
    }
    setPreview({ file, url: URL.createObjectURL(blob) });
  }
  function close() {
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
  }
  const files = w.files.filter((f) => !subjectId || f.subjectId === subjectId);
  return (
    <>
      <div
        className="drop-zone"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void upload(Array.from(e.dataTransfer.files));
        }}
      >
        <Upload size={28} />
        <h3>
          {busy ? "Dateien werden gespeichert …" : "Dein Wissen, an einem Ort."}
        </h3>
        <p>Dateien hierher ziehen · PDF, Bilder, Text und mehr · bis 25 MB</p>
        <button
          className="button"
          disabled={busy}
          onClick={() => input.current?.click()}
        >
          Dateien auswählen
        </button>
        <input
          ref={input}
          hidden
          type="file"
          multiple
          onChange={(e) => {
            void upload(Array.from(e.target.files || []));
            e.target.value = "";
          }}
        />
      </div>
      {error && <p className="notice">{error}</p>}
      <div className="file-list">
        {files.map((f) => (
          <div className="file-row" key={f.id}>
            <File size={21} />
            <button onClick={() => void open(f)}>
              <strong>{f.name}</strong>
              <small>
                {(f.size / 1024).toFixed(0)} KB ·{" "}
                {w.subjects.find((s) => s.id === f.subjectId)?.name || "Inbox"}
              </small>
            </button>
            {f.text && (
              <button
                className="text-button"
                onClick={() => ask(f.text!.slice(0, 12000))}
              >
                KI fragen
              </button>
            )}
            <button
              className="icon-button"
              aria-label={`${f.name} löschen`}
              onClick={async () => {
                if (!confirm("Datei löschen?")) return;
                await del(`file:${f.id}`);
                w.patch({
                  files: useWorkspace
                    .getState()
                    .files.filter((x) => x.id !== f.id),
                });
                trackDelete(f.id);
              }}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
      {!files.length && (
        <Empty
          title="Noch keine Dateien"
          description="Deine Dateien bleiben lokal in diesem Browser gespeichert."
        />
      )}
      {preview && (
        <Modal title={preview.file.name} close={close}>
          <div className="file-preview">
            {preview.file.type === "application/pdf" ? (
              <iframe title="PDF Vorschau" src={preview.url} />
            ) : preview.file.type.startsWith("image/") ? (
              <Image
                src={preview.url}
                alt={preview.file.name}
                width={900}
                height={650}
                unoptimized
                style={{ objectFit: "contain", width: "100%", height: "auto" }}
              />
            ) : (
              <p>
                {preview.file.text ||
                  "Für diesen Dateityp ist keine Vorschau verfügbar."}
              </p>
            )}
          </div>
          <a className="button" download={preview.file.name} href={preview.url}>
            <Download size={16} /> Herunterladen
          </a>
        </Modal>
      )}
    </>
  );
}
