import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  const { supabase, response } = createClient(request);

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const quickAccessCookie = request.cookies.get('quick-access-session');

  const isAuthRoute = request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/quick-login';
  const isPublicRoot = request.nextUrl.pathname === '/';

  // Allow root page without auth
  if (isPublicRoot) {
    return response;
  }

  if (!session && !quickAccessCookie && !isAuthRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if ((session || quickAccessCookie) && isAuthRoute) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Placeholder for quick access session validation and timeout logic
  if (quickAccessCookie) {
    console.log('Quick access session found. Implement validation and timeout logic here.');
    // 1. Decrypt and validate the cookie
    // 2. Check for expiration/inactivity
    // 3. If invalid or expired, clear the cookie and redirect to login
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api (API routes)
     */
    '/((?!_next/static|_next/image|favicon.ico|api).*)',
  ],
};
