import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  const { supabase, response } = createClient(request);

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const quickAccessCookie = request.cookies.get('quick-access-session');
  const pathname = request.nextUrl.pathname;

  // Public routes that don't require authentication
  const publicRoutes = ['/', '/login', '/quick-login'];
  const isPublicRoute = publicRoutes.includes(pathname);

  // Auth routes - redirect to portal if already authenticated
  const authRoutes = ['/login', '/quick-login'];
  const isAuthRoute = authRoutes.includes(pathname);

  // Allow access to public routes
  if (isPublicRoute) {
    return response;
  }

  // If user is authenticated and trying to access auth routes, redirect to portal
  if ((session || quickAccessCookie) && isAuthRoute) {
    return NextResponse.redirect(new URL('/portal', request.url));
  }

  // If user is not authenticated and trying to access protected routes, redirect to login
  if (!session && !quickAccessCookie && !isAuthRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Handle quick access session validation
  if (quickAccessCookie && !session) {
    try {
      const quickSession = JSON.parse(quickAccessCookie.value);
      const now = Date.now();

      if (!quickSession.valid || quickSession.expires < now) {
        // Invalid/expired session - clear cookie and redirect
        const res = NextResponse.redirect(new URL('/login', request.url));
        res.cookies.delete('quick-access-session');
        return res;
      }

      // Valid quick session - allow access to portal and sub-routes
      if (pathname === '/portal' || pathname.startsWith('/portal/')) {
        return response;
      }

      // For other routes, redirect quick access users to portal
      return NextResponse.redirect(new URL('/portal', request.url));

    } catch (e) {
      // Malformed cookie - clear and redirect
      const res = NextResponse.redirect(new URL('/login', request.url));
      res.cookies.delete('quick-access-session');
      return res;
    }
  }

  // For authenticated users, allow access to all routes
  // Role-based restrictions can be handled in the components themselves
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
