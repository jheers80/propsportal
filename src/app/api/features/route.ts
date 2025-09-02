
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function getUserRoleFromRequest(req: Request) {
  // Try to get quick-access-session cookie
  const cookieHeader = req.headers.get('cookie') || '';
  const match = cookieHeader.match(/quick-access-session=([^;]+)/);
  if (match) {
    try {
      const quickSession = JSON.parse(decodeURIComponent(match[1]));
      if (quickSession && quickSession.valid && quickSession.expires > Date.now()) {
        return 'quickaccess';
      }
    } catch {}
  }
  // Fallback: get user profile from Supabase auth (if available)
  // You may need to adjust this for your auth/session setup
  return null;
}

export async function GET(req: Request) {
  const role = getUserRoleFromRequest(req) || 'guest';
  // Fetch features where the user's role is included in the roles array
  const { data, error } = await supabase
    .from('features')
    .select('*');

  if (error) {
    console.error('Supabase error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Only return features where the user's role is included in the roles array
  const allowedFeatures = data.filter(f => Array.isArray(f.roles) && f.roles.includes(role));
  return NextResponse.json({ features: allowedFeatures });
}
