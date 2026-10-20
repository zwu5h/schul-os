import { test, expect } from "@playwright/test";
import { fetchWebUntisTimetable, webUntisDateRange } from "../src/lib/webuntis-client";
import { classifyTimetableError, isWebUntisServer, normalizeSchool } from "../src/lib/webuntis";

const credentials = {
  server: "mese.webuntis.com", school: "test-schule", username: "student",
  password: "test-password", days: 7,
};
type Call = { method: string; params: Record<string, unknown>; headers: Headers; signal: AbortSignal };
function mockApi(reply: (call: Call) => unknown | Promise<unknown>) {
  const calls: Call[] = [];
  const transport: typeof fetch = async (url, init) => {
    expect(String(url)).toBe("https://mese.webuntis.com/WebUntis/jsonrpc.do?school=test-schule");
    expect(init?.cache).toBe("no-store");
    expect(init?.redirect).toBe("error");
    const request = JSON.parse(String(init?.body));
    const call = { ...request, headers: new Headers(init?.headers), signal: init!.signal! };
    calls.push(call);
    const value = await reply(call);
    if (value instanceof Response) return value;
    return Response.json({ jsonrpc: "2.0", id: request.id, ...value as object });
  };
  return { calls, transport };
}
const session = { result: { sessionId: "SESSION-123", personId: 42, personType: 5 } };

test("real protocol: authenticate, fetch personalized timetable, logout with session cookies", async () => {
  const { calls, transport } = mockApi(({ method }) => {
    if (method === "authenticate") return session;
    if (method === "logout") return { result: null };
    return { result: [{ date: 20261020, startTime: 800, endTime: 850,
      su: [{ id: 1, name: "M", longname: "Mathematik" }],
      te: [{ name: "HUB" }], ro: [{ name: "B207" }], code: "cancelled" }] };
  });
  const result = await fetchWebUntisTimetable(credentials, { fetch: transport, now: new Date("2026-10-20T10:00:00Z") });
  expect(calls.map((c) => c.method)).toEqual(["authenticate", "getTimetable", "logout"]);
  expect(calls[0].params).toEqual({ user: "student", password: "test-password", client: "School OS" });
  expect(calls[0].headers.has("Cookie")).toBe(false);
  for (const call of calls.slice(1)) {
    expect(call.headers.get("Cookie")).toContain("JSESSIONID=SESSION-123;");
    expect(JSON.stringify(call.params)).not.toContain(credentials.password);
  }
  expect(calls[1].params.options).toMatchObject({ element: { id: 42, type: 5 }, startDate: 20261020, endDate: 20261026 });
  expect(result.lessons).toEqual([{ subject: "Mathematik", start: "2026-10-20T08:00", end: "2026-10-20T08:50", teacher: "HUB", room: "B207", status: "cancelled" }]);
  expect(JSON.stringify(result)).not.toContain("SESSION-123");
});

test("API credential errors are classified without exposing upstream secrets", async () => {
  const { calls, transport } = mockApi(() => ({ error: { code: -8504, message: "bad credentials: test-password" } }));
  const error = await fetchWebUntisTimetable(credentials, { fetch: transport }).catch((error: unknown) => error);
  expect(classifyTimetableError(error).status).toBe(401);
  expect(JSON.stringify(classifyTimetableError(error))).not.toContain(credentials.password);
  expect(calls).toHaveLength(1);
});

for (const scenario of ["permission", "malformed", "unreadable", "no-person", "invalid-person", "empty", "cancelled"] as const) {
  test(`session is released for ${scenario} response`, async () => {
    const abort = new AbortController();
    const { calls, transport } = mockApi(({ method, signal }) => {
      if (method === "authenticate") {
        if (scenario === "no-person") return { result: { sessionId: "SESSION-123" } };
        if (scenario === "invalid-person") return { result: { sessionId: "SESSION-123", personId: 0, personType: 0 } };
        return session;
      }
      if (method === "logout") { expect(signal.aborted).toBe(false); return { result: null }; }
      if (scenario === "permission") return { error: { code: -8509, message: "no right for getTimetable" } };
      if (scenario === "malformed") return { result: {} };
      if (scenario === "unreadable") return { result: [{ date: "broken" }] };
      if (scenario === "cancelled") { abort.abort(); throw new DOMException("Aborted", "AbortError"); }
      return { result: [] };
    });
    const result = await fetchWebUntisTimetable(credentials, { fetch: transport, signal: abort.signal }).catch((error: unknown) => error);
    expect(calls.at(-1)?.method).toBe("logout");
    if (scenario === "empty") expect(result).toMatchObject({ lessons: [] });
    else expect(classifyTimetableError(result).status).toBe(
      scenario === "permission" || scenario === "no-person" || scenario === "invalid-person" ? 403 : scenario === "cancelled" ? 504 : 502,
    );
  });
}

test("logout failure does not discard a successful import", async () => {
  const { transport } = mockApi(({ method }) => {
    if (method === "authenticate") return session;
    if (method === "logout") throw new Error("network failed");
    return { result: [] };
  });
  await expect(fetchWebUntisTimetable(credentials, { fetch: transport })).resolves.toMatchObject({ lessons: [] });
});

test("reject untrusted credential destinations and malformed school URLs", async () => {
  for (const host of ["localhost", "127.0.0.1", "webuntis.com.evil.test", "evil.test", "mese.webuntis.com:443"]) {
    expect(isWebUntisServer(host)).toBe(false);
    await expect(fetchWebUntisTimetable({ ...credentials, server: host }, {
      fetch: async () => { throw new Error("Must never connect"); },
    })).rejects.toMatchObject({ status: 400 });
  }
  expect(normalizeSchool("https://mese.webuntis.com/?school=%ZZ")).toBeNull();
  expect(normalizeSchool("test%2Fschool")).toBeNull();
  expect(normalizeSchool("test%0Aschool")).toBeNull();
});

test("range follows Austrian school dates across midnight and daylight saving changes", () => {
  expect(webUntisDateRange(7, new Date("2026-10-20T22:30:00Z"))).toEqual({ startDate: 20261021, endDate: 20261027 });
  expect(webUntisDateRange(14, new Date("2026-10-24T22:30:00Z"))).toEqual({ startDate: 20261025, endDate: 20261107 });
});
