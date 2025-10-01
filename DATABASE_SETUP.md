# Database Setup Guide

## Quick Start

To set up the PR Ops Portal database, you only need ONE file:

**`complete_database_setup.sql`**

## Setup Instructions

1. **Open Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to the SQL Editor

2. **Copy and Run the Setup Script**
   - Open `complete_database_setup.sql`
   - Copy the entire file contents
   - Paste into the Supabase SQL Editor
   - Click "Run" to execute

3. **Verify Setup**
   - Check that all tables were created
   - Verify that sample data was inserted
   - Test that RLS policies are active

## What Gets Created

The setup script creates:

### Core Tables
- `user_roles` - System roles (staff, manager, etc.)
- `permissions` - System permissions
- `role_permissions` - Role-permission relationships  
- `profiles` - User profiles linked to auth.users
- `locations` - Business locations
- `user_locations` - User-location assignments
- `passphrases` - Location-specific passphrases
- `features` - Portal features with role-based access
- `quick_access_sessions` - Temporary access sessions
- `audit_trails` - System activity logging

### Security & Functions
- **Row Level Security (RLS)** on all tables
- **Auto-profile creation** for new users
- **Permission checking** functions
- **Quick login** functionality
- **Audit logging** triggers

### Default Data
- Standard roles: staff, manager, multiunit, superadmin, quickaccess
- Core permissions for all system features
- Default features: dashboard, profile, admin, audit
- Role-permission mappings

## File Organization

```
/
├── complete_database_setup.sql          # 👈 MAIN SETUP FILE
└── deprecated-sql-files/                # 📁 Old/unused files
    ├── README.md
    ├── database_setup.sql               # (superseded)
    ├── fix_*.sql                        # (old bug fixes)
    ├── *_migration.sql                  # (old migrations) 
    └── *prep*.sql                       # (prep-planner cleanup)
```

## Important Notes

- ✅ **Only use `complete_database_setup.sql`** for new installations
- ❌ **Do not use** files in `deprecated-sql-files/` unless specifically needed
- ✅ The setup script is **idempotent** - safe to run multiple times
- ✅ All prep-planner tables have been **completely removed**
- ✅ The script includes **comprehensive error handling**

## Troubleshooting

If you encounter issues:

1. **Check Supabase logs** for detailed error messages
2. **Verify permissions** - ensure you have database admin access
3. **Check for conflicts** - if upgrading, some tables may already exist
4. **Run verification** - check that all expected tables exist after setup

## Support

For issues with database setup, check:
- The comments in `complete_database_setup.sql` for detailed explanations
- The `deprecated-sql-files/README.md` for historical context
- Supabase documentation for platform-specific guidance