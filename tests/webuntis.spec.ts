import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { emptyWorkspace } from "../src/lib/demo";
import {
  DEFAULT_SCHOOL_SUGGESTION,
  classifyTimetableError,
  mapSchoolSearchResponse,
  normalizeSchool,
  normalizeServer,
  normalizeUsername,
} from "../src/lib/webuntis";
import {
  gapBetweenLessons,
  gapLabel,
  normalizeWebUntisLessons,
  parseTimetableJson,
} from "../src/providers/school";

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
  const signup = await request.post("/api/auth/sign-up/email", {
    data: { email: `untis-${randomUUID()}@example.test`, password: "webuntis-test-password-123", name: "Untis Test" },
  });
  expect(signup.ok()).toBeTruthy();
  const missing = await request.get("/api/webuntis");
  expect(missing.status()).toBe(400);

  const short = await request.get("/api/webuntis?q=x");
  expect(short.status()).toBe(400);

  const cross = await request.get("/api/webuntis?q=muster", {
    headers: { Origin: "https://untrusted.example" },
  });
  expect(cross.status()).toBe(403);
});

test("webuntis periods are sorted chronologically", () => {
  const lessons = normalizeWebUntisLessons([
    {
      date: 20260929,
      startTime: 955,
      endTime: 1045,
      su: [{ name: "E" }],
      te: [],
      ro: [],
    },
    {
      date: 20260929,
      startTime: 800,
      endTime: 850,
      su: [{ name: "M" }],
      te: [],
      ro: [],
    },
    {
      date: 20260928,
      startTime: 800,
      endTime: 850,
      su: [{ name: "D" }],
      te: [],
      ro: [],
    },
  ]);
  expect(lessons.map((l) => l.start)).toEqual([
    "2026-09-28T08:00",
    "2026-09-29T08:00",
    "2026-09-29T09:55",
  ]);
});

test("timetable json import is sorted chronologically", () => {
  const result = parseTimetableJson(
    JSON.stringify({
      lessons: [
        {
          subject: "Englisch",
          start: "2026-09-29T09:55",
          end: "2026-09-29T10:45",
        },
        {
          subject: "Mathematik",
          start: "2026-09-29T08:00",
          end: "2026-09-29T08:50",
        },
      ],
    }),
  );
  expect(result.ok).toBe(true);
  if (result.ok)
    expect(result.entries.map((e) => e.subject)).toEqual([
      "Mathematik",
      "Englisch",
    ]);
});

test("gaps between lessons are classified as pause or free period", () => {
  expect(gapBetweenLessons("2026-09-29T08:50", "2026-09-29T08:55")).toEqual({
    minutes: 5,
    kind: "pause",
  });
  expect(gapBetweenLessons("2026-09-29T09:45", "2026-09-29T10:00")).toEqual({
    minutes: 15,
    kind: "big-break",
  });
  expect(gapBetweenLessons("2026-09-29T08:00", "2026-09-29T09:50")).toEqual({
    minutes: 110,
    kind: "free",
  });
  expect(
    gapBetweenLessons("2026-09-29T08:00", "2026-09-29T08:00"),
  ).toBeNull();
  expect(
    gapBetweenLessons("2026-09-29T09:00", "2026-09-29T08:00"),
  ).toBeNull();
  expect(gapLabel({ minutes: 5, kind: "pause" })).toBe("Pause · 5 Min");
  expect(gapLabel({ minutes: 15, kind: "big-break" })).toBe(
    "Große Pause · 15 Min",
  );
  expect(gapLabel({ minutes: 110, kind: "free" })).toBe(
    "Freistunde · 110 Min",
  );
});

test("timetable rejects unsafe credential destinations and invalid school encoding", async ({
  request,
}) => {
  const signup = await request.post("/api/auth/sign-up/email", {
    data: { email: `untis-${randomUUID()}@example.test`, password: "webuntis-test-password-123", name: "Untis Test" },
  });
  expect(signup.ok()).toBeTruthy();
  for (const input of [
    { server: "https://evil.example/WebUntis/", school: "brg-muster" },
    { server: "https://mese.webuntis.com/WebUntis/", school: "https://mese.webuntis.com/?school=%ZZ" },
  ]) {
    const res = await request.post("/api/webuntis", {
      data: { ...input, username: "jemand", password: "geheim", days: 7 },
    });
    expect(res.status()).toBe(400);
  }
});

test("webuntis endpoints require an app session", async ({ request }) => {
  expect((await request.get("/api/webuntis?q=Neusiedl")).status()).toBe(401);
  expect((await request.post("/api/webuntis", { data: {} })).status()).toBe(401);
});

test("invalid dates and minutes cannot enter the timetable", () => {
  const period = { date: 20260230, startTime: 800, endTime: 850, su: [{ name: "M" }] };
  expect(normalizeWebUntisLessons([period, { ...period, date: 20261020, startTime: 860 }])).toEqual([]);
});

test("live timetable preview imports subjects and lessons without storing the password", async ({ page }) => {
  const signup = await page.request.post("/api/auth/sign-up/email", {
    data: { email: `untis-${randomUUID()}@example.test`, password: "webuntis-test-password-123", name: "Untis Test" },
  });
  expect(signup.ok()).toBeTruthy();
  const preserved = { id: "future", subjectId: "previous-subject", start: "2026-12-01T08:00", end: "2026-12-01T08:50", room: "", teacher: "", status: "regular" as const, source: "webuntis" as const };
  const manual = { ...preserved, id: "manual", source: "manual" as const, start: "2026-10-20T09:00", end: "2026-10-20T09:50" };
  await page.addInitScript((workspace) => {
    if (!localStorage.getItem("school-os-v1"))
      localStorage.setItem("school-os-v1", JSON.stringify({ state: workspace, version: 0 }));
  }, { ...emptyWorkspace(), onboarded: true, lessons: [preserved, manual] });
  let mode: "success" | "empty" | "failure" = "success";
  await page.route("**/api/webuntis?**", (route) => route.fulfill({ json: { schools: [{
    server: "gymnasium-neusiedl.webuntis.com", loginName: "gymnasium-neusiedl", displayName: "BG/BRG Neusiedl/See", address: "Neusiedl am See",
  }] } }));
  await page.route("**/api/webuntis", async (route) => {
    expect(route.request().postDataJSON()).toMatchObject({
      server: "gymnasium-neusiedl.webuntis.com", school: "gymnasium-neusiedl",
      username: "student", password: "private-untis-password",
    });
    if (mode === "failure") { await route.fulfill({ status: 403, json: { error: "Der API-Zugriff ist für diesen Zugang nicht freigeschaltet." } }); return; }
    await route.fulfill({ json: { lessons: mode === "empty" ? [] : [
      { subject: "Mathematik", start: "2026-10-20T08:00", end: "2026-10-20T08:50", room: "B207", teacher: "HUB", status: "changed" },
      { subject: "Deutsch", start: "2026-10-20T09:00", end: "2026-10-20T09:50", room: "A102", teacher: "BER", status: "cancelled" },
      { subject: "Englisch", start: "2026-10-21T10:00", end: "2026-10-21T10:50", room: "C108", teacher: "WAG", status: "regular" },
    ], range: { startDate: 20261020, endDate: 20261026 } } });
  });
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  await page.goto("/");
  await page.locator(".webuntis-link").click();
  await page.screenshot({ path: "test-results/webuntis-desktop.png", fullPage: true, animations: "disabled" });
  await page.getByRole("button", { name: "Ändern", exact: true }).click();
  await page.getByLabel("Schulname oder Ort").fill("Neusiedl");
  await page.getByRole("button", { name: "Schule suchen", exact: true }).click();
  await page.getByRole("button", { name: "BG/BRG Neusiedl/See Neusiedl am See" }).click();
  await page.locator("#live-user").fill("student");
  await page.locator("#live-password").fill("private-untis-password");
  await page.getByRole("button", { name: "Passwort anzeigen", exact: true }).click();
  await expect(page.locator("#live-password")).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Passwort verbergen", exact: true }).click();
  await page.getByRole("button", { name: "Stundenplan abrufen", exact: true }).click();
  await expect(page.getByText("3 Stunden bereit", { exact: false })).toBeVisible();
  await expect(page.getByText("Entfällt", { exact: true })).toBeVisible();
  await expect(page.getByText("Geändert", { exact: true })).toBeVisible();
  await expect(page.locator("#live-password")).toHaveValue("");
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: "test-results/webuntis-preview-desktop.png", fullPage: true, animations: "disabled" });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".sidebar")).toBeHidden();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: "test-results/webuntis-preview-mobile.png", fullPage: true, animations: "disabled" });
  await page.evaluate(() => document.documentElement.dataset.theme = "dark");
  await page.screenshot({ path: "test-results/webuntis-preview-dark.png", fullPage: true, animations: "disabled" });
  await page.evaluate(() => document.documentElement.dataset.theme = "light");
  await page.getByRole("button", { name: "Übernehmen", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "3 Stunden übernommen." })).toBeVisible();
  await expect(page.locator("#live-password")).toHaveValue("");
  const stored = await page.evaluate(() => ({
    workspace: JSON.parse(localStorage.getItem("school-os-v1")!).state,
    storage: JSON.stringify({ ...localStorage }),
  }));
  expect(stored.workspace.subjects).toEqual(expect.arrayContaining([expect.objectContaining({ name: "Mathematik" })]));
  expect(stored.workspace.lessons).toHaveLength(5);
  expect(stored.workspace.lessons).toEqual(expect.arrayContaining([preserved, manual, expect.objectContaining({ source: "webuntis", room: "B207", status: "changed" })]));
  expect(stored.storage).not.toContain("private-untis-password");
  mode = "empty";
  await page.getByRole("button", { name: "Zwei Wochen" }).click();
  await page.locator("#live-password").fill("private-untis-password");
  await page.getByRole("button", { name: "Stundenplan abrufen", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Abruf erfolgreich. Gerade keine Stunden." })).toBeVisible();
  mode = "failure";
  await page.locator("#live-password").fill("private-untis-password");
  await page.getByRole("button", { name: "Stundenplan abrufen", exact: true }).click();
  await expect(page.getByRole("region", { name: "Mit WebUntis verbinden" }).getByRole("alert")).toContainText("API-Zugriff");
  await page.getByText("Du hast bereits eine Datei?", { exact: true }).click();
  await page.getByLabel("Stundenplan-JSON").fill('{"lessons":[{"subject":"Test","start":"2026-02-30T08:00","end":"2026-02-30T08:50"}]}');
  await page.getByRole("button", { name: "Datei prüfen" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "gültiges Datum" })).toBeVisible();
  expect(browserErrors).toEqual([]);
});
