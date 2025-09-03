import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function POST(req: NextRequest) {
  const response = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => req.cookies.get(name)?.value,
        set: (name: string, value: string, options) => {
          response.cookies.set({ name, value, ...options });
        },
        remove: (name: string, options) => {
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // Sign out from Supabase auth
  const { error } = await supabase.auth.signOut();

  // Clear quick-access-session cookie
  const res = NextResponse.json({ ok: true });
  res.cookies.set('quick-access-session', '', {
    path: '/',
    httpOnly: true,
    expires: new Date(0),
    sameSite: 'lax',
  });

  if (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return res;
}
