# Tasks route & workflow — review and explanation

Date: 2025-10-03

This document summarizes the tasks feature (UI + server routes) found in the codebase, explains what was implemented, how the workflow works end-to-end, the authorization model, and includes testing / verification steps and recommended follow-ups.

Files reviewed
- Client pages / UI
  - `src/app/tasks/page.tsx` — Tasks entry page; renders `TasksLanding` and optionally `ListSelection` when `location` query param is present.
  - `src/app/tasks/create/page.tsx` — Task creation page with recurrence fields; posts to `/api/tasks`.
  - `src/app/tasks/locations/[id]/lists/[listId]/page.tsx` — Task list view: shows tasks, instances, checkout/checkin, optimistic completion and an "Update Completions" flow.
  - `src/screens/tasks/TasksLanding.tsx` and `src/screens/tasks/ListSelection.tsx` — supporting components used by the pages (landing, list selection, navigation).

- Server API routes
  - `src/app/api/tasks/route.ts` — POST to create tasks (called by `/tasks/create`).
  - `src/app/api/task-lists/route.ts` — POST to create task lists.
  - `src/app/api/task-lists/[id]/route.ts` — GET a task list (includes checkout state attach).
  - `src/app/api/task-lists/[id]/instances/route.ts` — GET tasks + their instances (used by the list view).
  - `src/app/api/task-lists/[id]/checkout/route.ts` — POST to checkout a list (locks it to a user).
  - `src/app/api/task-lists/[id]/checkin/route.ts` — POST to check the list back in (removes lock).
  - `src/app/api/task-lists/[id]/apply-completions/route.ts` — POST to apply a batch of completion/uncompletion changes and optionally check in.

High-level workflow (client → server)

1. Navigation and selection
   - The user navigates to `/tasks`. `src/app/tasks/page.tsx` shows the landing and, if a `location` query param is present, loads `ListSelection` to pick a task list.
   - From a list view the user opens `/tasks/locations/{locationId}/lists/{listId}` which loads tasks and instances via `/api/task-lists/{listId}/instances`.

2. Viewing tasks and instances
   - The list view fetches tasks (rows in `tasks`) and related `task_instances` with `task_completions` (attached on the server as `instances`).
   - The UI computes completion state per task by examining instances and their `status` or `task_completions`.

3. Check out / Check in (locking)
   - A user may "Check Out" a list via POST `/api/task-lists/{listId}/checkout` with their `user_id`. This upserts into `task_list_checkouts` table (task_list_id -> user_id). If another user has it checked out, the endpoint returns a 409 with `locked_by`.
   - When finished, the user calls POST `/api/task-lists/{listId}/checkin` with `user_id` to remove the checkout row.
   - The list route GET `/api/task-lists/{listId}` also attaches `checked_out_by` so the UI can show state.

4. Local edits and optimistic UI
   - The UI allows toggling checkboxes to mark tasks complete. These toggles update `localCompletionMap` only and do not immediately persist to the server.
   - The user presses "Update Completions", which triggers a dialog and then a POST to `/api/task-lists/{listId}/apply-completions` with the array of changes ({ task_id, completed }).
   - The client performs optimistic UI updates when marking a single instance complete (e.g., `handleCompleteInstance`) then calls the `useTaskCompletion` hook which performs a server call to complete a single instance; on failure the client reverts.

5. Creating tasks
   - The create task page collects title, description, due date and recurrence options and sends a POST to `/api/tasks` (server route) with a payload that includes `task_list_id` and recurrence fields.
   - The server validates the token (admin client) and the user's permission with the task list, inserts a row into `tasks`, and — if `due_date` present — inserts an initial `task_instances` row.

Server-side behavior and contracts

- Auth & admin client
  - Server routes typically use `createAdminSupabase()` (admin/service-role client) to perform DB writes that regular client RLS would block.
  - Most server endpoints require authorization via a Bearer token in the `Authorization` header. The token is validated with `supabaseAdmin.auth.getUser(token)` or via `serverAuth.resolveUserFromToken`.
  - `serverAuth` helper resolves role names and location membership. Many checks short-circuit for `superadmin` role.

- Role resolution & permission rules
  - Role name is resolved by looking up the user's `profiles` record and then the `user_roles` table to get `name` (fallbacks exist: numeric `1` or string `'superadmin'` map to superadmin).
  - Permissions to create task lists or tasks require membership to the `location_id` (via `user_locations`) unless the user is `superadmin`.
  - Creating a task list sets `role_id` to the resolved roleName of the creator (so lists can be scoped to roles).

- Key API contracts
  - POST /api/tasks (server): expects JSON with required fields like `title`, `task_list_id`; validates user via token -> inserts into `tasks` with `created_by` = user.id; if `due_date` provided, creates initial `task_instances`.
  - POST /api/task-lists: expects `name` and `location_id` and resolves roleName for the creator; inserts into `task_lists`.
  - GET /api/task-lists/{id}: returns list record plus `checked_out_by` if a checkout exists; enforces membership using `serverAuth`.
  - GET /api/task-lists/{id}/instances: returns tasks for list and attaches `instances` array (task_instances + nested task_completions) — uses admin client and membership checks.
  - POST /api/task-lists/{id}/checkout: upserts the checkout record; returns 409 if locked by another user.
  - POST /api/task-lists/{id}/checkin: removes the checkout record (only owner or superadmin can check in).
  - POST /api/task-lists/{id}/apply-completions: main batch endpoint — accepts array `changes` (task_id, completed), `user_id`, and `checkin` flag. It:
    - Verifies the acting token matches the `user_id` (unless superadmin).
    - Ensures the list is checked out by the acting user or not checked out.
    - For each change:
      - If `completed` true: find or create a `task_instances` row and insert a `task_completions` row, then mark instance status `completed`.
      - If `completed` false: delete the most recent `task_completions` for that task and mark the instance `pending`.
    - Optionally deletes the checkout row if `checkin` is true.
    - Writes an audit entry to `task_list_checkout_audit` with details of the changes.

Data shapes (table fields used)
- task_lists: id, name, description, location_id, role_id
- tasks: id, name/title, description, task_list_id, is_recurring, recurrence fields, due_date, created_by
- task_instances: id, task_id, due_date, status
- task_completions: id, task_id, task_instance_id, completed_by, completed_at (timestamp)
- task_list_checkouts: task_list_id, user_id

Client-side patterns & UX notes
- The list view uses `localCompletionMap` to keep local toggles. This prevents immediate writes and allows batching.
- Checkboxes are disabled unless the list is checked out by the current user (UI enforces this). The `Check Out` endpoint enforces the lock server-side as well.
- Optimistic completion (`handleCompleteInstance`) updates the single instance locally, then calls `useTaskCompletion()` which calls server API to complete a single instance; on error it reverts and shows a snackbar.
- The `Update Completions` dialog calculates the number of changed items and posts an aggregated `changes` array to the server.
- The client fetches fresh instances after apply-completions so local state will re-sync with server results.

Edge cases and failure modes
- Race conditions on checkout: the checkout endpoint uses upsert; concurrent checkouts can return 409 if a different user currently holds the lock.
- apply-completions is conservative: it checks for checkout ownership and blocks if the list is checked out by another user.
- apply-completions attempts to create instances if none exist, so creating completions when no instance exists is allowed (the server inserts a new instance).
- Uncomplete flow relies on removing the latest completion. If business rules need to target a specific completion, the API would need to accept a completion id.

Testing & verification

- Manual flow to test locally (developer):
  1. Run the app locally with a developer account that has locations assigned. Ensure the backend envs are set (or use local Supabase test DB). 
  2. Open `/tasks`, select a `location`, pick a `task list` and load the list view.
  3. If not checked out, press `Check Out`. Observe the checked out state and that other users cannot check out.
  4. Toggle a few items (observe `localCompletionMap` changes). Press `Update Completions` and confirm the server response and that instances/completions are created.
  5. Try `Check In` and verify the checkout row is removed.
  6. Create a task via `/tasks/create` and confirm a task row and initial instance (if due_date) appear.

- Automated tests: the repository contains tests under `__tests__` but there are not (yet) dedicated integration tests for the full apply-completions flow. Consider adding tests that:
  - Create a test user and task_list, then create tasks, and exercise `/api/task-lists/{id}/apply-completions` asserting DB changes.
  - Simulate overlapping checkouts to assert 409 is returned.

Recommendations & next steps
- Keep the server-side permission checks: they are explicit and conservative — this is good for safety around data modification.
- Consider making `apply-completions` idempotent or accept request-level ids to avoid duplicate completion inserts if the client retries.
- Add more unit/integration tests for the checkout/apply-completions flow (happy path + conflict cases). The `migrate-locations.js` and existing test harness can be used for setup.
- If the team needs audit/history beyond the inserted `task_list_checkout_audit`, consider writing richer events for individual completion changes.
- Consider exposing a small admin-only endpoint to surface pending changes (diff) for large lists so users can review before applying.

Where the code lives (quick references)
- Client pages: `src/app/tasks/*` and `src/screens/tasks/*`
- Server APIs: `src/app/api/tasks` and `src/app/api/task-lists/*`
- Server helpers: `src/lib/serverAuth.ts`, `src/lib/createAdminSupabase.ts`, `src/lib/logger.ts` (useful for understanding auth and admin client creation).

If you'd like, I can:
- Generate a sequence diagram (text) showing the client → checkout → local edits → apply-completions flow.
- Add example cURL requests for each API route for developer testing.
- Draft a small integration test harness for the apply-completions flow that can run with a local/test Supabase instance.

---

## Recommended future development work

These are low-to-medium risk improvements that would harden the tasks workflow and make it easier to operate and test:

- Make apply-completions idempotent and add an optional client-supplied request-id to deduplicate retries. This prevents duplicate completions on network retries.
- Add transactional guarantees to apply-completions where possible (or clear compensating actions) so partial failures don't leave inconsistent state.
- Improve audit granularity: write per-change audit events (who changed which task, previous and new states) and surface these in an admin UI.
- Add checkout lease/timeout support: automatically expire stale checkouts after a configurable TTL to reduce locked lists due to abandoned sessions.
- Support targeting a specific completion for un-complete operations (accept completion id) to avoid ambiguity when multiple completions exist.
- Performance tuning for large lists: paginate tasks and instances, or provide a lightweight endpoint that returns only aggregation (counts / pending flags) for large lists.
- UI: provide a "preview changes" step before applying completions to show server-expected effects; add bulk actions (select-all, invert selection).
- Offline / resilience: consider queuing changes locally and retrying with conflict resolution logic when connectivity returns.
- Tests: add integration tests for the full flow (checkout, modify, apply-completions), and unit tests for serverAuth helpers and edge cases.

## QA checklist

Use this checklist when validating the tasks feature during manual QA or after deployments:

1. Environment setup
  - Run the app locally against a test Supabase instance with seeded `profiles`, `user_locations`, `user_roles`, `task_lists`, `tasks`, and `task_instances`.
  - Ensure a test user exists with location membership and a non-admin role, plus a `superadmin` test user.

2. Navigation and selection
  - Open `/tasks`, select a location, and confirm task lists load.
  - Verify the `Create Task` flow navigates to `/tasks/create` and pre-fills `location` and `taskList` when provided.

3. Checkout / Checkin
  - Ensure a user can check out a list. Verify the UI shows `Checked out` and the server `task_list_checkouts` row exists.
  - Verify another user cannot check out the same list (API returns 409 and UI shows locked state).
  - Check in the list and confirm the checkout row is removed.

4. Apply completions (happy path)
  - While checked out, toggle several items and press `Update Completions`. Verify the server returns success and `task_completions` / `task_instances` are created or updated accordingly.
  - Confirm snackbar messages and that the UI refreshes to server state.

5. Uncomplete flow
  - Mark a completed item as uncompleted (via update flow) and confirm the most recent completion record is removed and instance status is `pending`.

6. Permissions
  - Attempt to create a task or apply completions as a user without the required location membership — expect 403.
  - As `superadmin`, perform actions that other users cannot and confirm success.

7. Concurrency / race conditions
  - Simulate two users attempting to check out the same list: ensure only one succeeds and the other receives locked response.
  - While one user has a list checked out, another attempts apply-completions — ensure server enforces ownership and blocks if not owner.

8. Error handling
  - Cause a server error (e.g., temporarily drop DB connection) and ensure the client surfaces errors, reverts optimistic changes where appropriate, and doesn't leave UI in an inconsistent state.

9. Audit & logs
  - Verify `task_list_checkout_audit` entries are written when apply-completions is used; check details include the changes and actor id.

10. Performance / large lists
  - Test lists with large numbers of tasks (hundreds) to ensure the instances endpoint and UI remain responsive.

11. Accessibility & cross-browser
  - Verify keyboard navigation and screen reader labels for checkboxes and dialog controls.
  - Smoke test in supported browsers and mobile/responsive views.

12. Regression checks
  - Run existing unit tests and any E2E tests after changes. Add tests that cover apply-completions, checkout edge cases, and permission failures.

If you want, I can also convert this checklist into a runnable test plan (e.g., Playwright scripts) and add example cURL commands for each API endpoint to make QA easier.
