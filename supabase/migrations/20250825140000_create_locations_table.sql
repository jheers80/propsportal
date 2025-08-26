CREATE TABLE locations (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  store_id varchar(4) NOT NULL,
  store_name text,
  city text,
  state text,
  zip text,
  created_at timestamptz DEFAULT now() NOT NULL
);
