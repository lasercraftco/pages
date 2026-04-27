/**
 * Edge middleware — gates everything but public paths and /signin on a valid
 * session cookie. Real validation happens in the app layer; this is the
 * cheap, optimistic check that bounces unauth'd users to sign-in.
 */
import { NextResponse, type NextRequest } from "next/server";

const COOKIE_NAME = process.env.TYFLIX_AUTH_COOKIE_NAME ?? "tyflix_session";

const PUBLIC_PATHS = new Set(["/", "/signin", "/about", "/forbidden"]);
const PUBLIC_PREFIXES = [
  "/auth/",
  "/api/auth/",
  "/api/healthz",
  "/_next/",
  "/favicon",
  "/robots.txt",
  "/sitemap.xml",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const sid = req.cookies.get(COOKIE_NAME)?.value;
  if (!sid) {
    const url = req.nextUrl.clone();
    url.pathname = "/signin";
    if (pathname !== "/signin") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
