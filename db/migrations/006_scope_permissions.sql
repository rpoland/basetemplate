-- Add scope permissions and grant to admin role.
-- super_admin bypasses all checks via is_super = true — no explicit grants needed.

INSERT INTO permissions (name, description) VALUES
  ('scope:read',   'View scopes'),
  ('scope:write',  'Create and edit scopes'),
  ('scope:delete', 'Delete scopes');

INSERT INTO role_permissions (fk_role_id, fk_permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.name = 'admin'
  AND p.name IN ('scope:read', 'scope:write', 'scope:delete');
