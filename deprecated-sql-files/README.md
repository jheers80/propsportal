# Deprecated SQL Files

This folder contains SQL files that are no longer needed for the current version of the PR Ops Portal project. These files have been moved here for reference purposes but are not required for database setup or operation.

## File Categories

### Database Setup Files (Superseded)
- `database_setup.sql` - Original database setup (superseded by complete_database_setup.sql)
- `complete_rls_setup.sql` - Row Level Security setup (now included in main setup)
- `database_verification.sql` - Database verification script

### RLS Management Files
- `enable_rls_user_roles.sql` - Enable RLS on user roles
- `disable_rls_user_roles.sql` - Disable RLS on user roles

### Migration Files
- `location_migration.sql` - Location data migration
- `quick_migration.sql` - Quick migration script
- `supabase_location_migration.sql` - Supabase location migration
- `manual_database_updates_with_ids_safe.sql` - Manual database updates

### Bug Fix Files
- `fix_link_location_function.sql` - Fix location linking function
- `fix_passphrases_constraint.sql` - Fix passphrase constraints
- `fix_roles_permissions.sql` - Fix role permissions
- `fix_superadmin_role.sql` - Fix superadmin role
- `fix_unlink_location_policy.sql` - Fix location unlinking policy

### Prep-Planner Cleanup Files (System Removed)
- `cleanup_prep_planner_database.sql` - Standard prep-planner cleanup
- `comprehensive_prep_cleanup.sql` - Dynamic prep-planner cleanup
- `verify_prep_cleanup.sql` - Prep-planner cleanup verification

## Important Note

**DO NOT** run these files against a production database unless you specifically need to restore or reference old functionality. The main database setup is now handled entirely by `complete_database_setup.sql` in the root directory.

## Current Active SQL Files

The following files remain active in the root directory:
- `complete_database_setup.sql` - **Primary database setup file** (contains everything needed)

## Archive Date
These files were moved to deprecated status on: September 29, 2025