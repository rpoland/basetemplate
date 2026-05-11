-- DEV SEED ONLY — do not run in production
-- Super admin: s@a.com / p

WITH
new_scope AS (
  INSERT INTO scope (name)
  VALUES ('Development')
  RETURNING id
),
new_person AS (
  INSERT INTO unique_person DEFAULT VALUES
  RETURNING id
),
new_user AS (
  INSERT INTO "user" (fk_unique_person_id, fk_scope_id, status)
  SELECT p.id, s.id, 'active'
  FROM new_person p, new_scope s
  RETURNING id
),
new_login AS (
  INSERT INTO login_via_email
    (fk_user_id, email, password_hash, email_validated_datetime_utc)
  SELECT u.id, 's@a.com',
    '$2a$12$YF.IwWYbVKaCKgO0IqNC2.o/kv.Cfpdq6RgfimKrFGOBUPkp9rOv2',
    NOW()
  FROM new_user u
  RETURNING fk_user_id
)
INSERT INTO user_roles (fk_user_id, fk_role_id)
SELECT l.fk_user_id, r.id
FROM new_login l, roles r
WHERE r.name = 'super_admin';
