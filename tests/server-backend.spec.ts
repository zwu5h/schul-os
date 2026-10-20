import { test, expect } from "@playwright/test";
import { backendOrigin, proxyBackendRequest } from "../src/lib/server-backend";

const originalFetch = globalThis.fetch;
const originalVercel = process.env.VERCEL;
const originalBackend = process.env.SCHOOL_OS_BACKEND_URL;

test.beforeEach(() => {
  delete process.env.VERCEL;
  process.env.SCHOOL_OS_BACKEND_URL = "https://backend.example";
});
test.afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalVercel === undefined) delete process.env.VERCEL;
  else process.env.VERCEL = originalVercel;
  if (originalBackend === undefined) delete process.env.SCHOOL_OS_BACKEND_URL;
  else process.env.SCHOOL_OS_BACKEND_URL = originalBackend;
});

test("Vercel uses the persistent backend and self-hosting keeps local auth", () => {
  delete process.env.SCHOOL_OS_BACKEND_URL;
  expect(backendOrigin()).toBeNull();
  process.env.VERCEL = "1";
  expect(backendOrigin()).toBe("https://os.digmio.app");
  process.env.SCHOOL_OS_BACKEND_URL = "http://untrusted.example";
  expect(() => backendOrigin()).toThrow();
});

test("auth proxy forwards session cookies and preserves separate Set-Cookie headers", async () => {
  globalThis.fetch = async (url, init) => {
    expect(String(url)).toBe("https://backend.example/api/auth/sign-in/email");
    const headers = new Headers(init?.headers);
    expect(headers.get("cookie")).toBe("session=example");
    expect(headers.get("origin")).toBe("https://backend.example");
    expect(headers.has("authorization")).toBe(false);
    expect(init?.cache).toBe("no-store");
    expect(init?.redirect).toBe("manual");
    expect(JSON.parse(String(init?.body))).toMatchObject({ callbackURL: "https://backend.example/" });
    const responseHeaders = new Headers({ "content-type": "application/json" });
    responseHeaders.append("set-cookie", "session=one; Path=/; HttpOnly; Secure");
    responseHeaders.append("set-cookie", "other=two; Path=/; HttpOnly; Secure");
    return new Response(JSON.stringify({ success: true }), { headers: responseHeaders });
  };
  const response = await proxyBackendRequest(new Request("https://frontend.example/api/auth/sign-in/email", {
    method: "POST", headers: { origin: "https://frontend.example", cookie: "session=example", "content-type": "application/json", authorization: "must-not-forward" },
    body: JSON.stringify({ email: "test@example.test", password: "example-password", callbackURL: "https://frontend.example/" }),
  }));
  expect(response.status).toBe(200);
  expect(response.headers.getSetCookie()).toHaveLength(2);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(await response.json()).toEqual({ success: true });
});

test("cross-origin and unlisted routes never reach the backend", async () => {
  globalThis.fetch = async () => { throw new Error("Must not connect"); };
  const blocked = await proxyBackendRequest(new Request("https://frontend.example/api/auth/sign-in/email", {
    method: "POST", headers: { origin: "https://evil.example" }, body: "{}",
  }));
  expect(blocked.status).toBe(403);
  expect((await proxyBackendRequest(new Request("https://frontend.example/private"))).status).toBe(404);
});

test("backend redirects stay on the frontend and failed connections return a safe error", async () => {
  globalThis.fetch = async () => new Response(null, { status: 302, headers: { location: "https://backend.example/reset-password?token=example" } });
  const request = new Request("https://frontend.example/api/auth/reset-password/example");
  const response = await proxyBackendRequest(request);
  expect(response.headers.get("location")).toBe("https://frontend.example/reset-password?token=example");
  globalThis.fetch = async () => { throw new Error("sensitive details"); };
  const unavailable = await proxyBackendRequest(request);
  expect(unavailable.status).toBe(502);
  expect(await unavailable.text()).not.toContain("sensitive details");
});
