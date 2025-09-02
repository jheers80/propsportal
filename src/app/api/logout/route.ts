import { NextResponse } from 'next/server';

export async function POST() {
  // Clear quick-access-session cookie
  const res = NextResponse.json({ ok: true });
  res.cookies.set('quick-access-session', '', {
    path: '/',
    httpOnly: true,
    expires: new Date(0),
    sameSite: 'lax',
  });
  return res;
}
