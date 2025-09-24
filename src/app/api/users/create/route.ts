import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('Starting user creation API');
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
    console.log('Supabase admin client created');

    // Get the current user from the session to check permissions
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('Token extracted:', token ? 'present' : 'missing');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.log('Auth error:', authError);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    console.log('User authenticated:', user.id);

    // Check if current user has permission to create users
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.log('Profile error:', profileError);
      return NextResponse.json({ error: 'Failed to verify permissions' }, { status: 500 });
    }
    console.log('Profile found, role:', profile.role);

    // Check if user has admin role
    const { data: userRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('name')
      .eq('id', profile.role)
      .single();

    if (roleError || !['superadmin', 'manager'].includes(userRole?.name)) {
      console.log('Role error:', roleError, 'Role name:', userRole?.name);
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    console.log('Role check passed:', userRole?.name);

    const body = await request.json();
    const { email, password, full_name: fullName } = body;
    console.log('Request body:', { email, password: password ? 'present' : 'missing', fullName });

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Create the user
    console.log('Creating user with email:', email);
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for admin-created users
      user_metadata: {
        full_name: fullName
      }
    });

    if (createError) {
      console.error('Error creating user:', createError);
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }
    console.log('User created:', newUser.user.id);

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
      console.error('Error creating profile:', profileCreateError);
      // Don't fail the request if profile creation fails, but log it
    } else {
      console.log('Profile created');
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
      console.log('Audit logged');
    } catch (auditError) {
      console.error('Error logging audit trail:', auditError);
      // Don't fail the request if audit logging fails
    }

    return NextResponse.json({
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
        full_name: fullName
      },
      profile: newProfile
    });
    console.log('API response sent');
  } catch (error) {
    console.error('Error in user creation API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
