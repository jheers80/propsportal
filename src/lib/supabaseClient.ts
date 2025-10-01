import { createBrowserClient } from '@supabase/ssr';
import logger from './logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

/**
 * Convenience helper to get the current session access token
 * Returns null if no session or on error.
 */
export async function getSessionToken() {
	try {
		const { data: { session }, error } = await supabase.auth.getSession();
		if (error) return null;
		return session?.access_token ?? null;
	} catch (err) {
		logger.error('Error getting session token', err);
		return null;
	}
}
