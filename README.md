# PR-Ops Portal

This is a Next.js application designed to manage users, locations, and permissions for an operational environment. It uses Supabase for the database and authentication.

## Tech Stack

- [Next.js](https://nextjs.org/) - React framework for production
- [Supabase](https://supabase.io/) - Open source Firebase alternative for database and authentication
- [Tailwind CSS](https://tailwindcss.com/) - A utility-first CSS framework
- [TypeScript](https://www.typescriptlang.org/) - Typed superset of JavaScript

## Database Schema

The database is managed with Supabase and the schema is defined through a series of migration files located in the `supabase/migrations` directory.

### Tables

- **`profiles`**: Stores user-specific information, including their role. It has a one-to-one relationship with the `auth.users` table from Supabase.
  - `id` (UUID, PK, FK to `auth.users.id`)
  - `role` (user_role enum)
  - `created_at` (TIMESTAMPTZ)

- **`locations`**: Stores information about physical locations.
  - `id` (BIGINT, PK)
  - `store_id` (VARCHAR(4))
  - `store_name` (TEXT)
  - `city` (TEXT)
  - `state` (TEXT)
  - `zip` (TEXT)
  - `created_at` (TIMESTAMPTZ)

- **`user_locations`**: A join table that links users to locations, representing which locations a user has access to.
  - `user_id` (UUID, PK, FK to `auth.users.id`)
  - `location_id` (BIGINT, PK, FK to `locations.id`)

- **`permissions`**: Defines the possible permissions that can be assigned to roles.
  - `id` (BIGINT, PK)
  - `name` (TEXT, UNIQUE)
  - `description` (TEXT)
  - `created_at` (TIMESTAMPTZ)

- **`role_permissions`**: A join table that links roles to permissions.
  - `id` (BIGINT, PK)
  - `role` (user_role enum)
  - `permission_id` (BIGINT, FK to `permissions.id`)

- **`quick_access_sessions`**: Stores information about temporary access sessions for specific locations.
  - `id` (BIGINT, PK)
  - `location_id` (BIGINT, FK to `locations.id`)
  - `passphrase_hash` (TEXT)
  - `expires_at` (TIMESTAMPTZ)
  - `role` (TEXT)
  - `created_at` (TIMESTAMPTZ)

- **`passphrases`**: Stores passphrases for locations.
  - `id` (BIGINT, PK)
  - `location_id` (BIGINT, UNIQUE, FK to `locations.id`)
  - `passphrase` (TEXT)
  - `created_at` (TIMESTAMPTZ)

### Enums

- **`user_role`**: Defines the possible roles a user can have.
  - `user`
  - `staff`
  - `manager`
  - `multiunit`
  - `superadmin`

## Authentication and Authorization

Authentication is handled by Supabase Auth. When a new user signs up, a corresponding profile is created in the `profiles` table with a default role of `user`.

Authorization is managed through a role-based access control (RBAC) system. Roles are defined in the `user_role` enum, and permissions are defined in the `permissions` table. The `role_permissions` table links roles to their respective permissions.

## Getting Started

First, you need to have a Supabase project set up. You will need to add your Supabase project URL and anon key to your environment variables. Create a `.env.local` file in the root of the project and add the following:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Key Components

- **`AddLocationForm.tsx`**: A form for adding new locations.
- **`AddUserForm.tsx`**: A form for adding new users.
- **`AdminNavbar.tsx`**: The navigation bar for the admin section.
- **`LocationsTable.tsx`**: A table that displays all locations.
- **`Navbar.tsx`**: The main navigation bar for the application.
- **`PassphraseManager.tsx`**: A component for managing passphrases for locations.
- **`UserLocationsManager.tsx`**: A component for managing which locations a user has access to.
- **`UsersList.tsx`**: A component that displays a list of all users.

## Hooks

- **`usePermissions.ts`**: A hook for checking the current user's permissions.
- **`useUser.ts`**: A hook for getting the current user's data.
