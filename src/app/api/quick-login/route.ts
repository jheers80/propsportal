import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { logAuditEvent } from '@/lib/audit';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const p_passphrase: string | undefined = body?.p_passphrase;
  if (!p_passphrase) return NextResponse.json({ error: 'passphrase required' }, { status: 400 });

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

  // No auth required for quick access start; but we still use supabase client to call RPC
  const { data, error } = await supabase.rpc('quick_login_start_session', { p_passphrase: p_passphrase, p_role: 'quickaccess' });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Handle new JSONB return format
  if (!data || !data.success) {
    return NextResponse.json({ error: data?.error || 'Invalid passphrase' }, { status: 400 });
  }

  // Log audit event
  await logAuditEvent(req, supabase, {
    action: 'quicklogin.started',
    resource_type: 'quickaccess',
    resource_id: data.location_id.toString(),
    details: { location_id: data.location_id }
  });

  // Set quick-access-session cookie with session ID for database validation
  const expires = Date.now() + 3600 * 1000;
  const cookieValue = JSON.stringify({
    valid: true,
    expires,
    id: data.session_id,
    location_id: data.location_id
  });
  const res = NextResponse.json({ ok: true, expiresIn: 3600 });
  res.cookies.set('quick-access-session', cookieValue, {
    path: '/',
    httpOnly: true,
    maxAge: 3600,
    sameSite: 'lax',
  });
  return res;
}