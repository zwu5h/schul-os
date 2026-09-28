import { entity, localDate, type Workspace } from "@/types/school";
export function emptyWorkspace(): Workspace {
  return {
    subjects: [],
    notes: [],
    boards: [],
    tasks: [],
    exams: [],
    lessons: [],
    files: [],
    messages: [],
    flashcards: [],
    profile: { name: "", school: "", grade: "" },
    demo: false,
    theme: "light",
    onboarded: false,
    deletedIds: [],
  };
}
export function demoWorkspace(): Workspace {
  const subjects = [
    ["Mathematik", "#9184d7", "∑", "Mag. Berger", "204"],
    ["Deutsch", "#dfaa71", "Aa", "Mag. Hofer", "112"],
    ["Englisch", "#7aac98", "En", "Mag. Steiner", "208"],
    ["Geographie", "#82a6ca", "◎", "Mag. Weber", "301"],
  ].map(([name, color, icon, teacher, room]) => ({
    ...entity(),
    name,
    color,
    icon,
    teacher,
    room,
  }));
  const day = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return localDate(d);
  };
  return {
    ...emptyWorkspace(),
    demo: true,
    subjects,
    tasks: [
      ["Übungsblatt: Quadratische Funktionen", 0, 0],
      ["Interpretation fertig schreiben", 1, 0],
      ["Vokabeln · Unit 4 wiederholen", 2, 1],
    ].map(([title, s, d]) => ({
      ...entity(),
      title: String(title),
      subjectId: subjects[Number(s)].id,
      due: day(Number(d)),
      priority: "normal",
      status: "todo",
    })),
    notes: [
      {
        ...entity(),
        title: "Quadratische Funktionen",
        subjectId: subjects[0].id,
        content:
          "<h2>Die Parabel verstehen</h2><p>Eine quadratische Funktion hat die Form <strong>f(x) = ax² + bx + c</strong>.</p><ul><li>a bestimmt die Öffnung und Streckung.</li><li>c ist der Schnittpunkt mit der y-Achse.</li><li>Der Scheitelpunkt ist der tiefste oder höchste Punkt.</li></ul><h3>Scheitelpunktform</h3><p>f(x) = a(x − d)² + e, mit Scheitelpunkt S(d | e).</p>",
      },
      {
        ...entity(),
        title: "Argumentieren und überzeugen",
        subjectId: subjects[1].id,
        content:
          "<h2>Ein gutes Argument</h2><p>Behauptung → Begründung → Beispiel. Führe deine Leser Schritt für Schritt durch deine Gedanken.</p>",
      },
    ],
    boards: [
      { ...entity(), title: "Mathe · Gedankenraum", subjectId: subjects[0].id },
    ],
    exams: [
      {
        ...entity(),
        title: "Mathematik-Schularbeit",
        subjectId: subjects[0].id,
        date: day(4),
        topics: "Quadratische Funktionen, Scheitelpunkt, Nullstellen",
      },
    ],
    lessons: subjects.map((s, i) => ({
      id: crypto.randomUUID(),
      subjectId: s.id,
      start: `${day(0)}T${["08:00", "08:55", "09:50", "10:55"][i]}`,
      end: `${day(0)}T${["08:50", "09:45", "10:40", "11:45"][i]}`,
      room: s.room,
      teacher: s.teacher,
      status: "regular",
      source: "demo",
    })),
    flashcards: [
      {
        ...entity(),
        front: "Wie lautet die allgemeine Form einer quadratischen Funktion?",
        back: "f(x) = ax² + bx + c, wobei a ≠ 0.",
        subjectId: subjects[0].id,
        known: false,
      },
    ],
  };
}
