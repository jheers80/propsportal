import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function POST(req: NextRequest) {
  const res = NextResponse.json({ ok: true });
  res.cookies.set('quick-access-session', '', {
    path: '/',
    httpOnly: true,
    expires: new Date(0),
    sameSite: 'lax',
  });

  return res;
}
