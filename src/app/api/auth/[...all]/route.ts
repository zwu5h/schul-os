import { getLocalAuth } from "@/lib/server-auth";
import { backendOrigin, proxyBackendRequest } from "@/lib/server-backend";
import { toNextJsHandler } from "better-auth/next-js";

export const runtime = "nodejs";
function handle(request: Request) {
  if (backendOrigin()) return proxyBackendRequest(request);
  const handlers = toNextJsHandler(getLocalAuth());
  return request.method === "GET" ? handlers.GET(request) : handlers.POST(request);
}
export const GET = handle;
export const POST = handle;
