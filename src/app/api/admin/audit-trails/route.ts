import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

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

// GET - Fetch audit trails
export async function GET(request: NextRequest) {
  try {
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

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const action = searchParams.get('action');
    const resourceType = searchParams.get('resource_type');
    const userId = searchParams.get('user_id');

    let query = supabaseAdmin
      .from('audit_trails')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters if provided
    if (action) {
      query = query.eq('action', action);
    }
    if (resourceType) {
      query = query.eq('resource_type', resourceType);
    }
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: auditTrails, error: auditError } = await query;

    if (auditError) {
      console.error('Error fetching audit trails:', auditError);
      return NextResponse.json({ error: 'Failed to fetch audit trails' }, { status: 500 });
    }

    return NextResponse.json({
      auditTrails: auditTrails || [],
      total: auditTrails?.length || 0
    });
  } catch (error) {
    console.error('Error in audit trails API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
