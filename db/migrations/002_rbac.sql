CREATE TABLE roles (
  id          BIGSERIAL PRIMARY KEY,
  name        VARCHAR(100) UNIQUE NOT NULL,
  is_super    BOOLEAN NOT NULL DEFAULT false,
  description VARCHAR(255)
);

CREATE TABLE permissions (
  id          BIGSERIAL PRIMARY KEY,
  name        VARCHAR(100) UNIQUE NOT NULL,
  description VARCHAR(255)
);

CREATE TABLE role_permissions (
  role_id       BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id BIGINT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE user_roles (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

-- Seed roles
INSERT INTO roles (name, is_super, description) VALUES
  ('super_admin', true,  'Full system access — bypasses all permission checks'),
  ('admin',       false, 'Administrative access'),
  ('user',        false, 'Standard user — assigned on registration');

-- Seed permissions
INSERT INTO permissions (name, description) VALUES
  ('users:read',   'View user list'),
  ('users:write',  'Create and edit users'),
  ('users:delete', 'Delete users');

-- Grant all seeded permissions to admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.name = 'admin';
