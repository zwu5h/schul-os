import Link from "next/link";
import {
  ArrowDown, ArrowUpRight, BookOpen, CalendarDays, Check,
  CheckSquare, FileText, GraduationCap, Layers, Sparkles,
} from "lucide-react";
import styles from "./landing-page.module.css";

const features = [
  { icon: FileText, title: "Gedanken festhalten.", text: "Mitschriften, Zusammenfassungen und Dateien. Nach Fächern geordnet, damit du alles wiederfindest.", label: "NOTIZEN & DATEIEN" },
  { icon: Layers, title: "Platz für große Ideen.", text: "Skizziere Zusammenhänge, sammle Ideen und denke frei auf deinen digitalen Whiteboards.", label: "WHITEBOARDS" },
  { icon: CalendarDays, title: "Den Kopf frei haben.", text: "Aufgaben, Termine und dein Stundenplan mit WebUntis. Dein Schulalltag auf einen Blick.", label: "ORGANISATION" },
  { icon: Sparkles, title: "Verstehen statt auswendig.", text: "Stell deinem KI-Assistenten Fragen und vertiefe deinen Lernstoff mit eigenen Lernkarten.", label: "KI & LERNKARTEN" },
];

export function LandingPage() {
  return (
    <div className={styles.page}>
      <a className={styles.skip} href="#inhalt">Zum Inhalt springen</a>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="School OS Startseite">
          <span className={styles.brandIcon}><GraduationCap size={23} aria-hidden="true" /></span>
          school<span className={styles.brandAccent}>os</span><span className={styles.brandDot}>.</span>
        </Link>
        <nav className={styles.nav} aria-label="Hauptnavigation">
          <a className={styles.featureLink} href="#funktionen">Funktionen</a>
          <Link className={styles.login} href="/login">Anmelden</Link>
          <Link className={styles.navCta} href="/register">Konto erstellen <ArrowUpRight size={16} aria-hidden="true" /></Link>
        </nav>
      </header>

      <main id="inhalt">
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroCopy}>
            <div className={styles.eyebrow}><span /> DEIN PERSÖNLICHER LERN-WORKSPACE</div>
            <h1 id="hero-title">Weniger Chaos.<br />Mehr <span>Durchblick.</span></h1>
            <p className={styles.heroDescription}>Deine Notizen, Aufgaben und Ideen verdienen einen gemeinsamen Ort. Mach School OS zu deinem Raum zum Lernen.</p>
            <div className={styles.heroActions}>
              <Link className={styles.primary} href="/register">Deinen Workspace erstellen <ArrowUpRight size={19} aria-hidden="true" /></Link>
              <a className={styles.secondary} href="#einblick">Einblick erhalten <ArrowDown size={16} aria-hidden="true" /></a>
            </div>
            <div className={styles.heroNote}><Check size={15} aria-hidden="true" /> Ein Ort für deinen ganzen Schulalltag.</div>
          </div>
          <div className={styles.heroVisual} id="einblick">
            <div className={styles.previewLabel}><span /> SO KÖNNTE DEIN TAG AUSSEHEN</div>
            <div className={styles.preview} role="img" aria-label="Beispiel eines School OS Workspace mit Mathematik-Notizen, drei Aufgaben und einem Lernziel. Die Vorschau zeigt Beispieldaten.">
              <div className={styles.windowBar}><div><i /><i /><i /></div><span>Dein Workspace</span><GraduationCap size={15} /></div>
              <div className={styles.previewBody}>
                <aside className={styles.previewSidebar}>
                  <div className={styles.miniBrand}>school<span>os.</span></div>
                  <div className={styles.previewActive}><CalendarDays size={13} /> Heute</div>
                  <div><FileText size={13} /> Notizen</div>
                  <div><Layers size={13} /> Whiteboards</div>
                  <div><CheckSquare size={13} /> Aufgaben</div>
                  <div><Sparkles size={13} /> KI-Assistent</div>
                  <span className={styles.sidebarCaption}>DEINE FÄCHER</span>
                  <div><i className={styles.greenDot} /> Mathematik</div>
                  <div><i className={styles.purpleDot} /> Deutsch</div>
                  <div><i className={styles.orangeDot} /> Englisch</div>
                </aside>
                <div className={styles.previewContent}>
                  <div className={styles.previewGreeting}><span>ALLES AN SEINEM PLATZ</span><span>✦</span></div>
                  <h2>Ein guter Tag zum Lernen.</h2>
                  <p>Dein Überblick. Dein Tempo.</p>
                  <div className={styles.previewTiles}>
                    <div><CheckSquare size={16} /><b>3</b><span>Aufgaben</span></div>
                    <div><FileText size={16} /><b>8</b><span>Notizen</span></div>
                    <div><BookOpen size={16} /><b>12</b><span>Lernkarten</span></div>
                  </div>
                  <div className={styles.noteCard}><div><span>MATHEMATIK</span><FileText size={14} /></div><h3>Quadratische Funktionen</h3><p>Eine Parabel hat die Form</p><div className={styles.formula}>f(x) = ax² + bx + c</div><div className={styles.noteLines}><i /><i /></div></div>
                  <div className={styles.taskRow}><span><Check size={11} /></span> Englisch-Vokabeln wiederholen <small>Erledigt</small></div>
                </div>
              </div>
            </div>
            <div className={styles.floatingCard}><span><Sparkles size={20} /></span><div><b>Dein nächster Aha-Moment.</b><p>Mit deinem KI-Assistenten.</p></div></div>
            <div className={styles.visualCaption}>Weniger suchen. Mehr verstehen. <span>↗</span></div>
          </div>
        </section>

        <div className={styles.subjectStrip}><span>FÜR ALLES, WAS DU LERNST.</span><div>Mathematik <i /> Deutsch <i /> Englisch <i /> Biologie <i /> Und deine Ideen.</div></div>

        <section className={styles.features} id="funktionen" aria-labelledby="features-title">
          <div className={styles.sectionHeading}><div><span className={styles.kicker}>ALLES VERBUNDEN</span><h2 id="features-title">Ein Workspace.<br />Viele Möglichkeiten.</h2></div><p>Vom ersten Gedanken bis zur nächsten Prüfung:<br />Deine Werkzeuge sind schon da.</p></div>
          <div className={styles.featureGrid}>{features.map(({ icon: Icon, title, text, label }, index) => (
            <article className={styles.featureCard} key={label}><div className={styles.featureTop}><Icon size={24} aria-hidden="true" /><span>0{index + 1}</span></div><span className={styles.featureLabel}>{label}</span><h3>{title}</h3><p>{text}</p></article>
          ))}</div>
        </section>

        <section className={styles.bottomCta} aria-labelledby="start-title"><div><span className={styles.kicker}>DEIN NÄCHSTES KAPITEL</span><h2 id="start-title">Mach Platz für deinen Kopf.</h2><p>Ein Konto erstellen. Ankommen. Loslernen.</p></div><Link className={styles.primary} href="/register">Jetzt starten <ArrowUpRight size={20} aria-hidden="true" /></Link></section>
      </main>
      <footer className={styles.footer}><Link className={styles.footerBrand} href="/">school<span>os.</span></Link><p>Dein Schulalltag. Ein Workspace.</p><Link href="/login">Zum Login <ArrowUpRight size={14} aria-hidden="true" /></Link></footer>
    </div>
  );
}
