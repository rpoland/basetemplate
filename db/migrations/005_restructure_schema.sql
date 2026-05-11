-- 005_restructure_schema.sql
-- Replaces users/user_email_logins/user_roles with the full scope-aware schema.
-- Run after 001-004. Safe to re-run (all DROPs use IF EXISTS).

-- ── Drop old tables ────────────────────────────────────────────────────────
-- Order matters: FK children before parents.
DROP TABLE IF EXISTS user_roles          CASCADE;
DROP TABLE IF EXISTS role_permissions    CASCADE;
DROP TABLE IF EXISTS user_email_logins   CASCADE;
DROP TABLE IF EXISTS users               CASCADE;

-- ── role_permissions: rebuilt with id PK and renamed FK columns ────────────
CREATE TABLE role_permissions (
  id               BIGSERIAL PRIMARY KEY,
  fk_role_id       BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  fk_permission_id BIGINT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  UNIQUE (fk_role_id, fk_permission_id)
);

-- Restore admin grants (dropped with CASCADE above)
INSERT INTO role_permissions (fk_role_id, fk_permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.name = 'admin';

-- ── unique_person ──────────────────────────────────────────────────────────
-- Identity bridge. Links user records that belong to the same human across
-- companies. Not in the JWT — exists only for cross-scope person lookups.
CREATE TABLE unique_person (
  id                    BIGSERIAL PRIMARY KEY,
  guid                  UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  created_datetime_utc  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── scope ──────────────────────────────────────────────────────────────────
-- Any organisational unit: company, location, team, department.
-- Top-level company scopes are referenced by user.fk_scope_id.
-- Sub-group scopes (locations, teams) are referenced by user_scopes.
CREATE TABLE scope (
  id                    BIGSERIAL PRIMARY KEY,
  guid                  UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  name                  VARCHAR(255) NOT NULL,
  created_datetime_utc  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── user ───────────────────────────────────────────────────────────────────
-- Scoped user identity. One record per person per company.
-- fk_scope_id is the company-level scope — this is what goes in the JWT (sid).
-- The same human in two companies = two rows linked via unique_person.
--
-- NOTE: "user" is a reserved word in PostgreSQL.
--       Always quote it in queries: SELECT * FROM "user"
CREATE TABLE "user" (
  id                    BIGSERIAL PRIMARY KEY,
  guid                  UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  fk_unique_person_id   BIGINT NOT NULL REFERENCES unique_person(id),
  fk_scope_id           BIGINT NOT NULL REFERENCES scope(id),
  status                VARCHAR(20) NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'inactive', 'deleted')),
  created_datetime_utc  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (fk_unique_person_id, fk_scope_id)
);

-- ── user_scopes ────────────────────────────────────────────────────────────
-- Sub-group memberships within a company: locations, teams, departments.
-- Not in the JWT. Used at query time to determine which records within the
-- company a user can interact with.
CREATE TABLE user_scopes (
  id                    BIGSERIAL PRIMARY KEY,
  guid                  UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  fk_user_id            BIGINT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  fk_scope_id           BIGINT NOT NULL REFERENCES scope(id)  ON DELETE CASCADE,
  created_datetime_utc  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (fk_user_id, fk_scope_id)
);

-- ── login_via_email ────────────────────────────────────────────────────────
-- Email credentials tied to a user record.
-- One login per user (UNIQUE fk_user_id).
-- Same email can exist across different companies for the same human.
CREATE TABLE login_via_email (
  id                                      BIGSERIAL PRIMARY KEY,
  fk_user_id                              BIGINT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  email                                   VARCHAR(255) NOT NULL,
  password_hash                           VARCHAR(255) NOT NULL,
  email_validated_datetime_utc            TIMESTAMPTZ,
  validation_token                        VARCHAR(255),
  validation_token_expires_datetime_utc   TIMESTAMPTZ,
  created_datetime_utc                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (fk_user_id)
);

-- ── user_roles ─────────────────────────────────────────────────────────────
-- Role assignments for a user. Scoped implicitly because the user record is
-- already tied to one company via fk_scope_id.
CREATE TABLE user_roles (
  id                    BIGSERIAL PRIMARY KEY,
  fk_user_id            BIGINT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  fk_role_id            BIGINT NOT NULL REFERENCES roles(id)  ON DELETE CASCADE,
  created_datetime_utc  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (fk_user_id, fk_role_id)
);

-- ── user_manage_scopes ─────────────────────────────────────────────────────
-- Scopes a user can manage without being a member.
-- If a user has user_manage_scopes for team5 and holds invoice:write, they
-- can write invoices for any user whose user_scopes includes team5.
CREATE TABLE user_manage_scopes (
  id                    BIGSERIAL PRIMARY KEY,
  fk_user_id            BIGINT NOT NULL REFERENCES "user"(id)  ON DELETE CASCADE,
  fk_scope_id           BIGINT NOT NULL REFERENCES scope(id)   ON DELETE CASCADE,
  created_datetime_utc  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (fk_user_id, fk_scope_id)
);
