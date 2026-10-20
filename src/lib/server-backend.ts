/** Vercel renders the app; the existing server owns persistent accounts and subjects. */
export function backendOrigin(): string | null {
  const configured = process.env.SCHOOL_OS_BACKEND_URL ||
    (process.env.VERCEL === "1" ? "https://os.digmio.app" : "");
  if (!configured) return null;
  const url = new URL(configured);
  const local = process.env.VERCEL !== "1" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if ((url.protocol !== "https:" && !(local && url.protocol === "http:")) ||
      url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("SCHOOL_OS_BACKEND_URL muss eine HTTPS-Origin sein.");
  }
  return url.origin;
}

export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return request.headers.get("sec-fetch-site") !== "cross-site" &&
    (!origin || origin === new URL(request.url).origin);
}

/** Proxy only the persistent APIs; cookies remain scoped to the browser's app origin. */
export async function proxyBackendRequest(request: Request, origin = backendOrigin()) {
  if (!origin) throw new Error("Kein persistentes Backend konfiguriert.");
  if (!isSameOrigin(request))
    return Response.json({ error: "Anfrage abgelehnt." }, { status: 403 });
  const source = new URL(request.url);
  if (!(source.pathname.startsWith("/api/auth/") ||
        source.pathname === "/api/subjects" || source.pathname === "/api/chat"))
    return Response.json({ error: "Anfrage abgelehnt." }, { status: 404 });
  if (Number(request.headers.get("content-length") || 0) > 4_000_000)
    return Response.json({ error: "Die Anfrage ist zu groß." }, { status: 413 });

  const headers = new Headers({ Accept: "application/json" });
  for (const key of ["cookie", "content-type"]) {
    const value = request.headers.get(key);
    if (value) headers.set(key, value);
  }
  // Check the browser origin above before translating it to the fixed backend origin.
  headers.set("origin", origin);
  headers.set("referer", `${origin}/`);
  const clientIp = request.headers.get("x-real-ip");
  if (process.env.VERCEL === "1" && clientIp) headers.set("x-real-ip", clientIp);
  let body: string | undefined;
  if (!["GET", "HEAD"].includes(request.method)) {
    body = await request.text();
    if (new TextEncoder().encode(body).byteLength > 4_000_000)
      return Response.json({ error: "Die Anfrage ist zu groß." }, { status: 413 });
    if (source.pathname.startsWith("/api/auth/") && headers.get("content-type")?.includes("application/json")) {
      try {
        const data = JSON.parse(body);
        // Password-reset emails use the persistent server's already trusted callback origin.
        for (const key of ["callbackURL", "redirectTo", "errorCallbackURL", "newUserCallbackURL"]) {
          if (typeof data[key] === "string") {
            const callback = new URL(data[key], source.origin);
            if (callback.origin === source.origin) {
              data[key] = `${origin}${callback.pathname}${callback.search}${callback.hash}`;
            }
          }
        }
        body = JSON.stringify(data);
      } catch {
        return Response.json({ error: "Ungültige Anfrage." }, { status: 400 });
      }
    }
  }
  try {
    const response = await fetch(new URL(source.pathname + source.search, origin), {
      method: request.method, headers, body,
      cache: "no-store", redirect: "manual",
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(30_000)]),
    });
    const resultHeaders = new Headers({ "Cache-Control": "no-store" });
    const contentType = response.headers.get("content-type");
    if (contentType) resultHeaders.set("content-type", contentType);
    for (const cookie of response.headers.getSetCookie()) resultHeaders.append("set-cookie", cookie);
    const location = response.headers.get("location");
    if (location) {
      const target = new URL(location, origin);
      resultHeaders.set("location", target.origin === origin
        ? `${source.origin}${target.pathname}${target.search}${target.hash}` : target.href);
    }
    return new Response(response.body, { status: response.status, headers: resultHeaders });
  } catch {
    return Response.json({ error: "Der Kontoserver ist vorübergehend nicht erreichbar. Bitte erneut versuchen." }, { status: 502 });
  }
}
