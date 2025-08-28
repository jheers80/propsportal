import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const passphrase: string | undefined = body?.passphrase;
  if (!passphrase) return NextResponse.json({ error: 'passphrase required' }, { status: 400 });

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
  const { data, error } = await supabase.rpc('quick_login_start_session', { p_passphrase: passphrase });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: 'Invalid passphrase' }, { status: 400 });

  return NextResponse.json({ ok: true, expiresIn: 3600 });
}