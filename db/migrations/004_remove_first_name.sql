-- first_name belongs on a company-person relationship, not on the base user identity
ALTER TABLE users DROP COLUMN IF EXISTS first_name;
