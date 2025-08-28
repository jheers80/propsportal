import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(req: NextRequest) {
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

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 });

  const role = profile?.role as string | undefined;

  if (role === 'superadmin') {
    // superadmin can view all
    const { data, error } = await supabase
      .from('passphrases')
      .select('location_id, passphrase, created_at, locations:location_id(id, store_id, store_name)')
      .order('location_id');
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ passphrases: data });
  }

  // Otherwise, show only assigned locations via RLS policy + explicit filter
  const { data, error } = await supabase
    .from('passphrases')
    .select('location_id, passphrase, created_at, locations:location_id(id, store_id, store_name)')
    .in('location_id', (
      await supabase.from('user_locations').select('location_id').eq('user_id', user.id)
  ).data?.map((r: { location_id: string }) => r.location_id) || []);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ passphrases: data });
}