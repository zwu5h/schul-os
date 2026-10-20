"use client";

import { Component, type ReactNode } from "react";

export class ChatBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    console.error("KI-Assistent konnte nicht geladen werden", error);
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="empty" role="alert">
          <h2>KI-Assistent konnte nicht geladen werden</h2>
          <p>Bitte lade die Seite erneut, um es noch einmal zu versuchen.</p>
          <button className="button" onClick={() => window.location.reload()}>
            Seite neu laden
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
