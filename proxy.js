import { NextResponse } from "next/server";
import { COOKIE_NAME, isProtectedPath, preventCache, safeReturnTo, verifySession } from "./lib/lab-auth.server.mjs";
import { loadAuthConfig } from "./lib/lab-credential-store.server.mjs";

export async function proxy(request) {
  const path = request.nextUrl.pathname;
  if (!isProtectedPath(path)) return path === "/admin/login" ? preventCache(NextResponse.next()) : NextResponse.next();
  const token = request.cookies.get(COOKIE_NAME)?.value;
  let config = null;
  // No store request is needed for a visitor who has no login cookie.
  if (token) {
    try { config = await loadAuthConfig(); }
    catch { return preventCache(new NextResponse("Administrator authentication temporarily unavailable", { status: 503 })); }
  }
  const session = verifySession(token, config);
  if (!session) {
    if (path !== "/lab" && !path.startsWith("/lab/") && path !== "/admin/password") return preventCache(new NextResponse("Administrator login required", { status: 401 }));
    const login = new URL("/admin/login", request.url);
    login.searchParams.set("next", safeReturnTo(path + request.nextUrl.search));
    return preventCache(NextResponse.redirect(login));
  }
  return preventCache(NextResponse.next());
}

// Inspect all paths before Next.js decodes filesystem paths, including encoded aliases.
export const config = { matcher: ["/:path*"] };
