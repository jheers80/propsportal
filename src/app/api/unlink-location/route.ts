import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const locationId: number | undefined = body?.locationId;
    
    if (!locationId) {
      return NextResponse.json({ error: 'Location ID is required' }, { status: 400 });
    }

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
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Delete the user-location link using admin client to bypass RLS
    console.log(`🔄 Attempting to unlink user ${user.id} from location ${locationId}`);
    
    const { data: deletedData, error, count } = await supabaseAdmin
      .from('user_locations')
      .delete()
      .eq('user_id', user.id)
      .eq('location_id', locationId)
      .select()
      .maybeSingle();

    console.log('🗑️ Delete result:', { deletedData, error, count });

    if (error) {
      console.error('Error unlinking location:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!deletedData) {
      console.warn('⚠️ No location was unlinked - record may not exist');
      return NextResponse.json({ error: 'Location link not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Location unlinked successfully' });

  } catch (error) {
    console.error('Error in unlink-location API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}