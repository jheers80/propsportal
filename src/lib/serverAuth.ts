import { createAdminSupabase } from '@/lib/createAdminSupabase';
import logger from '@/lib/logger';

type ProfileRec = { id: string; role: string | number } | null;

export async function resolveUserFromToken(token: string) {
  const supabaseAdmin = createAdminSupabase();
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) return { user: null, error };
    return { user, error: null };
  } catch (e) {
    logger.error('resolveUserFromToken error', e);
    return { user: null, error: e };
  }
}

export async function resolveRoleNameForUserId(userId: string) {
  const supabaseAdmin = createAdminSupabase();
  try {
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (profileError || !profile) return { roleName: null, profile: null } as { roleName: null; profile: ProfileRec };

    let roleName: string | null = null;
    try {
      const { data: roleRec, error: roleErr } = await supabaseAdmin
        .from('user_roles')
        .select('name')
        .eq('id', profile.role)
        .single();
      if (!roleErr && roleRec) roleName = roleRec.name;
    } catch {}

    if (!roleName) {
      if (profile.role === 'superadmin' || profile.role === 1 || profile.role === '1') roleName = 'superadmin';
      else if (typeof profile.role === 'string') roleName = profile.role;
    }

    return { roleName, profile } as { roleName: string | null; profile: ProfileRec };
  } catch (e) {
    logger.error('resolveRoleNameForUserId error', e);
    return { roleName: null, profile: null } as { roleName: null; profile: ProfileRec };
  }
}

export async function userHasLocationMembership(userId: string, locationId: any) {
  const supabaseAdmin = createAdminSupabase();
  try {
    const { data, error } = await supabaseAdmin
      .from('user_locations')
      .select('location_id')
      .eq('user_id', userId)
      .eq('location_id', locationId)
      .limit(1);
    if (error) {
      logger.error('userHasLocationMembership error', error);
      return false;
    }
    return Array.isArray(data) && data.length > 0;
  } catch (e) {
    logger.error('userHasLocationMembership exception', e);
    return false;
  }
}

export default {
  resolveUserFromToken,
  resolveRoleNameForUserId,
  userHasLocationMembership,
};
