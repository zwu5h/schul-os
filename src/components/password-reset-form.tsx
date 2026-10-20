"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

export function PasswordResetForm({ mode, token, enabled = true }: {
  mode: "request" | "reset";
  token?: string;
  enabled?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [invalid, setInvalid] = useState(mode === "reset" && !token);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || done || invalid || !enabled) return;
    setError("");
    if (mode === "reset" && password !== confirmation) {
      setError("Die Passwörter stimmen nicht überein.");
      return;
    }
    setBusy(true);
    try {
      const result = mode === "request"
        ? await authClient.requestPasswordReset({
            email: email.trim().toLowerCase(),
            redirectTo: `${window.location.origin}/reset-password`,
          })
        : await authClient.resetPassword({ token, newPassword: password });
      if (result.error) {
        if (result.error.code === "INVALID_TOKEN") {
          setInvalid(true);
        } else {
          setError(result.error.status === 429
            ? "Zu viele Versuche. Bitte warte eine Minute."
            : mode === "request"
              ? "Der Rücksetz-Link konnte nicht angefordert werden. Bitte versuche es später erneut."
              : "Das Passwort konnte nicht geändert werden. Bitte verwende 12 bis 128 Zeichen und versuche es erneut.");
        }
        return;
      }
      setDone(true);
      setPassword("");
      setConfirmation("");
      if (mode === "reset") window.history.replaceState(null, "", "/reset-password");
    } catch {
      setError("Verbindung fehlgeschlagen. Bitte versuche es erneut.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <Link className="auth-brand" href="/login">school<span>os</span></Link>
        <h1>{mode === "request" ? "Passwort vergessen?" : "Neues Passwort"}</h1>
        <p className="muted">{mode === "request"
          ? "Gib deine E-Mail-Adresse ein. Wir schicken dir einen Link zum Zurücksetzen."
          : "Wähle ein neues Passwort für dein School-OS-Konto."}</p>
        {!enabled ? <p role="alert" className="auth-error">Der E-Mail-Versand ist noch nicht eingerichtet. Bitte wende dich an den Betreiber.</p>
          : invalid ? <>
            <p role="alert" className="auth-error">Dieser Link ist ungültig oder abgelaufen. Bitte fordere einen neuen Link an.</p>
            <p className="auth-switch"><Link href="/forgot-password">Neuen Link anfordern</Link></p>
          </>
          : done ? <p role="status">{mode === "request"
            ? "Falls ein Konto mit dieser E-Mail-Adresse existiert, erhältst du einen Rücksetz-Link. Prüfe auch deinen Spam-Ordner. Der Link ist 30 Minuten gültig."
            : "Dein Passwort wurde geändert. Melde dich mit deinem neuen Passwort an."}</p>
          : <form className="form" onSubmit={(event) => void submit(event)}>
            {mode === "request"
              ? <label>E-Mail<input required type="email" autoComplete="email" value={email} disabled={busy} onChange={e => setEmail(e.target.value)} /></label>
              : <>
                <label>Neues Passwort<input required type="password" minLength={12} maxLength={128} autoComplete="new-password" value={password} disabled={busy} onChange={e => setPassword(e.target.value)} /></label>
                <label>Passwort wiederholen<input required type="password" minLength={12} maxLength={128} autoComplete="new-password" value={confirmation} disabled={busy} onChange={e => setConfirmation(e.target.value)} /></label>
                <p className="muted">Mindestens 12 Zeichen.</p>
              </>}
            {error && <p role="alert" className="auth-error">{error}</p>}
            <button className="button primary" disabled={busy} type="submit">{busy ? "Bitte warten …" : mode === "request" ? "Rücksetz-Link senden" : "Passwort speichern"}</button>
          </form>}
        <p className="auth-switch"><Link href="/login">Zurück zur Anmeldung</Link></p>
      </section>
    </main>
  );
}
