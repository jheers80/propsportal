import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/createAdminSupabase';
import logger from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
  // user creation API invoked
    // Create Supabase client with service role key for admin operations
    const supabaseAdmin = createAdminSupabase();
  // Supabase admin client created

    // Get the current user from the session to check permissions
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
  // token extracted
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
  logger.error('Auth error:', authError);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    // user authenticated

    // Check if current user has permission to create users
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) {
  logger.error('Profile error:', profileError);
      return NextResponse.json({ error: 'Failed to verify permissions' }, { status: 500 });
    }
    // profile found

    // Check if user has admin role
    const { data: userRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('name')
      .eq('id', profile.role)
      .single();

    if (roleError || !['superadmin', 'manager'].includes(userRole?.name)) {
  logger.error('Role or permission error:', roleError, 'Role name:', userRole?.name);
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    // role check passed

    const body = await request.json();
    const { email, password, full_name: fullName } = body;
  // request body parsed (email/presence not logged for privacy)

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Create the user
  // creating user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for admin-created users
      user_metadata: {
        full_name: fullName
      }
    });

    if (createError) {
  logger.error('Error creating user:', createError);
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }
    // user created

    // Create profile for the new user
    const { data: newProfile, error: profileCreateError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: newUser.user.id,
        full_name: fullName,
        email: email
      })
      .select()
      .single();

    if (profileCreateError) {
  logger.error('Error creating profile:', profileCreateError);
      // Don't fail the request if profile creation fails, but log it
    } else {
      // profile created
    }

    // Log the user creation
    try {
      await supabaseAdmin
        .from('audit_trails')
        .insert({
          user_id: user.id,
          user_email: user.email,
          user_role: userRole?.name,
          action: 'user.create',
          resource_type: 'user',
          resource_id: newUser.user.id,
          details: {
            created_user_email: email,
            created_user_name: fullName
          }
        });
  // audit logged
    } catch (auditError) {
  logger.error('Error logging audit trail:', auditError);
      // Don't fail the request if audit logging fails
    }

    const response = NextResponse.json({
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
        full_name: fullName
      },
      profile: newProfile
    });
    // API response sent
    return response;
  } catch (error) {
  logger.error('Error in user creation API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
