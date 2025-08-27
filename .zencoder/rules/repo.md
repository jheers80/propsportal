# PR Ops Portal — Repo Context

## Overview
A Next.js (App Router) app for managing users, locations, permissions, and quick access sessions. Uses Supabase for authentication, database, and RLS.

## Tech Stack
- Next.js 15 (App Router)
- React 19
- TypeScript 5
- MUI 7 (primary UI)
- Emotion (styling engine for MUI)
- Tailwind CSS 4 (available; minimal usage observed)
- Supabase JS SDK 2 + SSR helpers

## Scripts
- dev: `next dev --turbopack`
- build: `next build --turbopack`
- start: `next start`
- lint: `eslint`

## Key Paths
- src/app: App Router pages (root `layout.tsx`, `page.tsx`, feature routes)
- src/components: Reusable UI (Navbar, Admin components, forms, tables)
- src/hooks: App hooks (`useUser`, `usePermissions`)
- src/lib: Client libs (`supabaseClient.ts`, `AdminRoutes.tsx`)
- src/theme: MUI theme and registry (`theme.ts`, `ThemeRegistry.tsx`)
- src/middleware.ts: Middleware configuration
- supabase: Migrations and config

## Routes (App Router)
- `/` → `src/app/page.tsx`
- `/login` → `src/app/login`
- `/profile` → `src/app/profile`
- `/quick-login` → `src/app/quick-login`
- `/admin` → `src/app/admin` (cards list via `AdminRoutes`)
- Admin subpages referenced via `src/lib/AdminRoutes.tsx`

## Auth & Permissions
- Supabase Auth creates user; profiles stored in `profiles` table
- RBAC via `permissions` and `role_permissions` (see migrations)
- Hooks:
  - `useUser` → returns `{ user, profile }`
  - `usePermissions` → returns `{ permissions }` string array

## Database (Supabase)
- Migrations in `supabase/migrations` (profiles, locations, user_locations, permissions, role_permissions, quick_access_sessions, passphrases, RLS)
- Combined SQL at `supabase/combined_migrations.sql`

## Environment
Create `.env.local` with:
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## UI/Theme
- Central theme: `src/theme/theme.ts` and `ThemeRegistry.tsx`
- Primary UI library: MUI
- Branding: follow Pizza Ranch font and color scheme; implement/adjust in `theme.ts` for global consistency
- Main app bar: `src/components/Navbar.tsx`

## Notable Components
- `Navbar.tsx` (main navigation; profile menu)
- `AdminNavbar.tsx` (admin section navbar)
- `UsersList.tsx`, `AddUserForm.tsx`
- `LocationsTable.tsx`, `AddLocationForm.tsx`
- `UserLocationsManager.tsx`
- `PassphraseManager.tsx`

## Notes
- Next config minimal (`next.config.ts`)
- Uses Emotion for SSR with MUI via ThemeRegistry
- Tailwind present but not required for most components