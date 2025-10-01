import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/createAdminSupabase';
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

    // Fetch the user's profile
    const profileResult = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    let profile = profileResult.data;
    const profileError = profileResult.error;

    // If profile doesn't exist, create a default one
    if (profileError && profileError.code === 'PGRST116') {
      // profile missing - creating default profile
      const { data: newProfile, error: createError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: user.id,
          role: 4, // Default to 'staff' role
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          email: user.email
        })
        .select()
        .single();

      if (createError) {
    logger.error('Error creating profile:', createError);
        return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
      }

      profile = newProfile;
    } else if (profileError) {
  logger.error('Error fetching profile:', profileError);
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json({ profile });
  } catch (error) {
  logger.error('Error in profile API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
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

    // Read raw text so we can detect empty bodies without throwing.
    const raw = await request.text();
    let body: any = {};

    if (!raw || raw.trim() === '') {
      // No body provided — treat as a no-op and return current profile below.
      body = {};
    } else {
      try {
        body = JSON.parse(raw);
      } catch (e) {
  logger.warn('Invalid JSON in profile POST', e);
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
      }
    }

    const { full_name, email } = body ?? {};

    if (typeof full_name === 'undefined' && typeof email === 'undefined') {
      // No fields provided — treat this as a no-op and return the current profile.
      const existing = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (existing.error) {
  logger.error('Error fetching existing profile during no-op POST:', existing.error);
        return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
      }

      return NextResponse.json({ profile: existing.data });
    }

    // Update the user's profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        full_name,
        email,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single();

    if (profileError) {
  logger.error('Error updating profile:', profileError);
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    return NextResponse.json({ profile });
  } catch (error) {
  logger.error('Error in profile update API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
