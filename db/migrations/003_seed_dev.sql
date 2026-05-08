-- DEV SEED ONLY — do not run in production
-- Super admin: s@a.com / p

WITH new_user AS (
  INSERT INTO users (status)
  VALUES ('active')
  RETURNING id
),
email_login AS (
  INSERT INTO user_email_logins (user_id, email, password_hash, email_validated_at)
  SELECT id, 's@a.com', '$2a$12$YF.IwWYbVKaCKgO0IqNC2.o/kv.Cfpdq6RgfimKrFGOBUPkp9rOv2', NOW()
  FROM new_user
)
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM new_user u CROSS JOIN roles r WHERE r.name = 'super_admin';
