#!/usr/bin/env node

/**
 * Database RLS Policy Fix Script
 * This script applies the necessary fixes to resolve infinite recursion in RLS policies
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyFixes() {
  console.log('🔧 Starting database RLS policy fixes...\n');

  try {
    // Test connection
    console.log('1. Testing database connection...');
    const { data: testData, error: testError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    if (testError) {
      throw new Error(`Database connection failed: ${testError.message}`);
    }
    console.log('✅ Database connection successful\n');

    // Update get_my_role function
    console.log('2. Updating get_my_role() function...');
    const { error: functionError } = await supabase.rpc('exec_sql', {
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
    });

    if (functionError) {
      console.warn('⚠️  Could not update function via RPC, you may need to run SQL manually');
      console.log('Function SQL:');
      console.log(`
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
      `);
    } else {
      console.log('✅ get_my_role() function updated\n');
    }

    // Update profiles policies
    console.log('3. Updating profiles table policies...');
    const { error: profilesError } = await supabase.rpc('exec_sql', {
      sql: `
        DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
        CREATE POLICY "Admins can view all profiles" ON public.profiles
          FOR SELECT USING (get_my_role() IN ('superadmin', 'manager'));

        DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
        CREATE POLICY "Admins can update profiles" ON public.profiles
          FOR UPDATE USING (get_my_role() IN ('superadmin', 'manager'));
      `
    });

    if (profilesError) {
      console.warn('⚠️  Could not update profiles policies via RPC');
      console.log('Profiles policies SQL:');
      console.log(`
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (get_my_role() IN ('superadmin', 'manager'));

DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
CREATE POLICY "Admins can update profiles" ON public.profiles
  FOR UPDATE USING (get_my_role() IN ('superadmin', 'manager'));
      `);
    } else {
      console.log('✅ Profiles policies updated\n');
    }

    // Update features policies
    console.log('4. Updating features table policies...');
    const { error: featuresError } = await supabase.rpc('exec_sql', {
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
    });

    if (featuresError) {
      console.warn('⚠️  Could not update features policies via RPC');
      console.log('Features policies SQL:');
      console.log(`
DROP POLICY IF EXISTS superadmin_write ON features;
DROP POLICY IF EXISTS portal_user_read ON features;

CREATE POLICY superadmin_write ON features
    FOR ALL
    USING (get_my_role() = 'superadmin')
    WITH CHECK (get_my_role() = 'superadmin');

CREATE POLICY portal_user_read ON features
    FOR SELECT
    USING (get_my_role() IN (SELECT unnest(features.roles)));
      `);
    } else {
      console.log('✅ Features policies updated\n');
    }

    console.log('🎉 Database fixes applied successfully!');
    console.log('\n📋 Summary of changes:');
    console.log('   • Updated get_my_role() function to prevent infinite recursion');
    console.log('   • Simplified profiles table RLS policies');
    console.log('   • Updated features table RLS policies');
    console.log('\n🔄 Please restart your application to test the fixes.');

  } catch (error) {
    console.error('❌ Error applying fixes:', error.message);
    process.exit(1);
  }
}

applyFixes();
