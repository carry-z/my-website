import { NextResponse } from "next/server";
import { COOKIE_NAME, getAuthConfig, isProtectedPath, preventCache, safeReturnTo, verifySession } from "./lib/lab-auth.server.mjs";

export function proxy(request) {
  const path = request.nextUrl.pathname;
  if (!isProtectedPath(path)) return path === "/admin/login" ? preventCache(NextResponse.next()) : NextResponse.next();
  const session = verifySession(request.cookies.get(COOKIE_NAME)?.value, getAuthConfig());
  if (!session) {
    if (path !== "/lab" && !path.startsWith("/lab/")) return preventCache(new NextResponse("Administrator login required", { status: 401 }));
    const login = new URL("/admin/login", request.url);
    login.searchParams.set("next", safeReturnTo(path + request.nextUrl.search));
    return preventCache(NextResponse.redirect(login));
  }
  return preventCache(NextResponse.next());
}

// Inspect all paths before Next.js decodes filesystem paths, including encoded aliases.
export const config = { matcher: ["/:path*"] };
