import { NextResponse } from "next/server";
import { COOKIE_NAME, clearLoginLimit, cookieOptions, createSession, isSameOrigin, loginLimit, preventCache, readLoginForm, safeReturnTo, verifyCredentials } from "../../../../lib/lab-auth.server.mjs";
import { loadAuthConfig } from "../../../../lib/lab-credential-store.server.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function loginError(request, error, next = "/lab", status = 303) {
  const url = new URL("/admin/login", request.url);
  url.searchParams.set("error", error);url.searchParams.set("next", next);
  return preventCache(NextResponse.redirect(url, status));
}
export async function POST(request) {
  if (!isSameOrigin(request)) return preventCache(new NextResponse("Invalid request origin", { status: 403 }));
  let config;
  try { config = await loadAuthConfig(); } catch { return loginError(request, "unavailable"); }
  if (!config) return loginError(request, "unavailable");
  const ip = request.headers.get("x-vercel-forwarded-for") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const limit = loginLimit(ip);
  if (!limit.allowed) { const response = loginError(request, "limited"); response.headers.set("Retry-After", String(limit.retryAfter)); return response; }
  let form;
  try { form = await readLoginForm(request); } catch { return preventCache(new NextResponse("Invalid login form", { status: 400 })); }
  const next = safeReturnTo(form.get("next"));
  const valid = await verifyCredentials(String(form.get("username") || "").trim(), form.get("password") || "", config);
  if (!valid) return loginError(request, "invalid", next);
  clearLoginLimit(ip);
  const response = preventCache(NextResponse.redirect(new URL(next, request.url), 303));
  response.cookies.set(COOKIE_NAME, createSession(config), cookieOptions());
  return response;
}
