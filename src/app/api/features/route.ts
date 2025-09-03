
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { validateQuickAccessSession } from '@/lib/sessionValidation';

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

  // Check for quick-access-session cookie
  const quickAccessCookie = req.cookies.get('quick-access-session');
  let isQuickAccess = false;

  if (quickAccessCookie) {
    const validation = await validateQuickAccessSession(req, supabase);
    if (validation.valid) {
      isQuickAccess = true;
    }
  }

  if (isQuickAccess) {
    // For quick access users, return features with 'quickaccess' role
    const { data, error } = await supabase
      .from('features')
      .select('*')
      .contains('roles', ['quickaccess']);

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ features: data });
  }

  // For regular authenticated users, get user and apply RLS
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch features - RLS policy will automatically filter based on user role
  const { data, error } = await supabase
    .from('features')
    .select('*');

  if (error) {
    console.error('Supabase error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ features: data });
}
