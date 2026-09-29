"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function AccountForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const result = mode === "login"
      ? await authClient.signIn.email({ email: email.trim().toLowerCase(), password })
      : await authClient.signUp.email({
          name: name.trim(), email: email.trim().toLowerCase(), password,
        });
    setBusy(false);
    if (result.error) {
      setError(result.error.status === 429
        ? "Zu viele Versuche. Bitte warte eine Minute."
        : mode === "login"
          ? "Anmeldung fehlgeschlagen. Bitte prüfe deine Angaben."
          : "Konto konnte nicht erstellt werden. Bitte prüfe deine Angaben oder versuche es später erneut.");
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <Link className="auth-brand" href="/">school<span>os</span></Link>
        <h1>{mode === "login" ? "Willkommen zurück" : "Konto erstellen"}</h1>
        <p className="muted">Dein persönlicher Raum zum Lernen.</p>
        <form className="form" onSubmit={(event) => void submit(event)}>
          {mode === "register" && <label>Name<input required maxLength={80} autoComplete="name" value={name} onChange={e => setName(e.target.value)} /></label>}
          <label>E-Mail<input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} /></label>
          <label>Passwort<input required type="password" minLength={mode === "register" ? 12 : undefined} autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={e => setPassword(e.target.value)} /></label>
          {mode === "register" && <p className="muted">Mindestens 12 Zeichen.</p>}
          {error && <p role="alert" className="auth-error">{error}</p>}
          <button className="button primary" disabled={busy} type="submit">{busy ? "Bitte warten …" : mode === "login" ? "Anmelden" : "Registrieren"}</button>
        </form>
        <p className="auth-switch">{mode === "login" ? "Noch kein Konto? " : "Schon ein Konto? "}<Link href={mode === "login" ? "/register" : "/login"}>{mode === "login" ? "Registrieren" : "Anmelden"}</Link></p>
      </section>
    </main>
  );
}
