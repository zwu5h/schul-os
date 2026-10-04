"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Layers,
  Maximize2,
  Minimize2,
  Pause,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Settings2,
  Shuffle,
  Trash2,
  Trophy,
  Upload,
  Volume2,
  X,
} from "lucide-react";
import { Empty, Modal } from "@/components/ui";
import { trackDelete, useWorkspace } from "@/lib/store";
import { entity, type Flashcard } from "@/types/school";
import styles from "./learn.module.css";

type Props = { subjectId: string | null; create: () => void };

// Changing subjects starts an independent round and clears the previous answer.
export function Learn(props: Props) {
  return <StudySession key={props.subjectId ?? "all"} {...props} />;
}

function shuffled(ids: string[]) {
  const result = [...ids];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function StudySession({ subjectId, create }: Props) {
  const w = useWorkspace();
  const cards = w.flashcards.filter(
    (c) => !subjectId || c.subjectId === subjectId,
  );
  const [roundIds, setRoundIds] = useState<string[] | null>(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [mixed, setMixed] = useState(false);
  const [answerFirst, setAnswerFirst] = useState(false);
  const [sorting, setSorting] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [focus, setFocus] = useState(false);
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [showOptions, setShowOptions] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editing, setEditing] = useState<Flashcard | null>(null);
  const [importText, setImportText] = useState("");
  const [importResult, setImportResult] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const cardMap = new Map(cards.map((c) => [c.id, c]));
  const round = roundIds
    ? roundIds.flatMap((id) => cardMap.get(id) ?? [])
    : cards;
  const card = round[index];
  const complete = round.length > 0 && index >= round.length;
  const back = answerFirst !== flipped;
  const knownCount = cards.filter((c) => c.known).length;
  const reviewed = round.filter((c) => results[c.id] !== undefined);
  const roundKnown = reviewed.filter((c) => results[c.id]).length;
  const missed = round.filter((c) => results[c.id] === false);
  const title =
    w.subjects.find((s) => s.id === subjectId)?.name ?? "Deine Lernkarten";
  const modalOpen = showOptions || showImport || !!editing;

  function stopAudio() {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }

  function move(direction: number) {
    stopAudio();
    setIndex((i) => Math.max(0, Math.min(round.length, i + direction)));
    setFlipped(false);
  }

  function rate(known: boolean) {
    if (!card) return;
    const latest = useWorkspace.getState();
    latest.patch({
      flashcards: latest.flashcards.map((c) =>
        c.id === card.id
          ? { ...c, known, updatedAt: new Date().toISOString() }
          : c,
      ),
    });
    setResults((previous) => ({ ...previous, [card.id]: known }));
    move(1);
  }

  function restart(source = cards, shuffle = mixed) {
    stopAudio();
    const ids = source.map((c) => c.id);
    setRoundIds(shuffle ? shuffled(ids) : ids);
    setIndex(0);
    setFlipped(false);
    setResults({});
    setPlaying(false);
  }

  function remove(cardToDelete: Flashcard) {
    if (!confirm("Lernkarte löschen?")) return;
    const latest = useWorkspace.getState();
    latest.patch({
      flashcards: latest.flashcards.filter((c) => c.id !== cardToDelete.id),
    });
    trackDelete(cardToDelete.id);
    stopAudio();
    setFlipped(false);
    setPlaying(false);
    // Keep the successor selected, or return to the final card when deleting it.
    const remaining = round.filter((c) => c.id !== cardToDelete.id);
    setIndex(Math.min(index, Math.max(0, remaining.length - 1)));
  }

  function speak() {
    if (!card || !("speechSynthesis" in window)) return;
    stopAudio();
    const utterance = new SpeechSynthesisUtterance(
      back ? card.back : card.front,
    );
    utterance.lang = "de-AT";
    window.speechSynthesis.speak(utterance);
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setFocus(false);
        setPlaying(false);
      }
      if (
        event.defaultPrevented ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        document.querySelector("dialog[open]") ||
        (event.target as HTMLElement).closest(
          "input,textarea,select,[contenteditable=true]",
        )
      )
        return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        move(-1);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        move(1);
      }
      // Focused controls retain native Space/Enter activation.
      if (
        event.code === "Space" &&
        card &&
        !(event.target as HTMLElement).closest("button,a")
      ) {
        event.preventDefault();
        setFlipped((value) => !value);
      }
      if (sorting && card && event.key === "1") rate(false);
      if (sorting && card && event.key === "2") rate(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    if (!playing || !card || modalOpen) return;
    const timer = window.setTimeout(() => {
      if (!flipped) setFlipped(true);
      else {
        setIndex((i) => i + 1);
        setFlipped(false);
      }
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [playing, card, flipped, modalOpen]);

  useEffect(
    () => () => {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    },
    [],
  );

  useEffect(() => {
    if (!focus) return;
    const previous = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    rootRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    function trapFocus(event: KeyboardEvent) {
      if (event.key !== "Tab" || document.querySelector("dialog[open]")) return;
      const controls = Array.from(
        rootRef.current?.querySelectorAll<HTMLElement>(
          "button:enabled, input, textarea, select, a[href]",
        ) ?? [],
      );
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    document.addEventListener("keydown", trapFocus);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", trapFocus);
      previousFocus?.focus();
    };
  }, [focus]);

  function importList() {
    const fresh: Flashcard[] = [];
    let skipped = 0;
    for (const line of importText.split("\n").slice(0, 200)) {
      const raw = line.trim();
      if (!raw) continue;
      const separator = raw.includes("\t") ? "\t" : "|";
      const sep = raw.indexOf(separator);
      const front = (sep >= 0 ? raw.slice(0, sep) : "").trim();
      const backText = (sep >= 0 ? raw.slice(sep + 1) : "").trim();
      if (!front || !backText) {
        skipped++;
        continue;
      }
      fresh.push({
        ...entity(),
        front: front.slice(0, 500),
        back: backText.slice(0, 2000),
        subjectId,
        known: false,
      });
    }
    if (!fresh.length) {
      setImportResult("Keine gültige Zeile gefunden. Format: Frage | Antwort");
      return;
    }
    const latest = useWorkspace.getState();
    latest.patch({ flashcards: [...latest.flashcards, ...fresh] });
    setImportText("");
    setImportResult(
      `${fresh.length} ${fresh.length === 1 ? "Karte" : "Karten"} importiert${skipped ? ` · ${skipped} Zeilen übersprungen` : ""}`,
    );
    restart([...cards, ...fresh]);
  }

  return (
    <div
      ref={rootRef}
      role={focus ? "dialog" : undefined}
      aria-modal={focus || undefined}
      aria-label={focus ? "Lernkarten im Fokusmodus" : undefined}
      className={`${styles.root} ${focus ? styles.focus : ""}`}
    >
      <div className={`view-actions ${styles.actions}`}>
        <span>
          {knownCount} von {cards.length} Karten gelernt
        </span>
        <div className={styles.actionButtons}>
          <button className="button" onClick={() => setShowImport(true)}>
            <Upload size={16} /> Liste importieren
          </button>
          <button
            className="button primary"
            onClick={() => {
              setFocus(false);
              create();
            }}
          >
            <Plus size={16} /> Lernkarte
          </button>
          {focus && (
            <button
              className="icon-button"
              aria-label="Fokusmodus beenden"
              onClick={() => setFocus(false)}
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {cards.length ? (
        <>
          <section className={styles.study} aria-label="Karteikarten lernen">
            <div className={styles.heading}>
              <div>
                <span className="eyebrow">DEIN LERNSET</span>
                <h2>{title}</h2>
              </div>
              <button className="button" onClick={() => setShowOptions(true)}>
                <Settings2 size={16} /> Optionen
              </button>
            </div>
            <div className={styles.stats}>
              <span className={styles.stillLearning}>
                <span /> Noch üben <strong>{cards.length - knownCount}</strong>
              </span>
              <span className={styles.known}>
                <span /> Gewusst <strong>{knownCount}</strong>
              </span>
            </div>

            {complete ? (
              <div className={styles.summary} role="status">
                <div className={styles.trophy}>
                  <Trophy size={34} />
                </div>
                <span className="eyebrow">RUNDE ABGESCHLOSSEN</span>
                <h3>
                  {roundKnown === round.length
                    ? "Alles gewusst. Stark!"
                    : "Eine Runde weiter."}
                </h3>
                <p>
                  {reviewed.length
                    ? `${roundKnown} von ${round.length} Karten gewusst · ${missed.length} noch üben${round.length > reviewed.length ? ` · ${round.length - reviewed.length} ohne Bewertung` : ""}`
                    : `Alle ${round.length} Karten angesehen.`}
                </p>
                <div className={styles.summaryActions}>
                  {!!missed.length && (
                    <button
                      className="button primary"
                      onClick={() => restart(missed)}
                    >
                      Noch einmal üben ({missed.length})
                    </button>
                  )}
                  <button className="button" onClick={() => restart()}>
                    <RotateCcw size={16} /> Alle wiederholen
                  </button>
                </div>
              </div>
            ) : card ? (
              <div className={styles.cardStage} key={card.id}>
                <div className={styles.cardTools}>
                  <button
                    className="icon-button"
                    title="Sichtbare Seite vorlesen"
                    aria-label="Sichtbare Seite vorlesen"
                    onClick={speak}
                  >
                    <Volume2 size={19} />
                  </button>
                  <button
                    className="icon-button"
                    title="Lernkarte bearbeiten"
                    aria-label="Lernkarte bearbeiten"
                    onClick={() => setEditing({ ...card })}
                  >
                    <Pencil size={17} />
                  </button>
                </div>
                <button
                  className={`${styles.card} ${back ? styles.flipped : ""}`}
                  aria-label={`${back ? "Antwort" : "Frage"}: ${back ? card.back : card.front}. Zum Umdrehen klicken`}
                  aria-pressed={flipped}
                  onClick={() => setFlipped((value) => !value)}
                  onTouchStart={(event) => {
                    const t = event.touches[0];
                    touchStart.current = { x: t.clientX, y: t.clientY };
                  }}
                  onTouchEnd={(event) => {
                    const start = touchStart.current;
                    touchStart.current = null;
                    if (!start) return;
                    const t = event.changedTouches[0];
                    const dx = t.clientX - start.x;
                    if (
                      Math.abs(dx) < 70 ||
                      Math.abs(dx) < Math.abs(t.clientY - start.y) * 1.5
                    )
                      return;
                    event.preventDefault();
                    if (sorting) rate(dx > 0);
                    else move(dx < 0 ? 1 : -1);
                  }}
                >
                  <span className={styles.cardInner}>
                    <span className={styles.face} aria-hidden={back}>
                      <span className={styles.sideLabel}>FRAGE</span>
                      <span className={styles.cardText}>{card.front}</span>
                      <span className={styles.flipHint}>
                        Klicken oder Leertaste zum Umdrehen
                      </span>
                    </span>
                    <span
                      className={`${styles.face} ${styles.backFace}`}
                      aria-hidden={!back}
                    >
                      <span className={styles.sideLabel}>ANTWORT</span>
                      <span className={styles.cardText}>{card.back}</span>
                      <span className={styles.flipHint}>
                        Klicken oder Leertaste zum Umdrehen
                      </span>
                    </span>
                  </span>
                </button>
              </div>
            ) : (
              <Empty
                title="Keine Karten in dieser Runde"
                description="Starte eine neue Runde mit allen Karten."
                action={
                  <button className="button" onClick={() => restart()}>
                    Alle wiederholen
                  </button>
                }
              />
            )}

            <div className={styles.controls}>
              <div className={styles.controlGroup}>
                <button
                  className={`icon-button ${mixed ? styles.selected : ""}`}
                  aria-label="Karten mischen"
                  aria-pressed={mixed}
                  title="Karten mischen und Runde neu starten"
                  onClick={() => {
                    setMixed(!mixed);
                    restart(cards, !mixed);
                  }}
                >
                  <Shuffle size={19} />
                </button>
                <button
                  className="icon-button"
                  aria-label="Runde neu starten"
                  title="Runde neu starten"
                  onClick={() => restart()}
                >
                  <RotateCcw size={18} />
                </button>
              </div>
              <div className={styles.navigation}>
                <button
                  className={styles.arrow}
                  aria-label="Vorherige Karte"
                  disabled={index === 0}
                  onClick={() => {
                    setPlaying(false);
                    move(-1);
                  }}
                >
                  <ChevronLeft size={22} />
                </button>
                <span aria-live="polite" aria-atomic="true">
                  {Math.min(index + 1, round.length)} / {round.length}
                </span>
                <button
                  className={styles.arrow}
                  aria-label="Nächste Karte"
                  disabled={!card}
                  onClick={() => {
                    setPlaying(false);
                    move(1);
                  }}
                >
                  <ChevronRight size={22} />
                </button>
              </div>
              <div className={styles.controlGroup}>
                <button
                  className={`icon-button ${playing && card ? styles.selected : ""}`}
                  aria-label={
                    playing && card
                      ? "Automatische Wiedergabe pausieren"
                      : "Automatische Wiedergabe starten"
                  }
                  title="Automatische Wiedergabe"
                  disabled={!card}
                  onClick={() => setPlaying(!playing)}
                >
                  {playing && card ? <Pause size={19} /> : <Play size={19} />}
                </button>
                <button
                  className="icon-button"
                  aria-label={
                    focus ? "Fokusmodus beenden" : "Fokusmodus starten"
                  }
                  title="Fokusmodus"
                  onClick={() => setFocus(!focus)}
                >
                  {focus ? <Minimize2 size={19} /> : <Maximize2 size={19} />}
                </button>
              </div>
            </div>
            <div
              className={styles.progress}
              role="progressbar"
              aria-label="Fortschritt dieser Runde"
              aria-valuemin={0}
              aria-valuemax={round.length || 1}
              aria-valuenow={Math.min(index, round.length)}
            >
              <span
                style={{
                  width: `${round.length ? Math.min(index / round.length, 1) * 100 : 0}%`,
                }}
              />
            </div>
            {sorting && card && (
              <div className={styles.rating}>
                <button
                  className={styles.practiceButton}
                  onClick={() => {
                    setPlaying(false);
                    rate(false);
                  }}
                >
                  <X size={19} /> Noch üben <kbd>1</kbd>
                </button>
                <button
                  className={styles.knowButton}
                  onClick={() => {
                    setPlaying(false);
                    rate(true);
                  }}
                >
                  <Check size={19} /> Gewusst <kbd>2</kbd>
                </button>
              </div>
            )}
            <p className={styles.keyboardHint}>
              ← → Blättern <span>·</span> Leertaste Umdrehen{" "}
              {sorting && (
                <>
                  <span>·</span> Am Handy zum Bewerten wischen
                </>
              )}
            </p>
          </section>

          {!focus && (
            <section
              className={styles.list}
              aria-label="Karten in diesem Lernset"
            >
              <div className={styles.listHeading}>
                <h3>
                  <Layers size={19} /> Karten in diesem Lernset{" "}
                  <span>({cards.length})</span>
                </h3>
                <button className="text-button" onClick={create}>
                  <Plus size={16} /> Hinzufügen
                </button>
              </div>
              {cards.map((c, i) => (
                <article className={styles.listRow} key={c.id}>
                  <span className={styles.number}>{i + 1}</span>
                  <p>{c.front}</p>
                  <p>{c.back}</p>
                  <div className={styles.rowTools}>
                    {c.known && (
                      <Check
                        size={16}
                        className={styles.knownIcon}
                        aria-label="Gelernt"
                      />
                    )}
                    <button
                      className="icon-button"
                      aria-label={`Karte ${i + 1} bearbeiten`}
                      onClick={() => setEditing({ ...c })}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`Karte ${i + 1} löschen`}
                      onClick={() => remove(c)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </article>
              ))}
            </section>
          )}
        </>
      ) : (
        <Empty
          title="Wissen, das bleibt"
          description="Erstelle deine erste Lernkarte oder importiere ein ganzes Lernset."
          action={
            <button className="button primary" onClick={create}>
              <Plus size={16} /> Erste Lernkarte erstellen
            </button>
          }
        />
      )}

      {showOptions && (
        <Modal title="Lernoptionen" close={() => setShowOptions(false)}>
          <div className={`form ${styles.options}`}>
            <label className={styles.option}>
              <span>
                <strong>Karten sortieren</strong>
                <small>Mit „Noch üben“ und „Gewusst“ bewerten.</small>
              </span>
              <input
                type="checkbox"
                checked={sorting}
                onChange={(e) => setSorting(e.target.checked)}
              />
            </label>
            <label className={styles.option}>
              <span>
                <strong>Antwort zuerst</strong>
                <small>Mit der Rückseite beginnen.</small>
              </span>
              <input
                type="checkbox"
                checked={answerFirst}
                onChange={(e) => {
                  setAnswerFirst(e.target.checked);
                  setFlipped(false);
                  stopAudio();
                }}
              />
            </label>
            <button
              className="button"
              disabled={!cards.some((c) => !c.known)}
              onClick={() => {
                restart(cards.filter((c) => !c.known));
                setShowOptions(false);
              }}
            >
              Nur ungelernte Karten ({cards.length - knownCount})
            </button>
            <button
              className="button"
              onClick={() => {
                const latest = useWorkspace.getState();
                const ids = new Set(cards.map((c) => c.id));
                latest.patch({
                  flashcards: latest.flashcards.map((c) =>
                    ids.has(c.id)
                      ? {
                          ...c,
                          known: false,
                          updatedAt: new Date().toISOString(),
                        }
                      : c,
                  ),
                });
                restart();
                setShowOptions(false);
              }}
            >
              <RotateCcw size={16} /> Lernfortschritt zurücksetzen
            </button>
            <button
              className="button primary"
              onClick={() => setShowOptions(false)}
            >
              Fertig
            </button>
          </div>
        </Modal>
      )}
      {showImport && (
        <Modal title="Liste importieren" close={() => setShowImport(false)}>
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              importList();
            }}
          >
            <div className="field">
              <label htmlFor="flashcard-import">Karteikarten-Liste</label>
              <textarea
                id="flashcard-import"
                rows={8}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={
                  "Fotosynthese | braucht Licht\nZellkern | steuert die Zelle"
                }
              />
            </div>
            <p className="muted">
              Eine Karte pro Zeile: Frage | Antwort. Auch Tabulatoren aus Excel
              oder Quizlet funktionieren. Maximal 200 Zeilen.
            </p>
            <button className="button primary" type="submit">
              Importieren
            </button>
            {importResult && (
              <p className="muted" role="status">
                {importResult}
              </p>
            )}
          </form>
        </Modal>
      )}
      {editing && (
        <Modal title="Lernkarte bearbeiten" close={() => setEditing(null)}>
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              if (!editing.front.trim() || !editing.back.trim()) return;
              const latest = useWorkspace.getState();
              latest.patch({
                flashcards: latest.flashcards.map((c) =>
                  c.id === editing.id
                    ? {
                        ...c,
                        front: editing.front.trim(),
                        back: editing.back.trim(),
                        known: false,
                        updatedAt: new Date().toISOString(),
                      }
                    : c,
                ),
              });
              setResults((previous) => {
                const next = { ...previous };
                delete next[editing.id];
                return next;
              });
              setEditing(null);
              setFlipped(false);
              stopAudio();
            }}
          >
            <div className="field">
              <label htmlFor="edit-front">Frage</label>
              <textarea
                id="edit-front"
                required
                maxLength={500}
                rows={3}
                value={editing.front}
                onChange={(e) =>
                  setEditing({ ...editing, front: e.target.value })
                }
              />
            </div>
            <div className="field">
              <label htmlFor="edit-back">Antwort</label>
              <textarea
                id="edit-back"
                required
                maxLength={2000}
                rows={5}
                value={editing.back}
                onChange={(e) =>
                  setEditing({ ...editing, back: e.target.value })
                }
              />
            </div>
            <button className="button primary" type="submit">
              Änderungen speichern
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
