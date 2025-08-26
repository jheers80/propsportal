CREATE TABLE user_locations (
  user_id uuid NOT NULL REFERENCES auth.users(id),
  location_id bigint NOT NULL REFERENCES locations(id),
  PRIMARY KEY (user_id, location_id)
);
