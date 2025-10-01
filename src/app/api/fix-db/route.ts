import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import logger from '@/lib/logger';

export async function POST(/* _request: NextRequest */) {
  try {
    // Test database connection
    const { error: testError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    if (testError) {
      logger.error('Database connection test failed:', testError);
      return NextResponse.json(
        { error: 'Database connection failed', details: testError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      note: 'To apply the RLS fixes, please run the SQL commands manually in your Supabase SQL editor',
      sql_commands: [
        {
          title: 'Update get_my_role function',
          sql: `
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
DECLARE
  user_role_name TEXT;
BEGIN
  -- Query profiles table directly without RLS restrictions
  SELECT ur.name INTO user_role_name
  FROM public.profiles p
  JOIN public.user_roles ur ON p.role = ur.id
  WHERE p.id = auth.uid();

  RETURN COALESCE(user_role_name, 'staff');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
          `
        },
        {
          title: 'Update profiles policies',
          sql: `
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (get_my_role() IN ('superadmin', 'manager'));

DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
CREATE POLICY "Admins can update profiles" ON public.profiles
  FOR UPDATE USING (get_my_role() IN ('superadmin', 'manager'));
          `
        },
        {
          title: 'Update features policies',
          sql: `
DROP POLICY IF EXISTS superadmin_write ON features;
DROP POLICY IF EXISTS portal_user_read ON features;

CREATE POLICY superadmin_write ON features
    FOR ALL
    USING (get_my_role() = 'superadmin')
    WITH CHECK (get_my_role() = 'superadmin');

CREATE POLICY portal_user_read ON features
    FOR SELECT
    USING (get_my_role() IN (SELECT unnest(features.roles)));
          `
        }
      ]
    });

  } catch (error) {
    logger.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Unexpected error occurred', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
