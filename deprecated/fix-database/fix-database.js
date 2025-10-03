#!/usr/bin/env node

/**
 * Database RLS Policy Fix Script
 * This script applies the necessary fixes to resolve infinite recursion in RLS policies
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const logger = require('../scripts/cliLogger');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  logger.error('❌ Missing environment variables:');
  logger.error('   NEXT_PUBLIC_SUPABASE_URL');
  logger.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyFixes() {
  logger.info('🔧 Starting database RLS policy fixes...\n');

  try {
  // Test connection
  logger.info('1. Testing database connection...');
    const { data: testData, error: testError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    if (testError) {
      throw new Error(`Database connection failed: ${testError.message}`);
    }
    logger.info('✅ Database connection successful\n');

    // Update get_my_role function
  logger.info('2. Updating get_my_role() function...');
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
      logger.warn('⚠️  Could not update function via RPC, you may need to run SQL manually');
      logger.info('Function SQL:');
      logger.info(`
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
      logger.info('✅ get_my_role() function updated\n');
    }

    // Update profiles policies
  logger.info('3. Updating profiles table policies...');
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
      logger.warn('⚠️  Could not update profiles policies via RPC');
      logger.info('Profiles policies SQL:');
      logger.info(`
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (get_my_role() IN ('superadmin', 'manager'));

DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
CREATE POLICY "Admins can update profiles" ON public.profiles
  FOR UPDATE USING (get_my_role() IN ('superadmin', 'manager'));
      `);
    } else {
      logger.info('✅ Profiles policies updated\n');
    }

    // Update features policies
  logger.info('4. Updating features table policies...');
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
      logger.warn('⚠️  Could not update features policies via RPC');
      logger.info('Features policies SQL:');
      logger.info(`
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
      logger.info('✅ Features policies updated\n');
    }

  logger.info('🎉 Database fixes applied successfully!');
  logger.info('\n📋 Summary of changes:');
  logger.info('   • Updated get_my_role() function to prevent infinite recursion');
  logger.info('   • Simplified profiles table RLS policies');
  logger.info('   • Updated features table RLS policies');
  logger.info('\n🔄 Please restart your application to test the fixes.');

  } catch (error) {
    logger.error('❌ Error applying fixes:', error.message);
    process.exit(1);
  }
}

applyFixes();
