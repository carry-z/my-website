import { NextResponse } from "next/server";
import { COOKIE_NAME, cookieOptions, isSameOrigin, preventCache } from "../../../../lib/lab-auth.server.mjs";
export const dynamic = "force-dynamic";
export async function POST(request) {
  if (!isSameOrigin(request)) return preventCache(new NextResponse("Invalid request origin", { status: 403 }));
  const response = preventCache(NextResponse.redirect(new URL("/admin/login", request.url), 303));
  response.cookies.set(COOKIE_NAME, "", { ...cookieOptions(), maxAge: 0 });
  return response;
}
