import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { COOKIE_NAME, preventCache, verifySession } from "../../../../lib/lab-auth.server.mjs";
import { loadAuthConfig } from "../../../../lib/lab-credential-store.server.mjs";
export const dynamic = "force-dynamic";
export async function GET() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return preventCache(NextResponse.json({ authenticated: false }, { status: 401 }));
  let config;
  try { config = await loadAuthConfig(); } catch { return preventCache(NextResponse.json({ error: "temporarily_unavailable" }, { status: 503 })); }
  const session = verifySession(token, config);
  return preventCache(NextResponse.json(session ? { authenticated: true, expiresAt: session.expiresAt } : { authenticated: false }, { status: session ? 200 : 401 }));
}
