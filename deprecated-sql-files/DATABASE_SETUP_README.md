# PR Ops Portal - Database Setup

## Overview
This document describes the database setup for the PR Ops Portal application.

## Production Setup

### Single File Setup
Use `database_setup.sql` for complete production deployment. This file contains:

- **Tables**: All required database tables with proper relationships
- **Functions**: Essential database functions (get_my_role, handle_new_user, quick_login_start_session)
- **RLS Policies**: Complete Row Level Security setup for data protection
- **Indexes**: Optimized database indexes for performance
- **Initial Data**: Default roles, permissions, and features
- **Triggers**: Automated user profile creation

### How to Use

1. **Copy the SQL**: Copy the contents of `database_setup.sql`
2. **Run in Supabase**: Paste into your Supabase SQL Editor
3. **Execute**: Run the entire script to set up your database
4. **Verify**: Check that all tables and policies are created correctly

## Database Schema

### Core Tables
- `user_roles` - Role definitions
- `permissions` - System permissions
- `role_permissions` - Role-permission relationships
- `profiles` - User profiles with role assignments
- `locations` - Business locations
- `user_locations` - User-location assignments
- `passphrases` - Quick access passphrases
- `features` - System features with role-based access
- `audit_trails` - System activity logging
- `quick_access_sessions` - Temporary access sessions

### Key Features
- **Integer-based roles** for flexibility and scalability
- **Complete RLS** (Row Level Security) for data protection
- **Audit logging** for all administrative actions
- **Role-based permissions** system
- **Quick access** functionality for temporary logins

## Security

### Row Level Security (RLS)
All tables have RLS enabled with policies that:
- Allow users to access their own data
- Grant admins appropriate access levels
- Protect sensitive information
- Prevent unauthorized data access

### Functions
- `get_my_role()` - Safely retrieves current user's role
- `handle_new_user()` - Automatically creates profiles for new users
- `quick_login_start_session()` - Manages temporary access sessions

## Deployment Checklist

- [ ] Run `database_setup.sql` in Supabase SQL Editor
- [ ] Verify all tables are created
- [ ] Check RLS policies are applied
- [ ] Test user registration creates profiles
- [ ] Confirm role-based access works
- [ ] Validate audit logging functions

## Troubleshooting

If you encounter issues:
1. Check Supabase logs for error details
2. Verify all tables exist with correct structure
3. Ensure RLS policies are properly applied
4. Test with a superadmin user first

## Maintenance

- Regular backups of audit_trails table
- Monitor role_permissions for access control
- Clean up expired quick_access_sessions
- Review and update features table as needed
Automated scripts to run the database updates using Supabase CLI.

## How to Run

### Option 1: Automated Setup (Recommended)

#### Linux/Mac:
```bash
chmod +x setup_database.sh
./setup_database.sh
```

#### Windows:
```cmd
setup_database.bat
```

### Option 2: Manual Setup via Supabase Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **SQL Editor**
4. **Choose one of the following files:**
   - `manual_database_updates_with_ids.sql` (recommended - uses user_roles table)
   - `manual_database_updates.sql` (uses enum types)
   - `manual_database_updates_simple.sql` (uses text types)
5. Copy and paste the chosen file's content
6. Run the query
7. Copy the entire contents of `verify_database_setup.sql`
8. Paste and run to verify the setup

### Option 3: Manual Setup via Supabase CLI

```bash
# Login to Supabase (if not already logged in)
supabase login

# List your projects
supabase projects list

# Run the updates (replace PROJECT_REF with your project reference)
supabase db push --project-ref YOUR_PROJECT_REF --file manual_database_updates.sql
```

## What Gets Set Up

### ✅ Audit Trails System
- `audit_trails` table for logging all admin actions
- Automatic logging of user creation, passphrase generation, login attempts
- IP address and user agent tracking
- Only superadmins can view audit trails

### ✅ Enhanced Quick Access Sessions
- Updated `quick_login_start_session` function returns JSON with session details
- Database validation for session validity
- Proper session ID tracking in cookies

### ✅ Permission System
- Comprehensive permissions table
- Role-based permissions (superadmin, manager, multiunit, etc.)
- Permission checking in admin pages

### ✅ Security Improvements
- Row Level Security policies on all tables
- Proper authentication and authorization checks
- Secure session management

## Verification

After running the setup, you can verify everything is working by:

1. Running the verification queries in `verify_database_setup.sql`
2. Checking that the audit trails page loads in the admin section
3. Testing quick login functionality
4. Verifying that permission checks work on admin pages

## Troubleshooting

### Common Issues:

1. **"invalid input syntax for type integer" errors**: 
   - This happens when trying to insert string values into integer columns
   - The script now properly casts enum values using `::user_role` syntax
   - If you still get this error, the `user_role` enum may not exist

2. **"type user_role does not exist" errors**:
   - The user_role enum wasn't created in your database
   - The script now includes code to create the enum if it doesn't exist

3. **Permission denied errors**:
   - Make sure you're running as a database owner or superadmin
   - Check your Supabase project permissions

4. **Table already exists errors**:
   - The script uses `IF NOT EXISTS` clauses, so it's safe to run multiple times
   - You can ignore these errors

### If Something Goes Wrong:

1. **Check the user_role enum**:
   ```sql
   SELECT enum_range(NULL::user_role);
   ```

2. **Verify table creation**:
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public';
   ```

3. **Check permissions setup**:
   ```sql
   SELECT name FROM permissions;
   SELECT role, COUNT(*) FROM role_permissions GROUP BY role;
   ```

4. **Test the quick login function**:
   ```sql
   SELECT quick_login_start_session('test-passphrase', 'quickaccess');
   ```

### Alternative: Table-Based Roles (Recommended)

If you want to use the `user_roles` table for role management (more flexible):

Use `manual_database_updates_with_ids.sql` which:
- Converts role columns to use `user_roles.id` foreign keys
- Allows dynamic role management through the database
- Provides better referential integrity
- Makes it easier to add new roles without code changes

## Next Steps

After successful setup:

1. Test all admin functionality
2. Verify audit logging is working
3. Check that quick access sessions are properly validated
4. Ensure permission checks are working correctly

## Security Notes

- All sensitive operations are logged in audit trails
- Row Level Security ensures users can only see appropriate data
- Session validation prevents unauthorized access
- IP addresses and user agents are logged for security monitoring
