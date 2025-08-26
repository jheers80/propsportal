CREATE TABLE quick_access_sessions (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  location_id BIGINT NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  passphrase_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE quick_access_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow admins to manage quick access sessions"
ON quick_access_sessions
FOR ALL
TO authenticated
USING (
  (get_my_claim('role'::text)) = '"superadmin"'::jsonb
);
