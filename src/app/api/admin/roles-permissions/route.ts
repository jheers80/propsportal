import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// GET - Fetch all roles, permissions, and role-permissions
export async function GET(request: NextRequest) {
  try {
    // Create Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get the current user from the session
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check if current user has superadmin role
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return NextResponse.json({ error: 'Failed to verify permissions' }, { status: 500 });
    }

    const { data: userRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('name')
      .eq('id', profile.role)
      .single();

    if (roleError || userRole?.name !== 'superadmin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Fetch all data
    const [userRolesResult, permissionsResult, rolePermissionsResult] = await Promise.all([
      supabaseAdmin.from('user_roles').select('*').order('name'),
      supabaseAdmin.from('permissions').select('*').order('name'),
      supabaseAdmin.from('role_permissions').select('*')
    ]);

    if (userRolesResult.error) {
      console.error('Error fetching user roles:', userRolesResult.error);
      return NextResponse.json({ error: 'Failed to fetch user roles' }, { status: 500 });
    }

    if (permissionsResult.error) {
      console.error('Error fetching permissions:', permissionsResult.error);
      return NextResponse.json({ error: 'Failed to fetch permissions' }, { status: 500 });
    }

    if (rolePermissionsResult.error) {
      console.error('Error fetching role permissions:', rolePermissionsResult.error);
      return NextResponse.json({ error: 'Failed to fetch role permissions' }, { status: 500 });
    }

    return NextResponse.json({
      userRoles: userRolesResult.data || [],
      permissions: permissionsResult.data || [],
      rolePermissions: rolePermissionsResult.data || []
    });
  } catch (error) {
    console.error('Error in roles-permissions API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Handle various operations (add role, add permission, assign/unassign permission)
export async function POST(request: NextRequest) {
  try {
    // Create Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get the current user from the session
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check if current user has superadmin role
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return NextResponse.json({ error: 'Failed to verify permissions' }, { status: 500 });
    }

    const { data: userRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('name')
      .eq('id', profile.role)
      .single();

    if (roleError || userRole?.name !== 'superadmin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { action, ...data } = body;

    let result;
    let auditDetails;

    switch (action) {
      case 'add_role':
        const { error: addRoleError } = await supabaseAdmin
          .from('user_roles')
          .insert({
            name: data.name,
            display_name: data.displayName,
            description: data.description
          });

        if (addRoleError) {
          console.error('Error adding role:', addRoleError);
          return NextResponse.json({ error: addRoleError.message }, { status: 500 });
        }

        auditDetails = { role_name: data.name };
        break;

      case 'update_role':
        const { error: updateRoleError } = await supabaseAdmin
          .from('user_roles')
          .update({
            name: data.name,
            display_name: data.displayName,
            description: data.description
          })
          .eq('id', data.id);

        if (updateRoleError) {
          console.error('Error updating role:', updateRoleError);
          return NextResponse.json({ error: updateRoleError.message }, { status: 500 });
        }

        auditDetails = { role_id: data.id, role_name: data.name };
        break;

      case 'delete_role':
        const { error: deleteRoleError } = await supabaseAdmin
          .from('user_roles')
          .delete()
          .eq('id', data.id);

        if (deleteRoleError) {
          console.error('Error deleting role:', deleteRoleError);
          return NextResponse.json({ error: deleteRoleError.message }, { status: 500 });
        }

        auditDetails = { role_id: data.id };
        break;

      case 'add_permission':
        const { error: addPermError } = await supabaseAdmin
          .from('permissions')
          .insert({
            name: data.name,
            description: data.description
          });

        if (addPermError) {
          console.error('Error adding permission:', addPermError);
          return NextResponse.json({ error: addPermError.message }, { status: 500 });
        }

        auditDetails = { permission_name: data.name };
        break;

      case 'update_permission':
        const { error: updatePermError } = await supabaseAdmin
          .from('permissions')
          .update({
            name: data.name,
            description: data.description
          })
          .eq('id', data.id);

        if (updatePermError) {
          console.error('Error updating permission:', updatePermError);
          return NextResponse.json({ error: updatePermError.message }, { status: 500 });
        }

        auditDetails = { permission_id: data.id, permission_name: data.name };
        break;

      case 'delete_permission':
        const { error: deletePermError } = await supabaseAdmin
          .from('permissions')
          .delete()
          .eq('id', data.id);

        if (deletePermError) {
          console.error('Error deleting permission:', deletePermError);
          return NextResponse.json({ error: deletePermError.message }, { status: 500 });
        }

        auditDetails = { permission_id: data.id };
        break;

      case 'assign_permission':
        const { error: assignError } = await supabaseAdmin
          .from('role_permissions')
          .insert({
            role: data.roleId,
            permission_id: data.permissionId
          });

        if (assignError) {
          console.error('Error assigning permission:', assignError);
          return NextResponse.json({ error: assignError.message }, { status: 500 });
        }

        auditDetails = { role_id: data.roleId, permission_id: data.permissionId };
        break;

      case 'unassign_permission':
        const { error: unassignError } = await supabaseAdmin
          .from('role_permissions')
          .delete()
          .match({ role: data.roleId, permission_id: data.permissionId });

        if (unassignError) {
          console.error('Error unassigning permission:', unassignError);
          return NextResponse.json({ error: unassignError.message }, { status: 500 });
        }

        auditDetails = { role_id: data.roleId, permission_id: data.permissionId };
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Log the action
    await supabaseAdmin
      .from('audit_trails')
      .insert({
        user_id: user.id,
        user_email: user.email,
        user_role: userRole?.name,
        action: `roles_permissions.${action}`,
        resource_type: 'roles_permissions',
        resource_id: data.id?.toString() || 'system',
        details: auditDetails
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in roles-permissions POST API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
