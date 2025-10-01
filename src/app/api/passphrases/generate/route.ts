import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { randomInt } from 'crypto';
import { predicates, objects, teams, collections } from 'friendly-words';
import { logAuditEvent } from '@/lib/audit';

function pickPassphrase(wordCount = 3) {
  // Option 1: Using random-words (most common words)
  // legacy random-words helper left intentionally for reference

  // Option 2: Using friendly-words (curated for human-friendly combinations)
  const friendlyWordsPassphrase = () => {
    const wordPools = [predicates, objects, teams, collections];
    const parts: string[] = [];
    
    for (let i = 0; i < wordCount; i++) {
      // Rotate through different word types for variety
      const poolIndex = i % wordPools.length;
      const pool = wordPools[poolIndex];
      const word = pool[randomInt(0, pool.length)];
      parts.push(word.toLowerCase());
    }
    return parts.join('-');
  };

  // Use friendly-words for more natural combinations
  return friendlyWordsPassphrase();
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const locationId = Number(body?.locationId);
  if (!locationId) return NextResponse.json({ error: 'locationId required' }, { status: 400 });

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

  // Authn
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Authorization via RLS will guard the update. We can also pre-check that user has access
  // by verifying they are superadmin or assigned to the location with manager/multiunit.
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();

  // Get the actual role name from user_roles table
  const { data: userRole, error: roleError } = await supabase
    .from('user_roles')
    .select('name')
    .eq('id', profile?.role)
    .single();

  if (roleError) return NextResponse.json({ error: 'Failed to verify role' }, { status: 500 });

  const roleName = userRole?.name;

  if (roleName !== 'superadmin') {
    // must be assigned to that location
    const { data: assignment } = await supabase
      .from('user_locations')
      .select('location_id')
      .eq('user_id', user.id)
      .eq('location_id', locationId)
      .maybeSingle();
    if (!assignment) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!(roleName === 'manager' || roleName === 'multiunit')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  // Generate a new passphrase and upsert (rotate) for this location. Unique(location_id) ensures one active per location
  const passphrase = pickPassphrase(3);

  const { error: upsertError } = await supabase
    .from('passphrases')
    .upsert({ location_id: locationId, passphrase }, { onConflict: 'location_id' })
    .select('id')
    .single();

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 400 });
  }

  // Log audit event
  await logAuditEvent(req, supabase, {
    action: 'passphrase.generated',
    resource_type: 'passphrase',
    resource_id: locationId.toString(),
    details: { passphrase, location_id: locationId }
  }, user.id);

  return NextResponse.json({ passphrase });
}