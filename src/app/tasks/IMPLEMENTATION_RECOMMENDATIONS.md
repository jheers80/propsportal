# Tasks Feature — Recommendations & Next Steps

Last updated: 2025-09-29

This document captures recommended follow-ups, implementation details, migrations, tests, monitoring, and rollout steps needed to finish and harden the Tasks feature (location selection, task lists, task creation, recurrence, completion/uncompletion, and UI filters).

If you plan to continue later, use this as the single source of truth describing where the code currently stands, what remains, and how to verify changes safely.

## Summary of current state

- Client changes:
  - `src/app/tasks/page.tsx` — multi-step landing → select location → manage lists → view tasks. Shows task lists, upcoming tasks, create-list dialog, complete/uncomplete actions, filters, snackbars.
  - `src/app/tasks/create/page.tsx` — create task page with recurrence inputs and server POST to `/api/tasks`.
- Services:
  - `src/services/taskListService.js` — create/fetch task lists; defensive retry if DB lacks optional columns.
  - `src/services/taskService.js` — fetch and create tasks; new `fetchAllTasksInList` returns tasks with instances and completions; ordering fixed to avoid PostgREST parse errors.
  - `src/services/recurrenceEngine.js` — recurrence calculations and `generateNextInstance` helper.
- Server/API:
  - `src/app/api/task-lists/route.ts` — POST to create task lists server-side and resolve role_id.
  - `src/app/api/tasks/route.ts` — POST to create tasks server-side with validation.
  - `src/app/api/task-instances/complete/route.ts` — POST to complete an instance (service-role checks).
  - `src/app/api/task-instances/uncomplete/route.ts` — POST to remove a completion and mark instance pending.
- DB changes:
  - `supabase/migrations/20250929_ensure_task_lists_schema.sql` — migration to ensure `task_lists` schema contains `description`, `location_id`, indexes, triggers, and RLS policy scaffolding.

## Goals / Acceptance criteria

1. When visiting `/tasks` the user must select a location (auto-selected if only one). If multiple, user must explicitly choose one.
2. Users must create or pick a Task List before creating tasks. Task Lists are tied to locations and roles.
3. Tasks must always be attached to a `task_list` and cannot be orphaned.
4. The task view must let users:
   - See all tasks for a selected Task List, including all instances and completion history.
   - Complete pending instances (server-side authoritative).
   - Remove (undo) completion records (server-side; subject to permissions).
   - See recurrence metadata (is_recurring, recurrence_type, repeat_from_completion).
   - Filter (hide completed tasks / show only upcoming tasks).
5. Server APIs must enforce role/location permissions and fill required columns such as `role_id`.
6. The system must be resilient to schema drift (optional columns), and DB migrations must be idempotent.

## Immediate recommended steps (high priority)

1. Verify and run DB migration(s):
   - Run `supabase/migrations/20250929_ensure_task_lists_schema.sql` in your database (or paste into Supabase SQL editor). This ensures `task_lists` has `description`, `location_id`, indexes, and trigger functions used by server-side code.
   - Backup the DB before applying in production/staging.

2. End-to-end flow validation (developer / staging):
   - Sign in as a user with a location and role.
  - Go to `/tasks` and verify location selection auto-selects single-location users, otherwise requires manual selection.
  - Create a Task List for the selected location using the 'New Task List' flow. Verify it appears in the dropdown and is selectable.
  - Create tasks with and without recurrence on the `/tasks/create` page and verify:
    - Tasks are created and returned by the server endpoint with expected recurrence fields.
    - If a `due_date` was provided, an initial `task_instances` row is created.

3. Validate complete/uncomplete flows:
  - Complete a pending instance from the Tasks page. Confirm:
    - `/api/task-instances/complete` returns success.
    - `task_completions` contains the new record and `task_instances.status` is 'completed'.
    - If `is_recurring` && `repeat_from_completion`, confirm next instance generation either via the completion endpoint (if implemented) or via the scheduled job.
  - Remove a completion via the Tasks page. Confirm:
    - `/api/task-instances/uncomplete` returns success.
    - The `task_completions` record is removed and `task_instances.status` reverted to 'pending'.

4. Permissions smoke tests:
  - Test as a superadmin user — ensure you can create lists and complete/uncomplete any instance.
  - Test as a regular role-bound user — ensure you can only create lists for roles/locations you belong to and only complete/uncomplete instances within your scope.

## Medium priority (improvements that should be done before production)

1. Server-side recurrence generation on completion
  - Current server code inserts completion and updates instance status. To ensure immediate continuity for repeat-from-completion tasks, implement server-side call to the recurrence engine (the server has access to the recurrence rules) to synchronously generate and insert the next `task_instances` row during `/api/task-instances/complete`.
  - If synchronous generation proves slow or heavy, consider queueing a background job (e.g., Supabase Functions, Cloud Tasks) and mark the instance as completed immediately while the job creates the next instance.

2. RLS / Policies audit
  - Ensure RLS policies exist and were tested for all relevant operations (SELECT/INSERT/UPDATE/DELETE) on `task_lists`, `tasks`, `task_instances`, and `task_completions`.
  - Pay attention to insert paths that use the service role — when using service-role keys from server endpoints, ensure functions are carefully validating permissions so RLS bypass doesn't create security holes.

3. Improve the UI
  - Move filter controls (Hide completed / Upcoming) into a visible toolbar above the task list with clear labels and tooltips.
  - Add per-instance history toggles to show full completion history (not just the first completion).
  - Provide optimistic UI updates on complete/uncomplete for snappy UX, with rollback on failure.
  - Add loading/disabled state to action buttons individually (so completing one instance doesn't disable the whole page loading spinner).

4. Extract token/session helper
  - Several places fetch session tokens from `supabase.auth.getSession()` inline. Create a small helper in `src/lib/supabaseClient` (e.g., `getSessionToken()`) to centralize error handling and reduce duplication.

5. Schema hardening and migrations
  - Make sure `task_lists.role_id` is present and not-null; server endpoints rely on resolving role ids/names. If you want role_id to reference `user_roles.id`, consider using a foreign key and update migrations accordingly.
  - Add `updated_at` triggers and `ON UPDATE` behavior for tasks/task_lists.
  - Add a uniqueness constraint if desired (e.g., `(name, location_id)` unique per location for task lists).

## Low priority / Nice-to-have

1. Global Toast / Notification context
  - Extract the snackbar into a global `ToastContext` to allow uniform notifications across the app.

2. Task List & Task import/export
  - Provide CSV import/export for bulk task list creation or migrating from other systems.

3. Advanced recurrence UI
  - Provide visual recurrence presets (e.g., 'Every weekday', 'First day of month') and validation.

4. Admin dashboards and metrics
  - Build a small admin dashboard to visualize tasks created/completed by role/location per period.

## Tests to add (recommended)

1. Unit tests
  - `recurrenceEngine` — compute next dates for a variety of complex rules (month-end, DST boundary, specific weekdays/month days, intervals).
  - `taskService` — ensure `createTask` and `fetchAllTasksInList` return expected shapes; test error paths.

2. Integration tests (API)
  - `/api/task-lists` — create list as different users / roles.
  - `/api/tasks` — create tasks. Verify instance generation.
  - `/api/task-instances/complete` and `/api/task-instances/uncomplete` — test auth and permission enforcement and DB changes.

3. E2E tests (recommended staging)
  - Use Playwright or Cypress to simulate: location selection → create list → create task → complete instance → uncomplete → filters.

## Monitoring & Alerts

1. Error reporting
  - Add Sentry (or similar) server and client SDK to capture runtime errors in server endpoints and client interactions.

2. DB metrics
  - Monitor `task_instances` growth and retention. Schedule cleanup of old `task_completions` (the SQL function in the architecture guide) or use a retention policy.

3. Audit logs
  - Optionally add an audit table or use Supabase Audit extension to record create/complete/uncomplete events for compliance.

## Rollout checklist

1. Staging deploy
  - Deploy to staging, run the migration, and perform the full E2E checklist.

2. Beta test
  - Release to a small set of users to test real-world flows and permissions edge-cases.

3. Production deploy
  - Backup production DB, run migrations, monitor logs and metrics closely for 24–72 hours.

## Troubleshooting common errors

- PGRST100 order parse error:
  - Use Supabase client `.order()` with `foreignTable` when ordering by joined table columns (example used in `taskService.js`).

- NOT NULL / role_id errors on insert:
  - Ensure server resolves `role_id` before inserting or modify DB default/constraint if your environment expects a different shape.

- Missing column errors across environments:
  - Add defensive retry logic (already present in `taskListService`) and prefer writing idempotent, additive migrations.

## File map (current key files)

- `src/app/tasks/page.tsx` — Tasks landing, selection, list view, filters, create task list dialog (main UI).
- `src/app/tasks/create/page.tsx` — Task create form with recurrence fields.
- `src/services/taskListService.js` — Task list CRUD client helper.
- `src/services/taskService.js` — Task CRUD, instance handling and fetch helpers.
- `src/services/recurrenceEngine.js` — Recurrence logic.
- `src/app/api/task-lists/route.ts` — Server create task list.
- `src/app/api/tasks/route.ts` — Server create task.
- `src/app/api/task-instances/complete/route.ts` — Server complete instance.
- `src/app/api/task-instances/uncomplete/route.ts` — Server uncomplete instance.

## Owner & Contacts

If you continue the work later, reach out to:
- Primary: repo owner / project maintainer

## Final notes

This PR/changeset implements a functioning Tasks UI and server-side APIs, but there are several medium-priority items (server-side recurrence generation, RLS audit, better UX states) that should be addressed before production use. The document above lays out a concrete path to complete and harden the feature.

If you want, I can:
- Add Playwright tests for the flow.
- Implement server-side next-instance generation synchronously in `/api/task-instances/complete`.
- Extract a `getSessionToken()` helper and refactor client flows to use it.

Tell me which follow-up you'd like next and I'll implement it.
