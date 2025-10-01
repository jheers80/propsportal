import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/createAdminSupabase';
import logger from '@/lib/logger';

// GET - Fetch all features and roles
export async function GET(request: NextRequest) {
  try {
    // Create Supabase client with service role key for admin operations
    const supabaseAdmin = createAdminSupabase();

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

    // Fetch features and roles
    const [featuresResult, rolesResult] = await Promise.all([
      supabaseAdmin.from('features').select('*').order('name'),
      supabaseAdmin.from('user_roles').select('*').order('name')
    ]);

    if (featuresResult.error) {
      logger.error('Error fetching features:', featuresResult.error);
      return NextResponse.json({ error: 'Failed to fetch features' }, { status: 500 });
    }

    if (rolesResult.error) {
      logger.error('Error fetching roles:', rolesResult.error);
      return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 });
    }

    return NextResponse.json({
      features: featuresResult.data || [],
      roles: rolesResult.data || []
    });
  } catch (error) {
    logger.error('Error in features API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Handle feature operations (create, update, delete)
export async function POST(request: NextRequest) {
  try {
    // Create Supabase client with service role key for admin operations
    const supabaseAdmin = createAdminSupabase();

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

  let auditDetails;

    switch (action) {
      case 'create':
        const { data: newFeature, error: createError } = await supabaseAdmin
          .from('features')
          .insert({
            name: data.name,
            display_name: data.displayName || data.name,
            link: data.link,
            icon: data.icon,
            description: data.description,
            roles: data.roles,
            new_tab: data.newTab
          })
          .select()
          .single();

        if (createError) {
          logger.error('Error creating feature:', createError);
          return NextResponse.json({ error: createError.message }, { status: 500 });
        }

        auditDetails = { feature_name: data.name, feature_id: newFeature.id };
        break;

      case 'update':
        const { error: updateError } = await supabaseAdmin
          .from('features')
          .update({
            name: data.name,
            display_name: data.displayName || data.name,
            link: data.link,
            icon: data.icon,
            description: data.description,
            roles: data.roles,
            new_tab: data.newTab
          })
          .eq('id', data.id);

        if (updateError) {
          logger.error('Error updating feature:', updateError);
          return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        auditDetails = { feature_id: data.id, feature_name: data.name };
        break;

      case 'delete':
        const { error: deleteError } = await supabaseAdmin
          .from('features')
          .delete()
          .eq('id', data.id);

        if (deleteError) {
          logger.error('Error deleting feature:', deleteError);
          return NextResponse.json({ error: deleteError.message }, { status: 500 });
        }

        auditDetails = { feature_id: data.id };
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
        action: `features.${action}`,
        resource_type: 'feature',
        resource_id: data.id?.toString() || 'new',
        details: auditDetails
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error in features POST API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
