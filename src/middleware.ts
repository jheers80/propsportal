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
    return NextResponse.redirect(new URL('/portal', request.url));
  }

  // Quick access session validation and timeout logic
  if (quickAccessCookie) {
    // Example: Assume cookie value is a JSON string with { valid: true, expires: timestamp }
    try {
      const quickSession = JSON.parse(quickAccessCookie.value);
      const now = Date.now();
      if (!quickSession.valid || quickSession.expires < now) {
        // Expired or invalid quick session
        const res = NextResponse.redirect(new URL('/login', request.url));
        res.cookies.delete('quick-access-session');
        return res;
      }
      // Valid quick session: allow access to /portal and protected routes
      if (request.nextUrl.pathname === '/portal' || request.nextUrl.pathname.startsWith('/portal')) {
        return response;
      }
      // For other protected routes, optionally restrict access
      // (You can add more logic here if needed)
    } catch (e) {
      // Malformed cookie, treat as invalid
      const res = NextResponse.redirect(new URL('/login', request.url));
      res.cookies.delete('quick-access-session');
      return res;
    }
  }

    // Role/permission-based route protection
    const protectedRoutes = [
      { path: '/profile', roles: ['superadmin', 'manager', 'multiunit', 'user'] },
      { path: '/portal', roles: ['superadmin', 'manager', 'multiunit', 'user', 'quick'] },
      { path: '/link-location', roles: ['superadmin', 'manager', 'multiunit'] },
      { path: '/admin', roles: ['superadmin', 'manager', 'multiunit'] },
      { path: '/admin/features', roles: ['superadmin'] },
      { path: '/admin/locations', roles: ['superadmin'] },
      { path: '/admin/passphrases', roles: ['superadmin', 'manager', 'multiunit'] },
      { path: '/admin/users', roles: ['superadmin'] },
      { path: '/admin/roles-permissions', roles: ['superadmin'] },
    ];

    // If quick access session is present and valid, allow /portal and subroutes
    if (quickAccessCookie) {
      try {
        const quickSession = JSON.parse(quickAccessCookie.value);
        const now = Date.now();
        if (quickSession.valid && quickSession.expires > now) {
          if (request.nextUrl.pathname === '/portal' || request.nextUrl.pathname.startsWith('/portal')) {
            return response;
          }
          // For other protected routes, restrict access
          for (const route of protectedRoutes) {
            if (request.nextUrl.pathname.startsWith(route.path) && route.path !== '/portal') {
              return NextResponse.redirect(new URL('/portal', request.url));
            }
          }
        }
      } catch (e) {
        // Malformed cookie, treat as invalid
        const res = NextResponse.redirect(new URL('/login', request.url));
        res.cookies.delete('quick-access-session');
        return res;
      }
    }

    // Only check protected routes if session exists
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userData?.user) {
      // Get user profile from supabase
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userData.user.id)
        .single();
      if (!profileError && profileData) {
        const userRole = profileData.role;
        for (const route of protectedRoutes) {
          if (request.nextUrl.pathname.startsWith(route.path)) {
            if (!route.roles.includes(userRole)) {
              return NextResponse.redirect(new URL('/portal', request.url));
            }
          }
        }
      }
    } else {
      // If not logged in, block protected routes except those explicitly allowed
      for (const route of protectedRoutes) {
        if (request.nextUrl.pathname.startsWith(route.path)) {
          return NextResponse.redirect(new URL('/login', request.url));
        }
      }
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
