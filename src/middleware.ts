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

  // Placeholder for quick access session validation and timeout logic
  if (quickAccessCookie) {
    console.log('Quick access session found. Implement validation and timeout logic here.');
    // 1. Decrypt and validate the cookie
    // 2. Check for expiration/inactivity
    // 3. If invalid or expired, clear the cookie and redirect to login
  }

    // Role/permission-based route protection
    const protectedRoutes = [
      { path: '/profile', roles: ['superadmin', 'manager', 'multiunit', 'user'] },
      { path: '/portal', roles: ['superadmin', 'manager', 'multiunit', 'user'] },
      { path: '/link-location', roles: ['superadmin', 'manager', 'multiunit'] },
      { path: '/admin', roles: ['superadmin', 'manager', 'multiunit'] },
      { path: '/admin/features', roles: ['superadmin'] },
      { path: '/admin/locations', roles: ['superadmin'] },
      { path: '/admin/passphrases', roles: ['superadmin', 'manager', 'multiunit'] },
      { path: '/admin/users', roles: ['superadmin'] },
      { path: '/admin/roles-permissions', roles: ['superadmin'] },
    ];

    // Only check protected routes if session exists
    // Securely get user from Supabase Auth server
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
