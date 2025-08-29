-- Features table for portal
CREATE TABLE features (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    link text NOT NULL,
    icon text NOT NULL, -- Material icon name
    description text,
    roles text[] NOT NULL, -- Array of allowed roles
    created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE features ENABLE ROW LEVEL SECURITY;

-- Policy: Only superadmins can insert, update, delete
CREATE POLICY superadmin_write ON features
    FOR ALL
    USING (EXISTS (
        SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'superadmin'
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'superadmin'
    ));

-- Policy: Portal users can select features if their role is in the feature's roles array
CREATE POLICY portal_user_read ON features
    FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND features.roles @> ARRAY[profiles.role::text]
    ));
