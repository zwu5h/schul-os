import { test, expect } from "@playwright/test";
import {
  DEFAULT_SCHOOL_SUGGESTION,
  classifyTimetableError,
  mapSchoolSearchResponse,
  normalizeSchool,
  normalizeServer,
  normalizeUsername,
} from "../src/lib/webuntis";
import { normalizeWebUntisLessons } from "../src/providers/school";

test("server input is normalized instead of rejected", () => {
  expect(normalizeServer("mese.webuntis.com")).toBe("mese.webuntis.com");
  expect(normalizeServer("https://mese.webuntis.com/WebUntis/?school=x")).toBe(
    "mese.webuntis.com",
  );
  expect(normalizeServer("  MESE.WebUntis.COM  ")).toBe(
    "mese.webuntis.com",
  );
  expect(normalizeServer("http://mese.webuntis.com/")).toBe(
    "mese.webuntis.com",
  );
  expect(normalizeServer("")).toBeNull();
  expect(normalizeServer("kein server!!")).toBeNull();
  expect(normalizeServer("nur-ein-wort")).toBeNull();
});

test("school input accepts identifiers and pasted portal urls", () => {
  expect(normalizeSchool("brg-muster")).toBe("brg-muster");
  expect(
    normalizeSchool("https://mese.webuntis.com/WebUntis/?school=brg-muster"),
  ).toBe("brg-muster");
  expect(normalizeSchool("BRG Musterstadt")).toBeNull();
  expect(normalizeSchool("")).toBeNull();
});

test("neusiedl default suggestion is connection-ready", () => {
  expect(normalizeServer(DEFAULT_SCHOOL_SUGGESTION.server)).toBe(
    "gymnasium-neusiedl.webuntis.com",
  );
  expect(normalizeSchool(DEFAULT_SCHOOL_SUGGESTION.loginName)).toBe(
    "gymnasium-neusiedl",
  );
  expect(
    mapSchoolSearchResponse({
      result: {
        schools: [
          {
            ...DEFAULT_SCHOOL_SUGGESTION,
            server: `https://${DEFAULT_SCHOOL_SUGGESTION.server}/`,
          },
        ],
      },
    }),
  ).toEqual([DEFAULT_SCHOOL_SUGGESTION]);
});

test("username is trimmed and required", () => {
  expect(normalizeUsername("  schueler123  ")).toBe("schueler123");
  expect(normalizeUsername("   ")).toBeNull();
});

test("school search responses map to suggestions", () => {
  const mapped = mapSchoolSearchResponse({
    result: {
      size: 0,
      schools: [
        {
          server: "https://mese.webuntis.com/",
          loginName: "brg-muster",
          displayName: "BRG Musterstadt",
          address: "Musterstraße 1",
        },
        { server: "broken", loginName: "", displayName: "" },
      ],
    },
    id: "school-os",
    jsonrpc: "2.0",
  });
  expect(mapped).toEqual([
    {
      server: "mese.webuntis.com",
      loginName: "brg-muster",
      displayName: "BRG Musterstadt",
      address: "Musterstraße 1",
    },
  ]);
  expect(mapSchoolSearchResponse({ result: { schools: [] } })).toEqual([]);
  expect(mapSchoolSearchResponse({ nonsense: true })).toEqual([]);
});

test("timetable errors map to actionable statuses", () => {
  const auth = classifyTimetableError(new Error("Failed to login. {}"));
  expect(auth.status).toBe(401);
  expect(auth.error).toContain("nicht akzeptiert");

  const dns = classifyTimetableError(
    new Error("getaddrinfo ENOTFOUND mese.webuntis.com"),
  );
  expect(dns.status).toBe(502);
  expect(dns.error).toContain("Server");

  const timeout = classifyTimetableError(new Error("Zeitüberschreitung."));
  expect(timeout.status).toBe(504);

  const generic = classifyTimetableError(new Error("Server returned no data!"));
  expect(generic).toEqual({
    status: 502,
    error:
      "WebUntis ist nicht erreichbar. Server prüfen und erneut versuchen.",
  });
});

test("webuntis periods normalize defensively", () => {
  expect(normalizeWebUntisLessons("kein-array")).toEqual([]);
  const lessons = normalizeWebUntisLessons([
    {
      date: 20260929,
      startTime: 800,
      endTime: 850,
      su: [{ name: "M", longname: "Mathematik" }],
      te: [{ name: "HUB" }],
      ro: [{ name: "B207" }],
    },
    { date: "kaputt", startTime: 800, endTime: 850, su: [] },
    {
      date: 20260929,
      startTime: 900,
      endTime: 850,
      su: [{ name: "D" }],
      te: [],
      ro: [],
    },
  ]);
  expect(lessons).toEqual([
    {
      subject: "Mathematik",
      start: "2026-09-29T08:00",
      end: "2026-09-29T08:50",
      room: "B207",
      teacher: "HUB",
      status: "regular",
    },
  ]);
});

test("school search api validates input and origin", async ({ request }) => {
  const missing = await request.get("/api/webuntis");
  expect(missing.status()).toBe(400);

  const short = await request.get("/api/webuntis?q=x");
  expect(short.status()).toBe(400);

  const cross = await request.get("/api/webuntis?q=muster", {
    headers: { Origin: "https://untrusted.example" },
  });
  expect(cross.status()).toBe(403);
});

test("timetable accepts pasted urls instead of rejecting them", async ({
  request,
}) => {
  const res = await request.post("/api/webuntis", {
    data: {
      server: "https://mese.webuntis.com/WebUntis/",
      school: "https://mese.webuntis.com/WebUntis/?school=brg-muster",
      username: "jemand",
      password: "geheim",
      days: 7,
    },
  });
  // Normalisierung muss greifen: kein 400 mehr, sondern ein Ergebnis
  // der echten Verbindung (401/502/504 je nach Netz und Zugang).
  expect(res.status()).not.toBe(400);
});
