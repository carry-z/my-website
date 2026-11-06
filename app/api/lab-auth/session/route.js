import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { COOKIE_NAME, getAuthConfig, preventCache, verifySession } from "../../../../lib/lab-auth.server.mjs";
export const dynamic = "force-dynamic";
export async function GET() {
  const store = await cookies();
  const session = verifySession(store.get(COOKIE_NAME)?.value, getAuthConfig());
  return preventCache(NextResponse.json(session ? { authenticated: true, expiresAt: session.expiresAt } : { authenticated: false }, { status: session ? 200 : 401 }));
}
