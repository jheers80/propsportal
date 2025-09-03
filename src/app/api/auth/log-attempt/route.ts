import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { logAuditEvent } from '@/lib/audit';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { email, success }: { email?: string; success?: boolean } = body;

  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 });
  }

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

  // Log the authentication attempt
  await logAuditEvent(
    req,
    supabase,
    {
      action: success ? 'user.login.success' : 'user.login.failed',
      resource_type: 'auth',
      details: { email }
    },
    undefined, // userId - will be determined from session if available
    email,
    undefined // userRole - will be determined from session if available
  );

  return NextResponse.json({ ok: true });
}
