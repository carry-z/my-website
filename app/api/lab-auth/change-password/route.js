import { NextResponse } from "next/server";
import { COOKIE_NAME, cookieOptions, isSameOrigin, loginLimit, preventCache, readLoginForm, verifySession } from "../../../../lib/lab-auth.server.mjs";
import { changeAdminPassword, CredentialConflict, loadAuthConfig, PasswordChangeError } from "../../../../lib/lab-credential-store.server.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function failure(request, error) {
  const url = new URL("/admin/password", request.url);
  url.searchParams.set("error", error);
  return preventCache(NextResponse.redirect(url, 303));
}
export async function POST(request) {
  if (!isSameOrigin(request)) return preventCache(new NextResponse("Invalid request origin", { status: 403 }));
  const ip = request.headers.get("x-vercel-forwarded-for") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const limit = loginLimit("password:" + ip);
  if (!limit.allowed) { const response = failure(request, "limited"); response.headers.set("Retry-After", String(limit.retryAfter)); return response; }
  let config;
  try { config = await loadAuthConfig(); } catch { return failure(request, "unavailable"); }
  if (!verifySession(request.cookies.get(COOKIE_NAME)?.value, config)) return preventCache(new NextResponse("Administrator login required", { status: 401 }));
  let form;
  try { form = await readLoginForm(request, 8192); } catch { return preventCache(new NextResponse("Invalid password form", { status: 400 })); }
  try { await changeAdminPassword(config, form.get("currentPassword"), form.get("newPassword"), form.get("confirmPassword")); }
  catch (error) { return failure(request, error instanceof PasswordChangeError ? error.code : error instanceof CredentialConflict ? "conflict" : "unavailable"); }
  const response = preventCache(NextResponse.redirect(new URL("/admin/login?changed=1", request.url), 303));
  response.cookies.set(COOKIE_NAME, "", { ...cookieOptions(), maxAge: 0 });
  return response;
}
