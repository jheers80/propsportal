CREATE TABLE passphrases (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  location_id bigint NOT NULL UNIQUE,
  passphrase text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT fk_location
    FOREIGN KEY(location_id)
    REFERENCES locations(id)
    ON DELETE CASCADE
);
