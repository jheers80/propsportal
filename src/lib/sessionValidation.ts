import { createServerClient } from '@supabase/ssr';
import { NextRequest } from 'next/server';

export interface QuickAccessSession {
  id: number;
  location_id: number;
  passphrase_hash: string;
  expires_at: string;
  role: string;
  created_at: string;
}

export async function validateQuickAccessSession(
  req: NextRequest,
  supabase?: ReturnType<typeof createServerClient>
): Promise<{ valid: boolean; session?: QuickAccessSession; error?: string }> {
  const quickAccessCookie = req.cookies.get('quick-access-session');
  if (!quickAccessCookie) {
    return { valid: false, error: 'No quick access session cookie' };
  }

  try {
    const quickSession = JSON.parse(quickAccessCookie.value);
    const now = Date.now();

    // Check basic cookie validity
    if (!quickSession.valid || quickSession.expires < now || !quickSession.id) {
      return { valid: false, error: 'Quick access session expired or invalid' };
    }

    // If no supabase client provided, create one
    if (!supabase) {
      supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get: (name: string) => req.cookies.get(name)?.value,
            set: () => {},
            remove: () => {},
          },
        }
      );
    }

    // Validate against database - check if session exists and hasn't expired
    const { data: session, error } = await supabase
      .from('quick_access_sessions')
      .select('*')
      .eq('id', quickSession.id)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !session) {
      return { valid: false, error: 'Quick access session not found in database or expired' };
    }

    return { valid: true, session };
  } catch {
    return { valid: false, error: 'Invalid quick access session format' };
  }
}
