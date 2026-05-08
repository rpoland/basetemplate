CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
  id          BIGSERIAL PRIMARY KEY,
  user_guid   UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  status      VARCHAR(20) NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'inactive', 'deleted')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_email_logins (
  id                           BIGSERIAL PRIMARY KEY,
  user_id                      BIGINT NOT NULL REFERENCES users(id),
  email                        VARCHAR(255) NOT NULL,
  email_validated_at           TIMESTAMPTZ,
  validation_token             VARCHAR(255),
  validation_token_expires_at  TIMESTAMPTZ,
  password_hash                VARCHAR(255) NOT NULL,
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only one validated entry per email address globally
CREATE UNIQUE INDEX user_email_logins_validated_email_idx
  ON user_email_logins(email)
  WHERE email_validated_at IS NOT NULL;
