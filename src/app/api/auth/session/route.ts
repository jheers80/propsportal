import { createAdminSupabase } from '@/lib/createAdminSupabase';
import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';

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

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        aud: user.aud,
        role: user.role
      }
    });
  } catch (error) {
    logger.error('Error in session API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Create Supabase client with service role key for admin operations
    const supabaseAdmin = createAdminSupabase();

    // Get the current user from the session
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

  // no token required for sign out with admin client here
  const { error: signOutError } = await supabaseAdmin.auth.signOut();

    if (signOutError) {
      logger.error('Error signing out:', signOutError);
      return NextResponse.json({ error: 'Failed to sign out' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error in sign out API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
