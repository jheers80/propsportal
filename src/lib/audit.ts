import { createServerClient } from '@supabase/ssr';
import { NextRequest } from 'next/server';
import logger from './logger';

export interface AuditEvent {
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
}

export async function logAuditEvent(
  req: NextRequest,
  supabase: ReturnType<typeof createServerClient>,
  event: AuditEvent,
  userId?: string,
  userEmail?: string,
  userRole?: string
): Promise<void> {
  try {
    // Get user info if not provided
    if (!userId || !userEmail || !userRole) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userId = user.id;
        userEmail = user.email;

        if (!userRole) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

          if (profile) {
            userRole = typeof profile.role === 'number' ? profile.role.toString() : profile.role;
          }
        }
      }
    }

    // Get IP address and user agent
    const ip_address = req.headers.get('x-forwarded-for') ||
                      req.headers.get('x-real-ip') ||
                      'unknown';

    const user_agent = req.headers.get('user-agent') || 'unknown';

    // Insert audit trail
    const { error } = await supabase
      .from('audit_trails')
      .insert({
        user_id: userId,
        user_email: userEmail,
        user_role: userRole,
        action: event.action,
        resource_type: event.resource_type,
        resource_id: event.resource_id,
        details: event.details || {},
        ip_address,
        user_agent,
      });

    if (error) {
      // use centralized logger
      logger.error('Error logging audit event:', error);
    }
  } catch (error) {
    logger.error('Error in logAuditEvent:', error);
  }
}

// Helper functions for common audit events
export async function logUserLogin(
  req: NextRequest,
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
  userEmail: string,
  userRole: string,
  success: boolean
): Promise<void> {
  await logAuditEvent(req, supabase, {
    action: success ? 'user.login.success' : 'user.login.failed',
    resource_type: 'auth',
    resource_id: userId,
    details: { email: userEmail },
  }, userId, userEmail, userRole);
}

export async function logUserLogout(
  req: NextRequest,
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
  userEmail: string,
  userRole: string
): Promise<void> {
  await logAuditEvent(req, supabase, {
    action: 'user.logout',
    resource_type: 'auth',
    resource_id: userId,
    details: { email: userEmail },
  }, userId, userEmail, userRole);
}

export async function logFeatureAccess(
  req: NextRequest,
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
  userEmail: string,
  userRole: string,
  featureName: string
): Promise<void> {
  await logAuditEvent(req, supabase, {
    action: 'feature.access',
    resource_type: 'feature',
    resource_id: featureName,
    details: { feature: featureName },
  }, userId, userEmail, userRole);
}

export async function logLocationAccess(
  req: NextRequest,
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
  userEmail: string,
  userRole: string,
  locationId: string,
  action: string
): Promise<void> {
  await logAuditEvent(req, supabase, {
    action: `location.${action}`,
    resource_type: 'location',
    resource_id: locationId,
    details: { location_id: locationId },
  }, userId, userEmail, userRole);
}

export async function logUserManagement(
  req: NextRequest,
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
  userEmail: string,
  userRole: string,
  targetUserId: string,
  action: string,
  details?: Record<string, unknown>
): Promise<void> {
  await logAuditEvent(req, supabase, {
    action: `user.${action}`,
    resource_type: 'user',
    resource_id: targetUserId,
    details: { target_user_id: targetUserId, ...details },
  }, userId, userEmail, userRole);
}

export async function logRoleManagement(
  req: NextRequest,
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
  userEmail: string,
  userRole: string,
  targetRoleId: string,
  action: string,
  details?: Record<string, unknown>
): Promise<void> {
  await logAuditEvent(req, supabase, {
    action: `role.${action}`,
    resource_type: 'role',
    resource_id: targetRoleId,
    details: { target_role_id: targetRoleId, ...details },
  }, userId, userEmail, userRole);
}

export async function logPermissionManagement(
  req: NextRequest,
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
  userEmail: string,
  userRole: string,
  targetPermissionId: string,
  action: string,
  details?: Record<string, unknown>
): Promise<void> {
  await logAuditEvent(req, supabase, {
    action: `permission.${action}`,
    resource_type: 'permission',
    resource_id: targetPermissionId,
    details: { target_permission_id: targetPermissionId, ...details },
  }, userId, userEmail, userRole);
}
