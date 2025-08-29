-- User roles table
CREATE TABLE user_roles (
  id serial PRIMARY KEY,
  name text UNIQUE NOT NULL,
  display_name text NOT NULL,
  description text
);

-- Insert initial roles
INSERT INTO user_roles (name, display_name, description) VALUES
  ('superadmin', 'Super Admin', 'Full access to all admin features and settings'),
  ('multiunit', 'Multi-Unit Manager', 'Manages multiple business units or locations'),
  ('manager', 'Manager', 'Manages a single location or team'),
  ('staff', 'Staff', 'Standard staff member with limited access'),
  ('quickaccess', 'Quick Access', 'Temporary or quick access user for limited actions');

-- Add any other roles already programmed in your system below
-- INSERT INTO user_roles (name, description) VALUES ('otherrole', 'Description');
