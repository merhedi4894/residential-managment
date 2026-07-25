import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Server-side auth middleware — Vercel compatible
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow these paths without authentication
  const allowedPaths = ['/login', '/setup', '/api/auth', '/api/warm'];
  if (
    allowedPaths.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname === '/robots.txt' ||
    pathname.startsWith('/logo')
  ) {
    return NextResponse.next();
  }

  // Check for session_token cookie
  const sessionToken = request.cookies.get('session_token')?.value;

  if (!sessionToken) {
    // No session, redirect to login
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - public folder files
     */
    '/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
