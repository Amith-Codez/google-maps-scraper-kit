import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, sessionToken } from "./lib/session";

// Public: the login page, health check (Docker), the per-business demo websites and their voice-agent callback.
const PUBLIC = [/^\/login$/, /^\/business$/, /^\/icon\.svg$/, /^\/api\/login$/, /^\/api\/health$/, /^\/p\/\d+$/, /^\/api\/interest$/, /^\/api\/audio\//];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((r) => r.test(pathname))) return NextResponse.next();
  const passcode = process.env.APP_PASSCODE ?? "";
  const ok = passcode && req.cookies.get(SESSION_COOKIE)?.value === (await sessionToken(passcode));
  if (ok) return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "login required" }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
