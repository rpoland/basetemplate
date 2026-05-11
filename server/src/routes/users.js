import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { pool } from '../db/pool.js';

const router = Router();

// Super admins see all users; others see only their own scope.
router.get('/', authenticate, authorize('users:read'), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         usr.id,
         usr.guid AS user_guid,
         usr.status,
         lve.email,
         array_agg(r.name ORDER BY r.name)
           FILTER (WHERE r.name IS NOT NULL) AS roles
       FROM "user" usr
       LEFT JOIN login_via_email lve ON lve.fk_user_id = usr.id
       LEFT JOIN user_roles      ur  ON ur.fk_user_id  = usr.id
       LEFT JOIN roles           r   ON r.id            = ur.fk_role_id
       WHERE ($1 OR usr.fk_scope_id = $2) AND usr.status != 'deleted'
       GROUP BY usr.id, usr.guid, usr.status, lve.email
       ORDER BY usr.id`,
      [req.user.is_super, req.user.scope_id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// Admin-created users are pre-validated and placed in the admin's scope.
router.post('/', authenticate, authorize('users:write'), async (req, res, next) => {
  const { email, password, status = 'active', role_id, scope_ids = [] } = req.body;

  if (!email || !password || !role_id) {
    return res.status(400).json({ error: 'Email, password and role are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: [person] } = await client.query(
      `INSERT INTO unique_person DEFAULT VALUES RETURNING id`
    );

    const { rows: [user] } = await client.query(
      `INSERT INTO "user" (fk_unique_person_id, fk_scope_id, status)
       VALUES ($1, $2, $3) RETURNING id, guid`,
      [person.id, req.user.scope_id, status]
    );

    const passwordHash = await bcrypt.hash(password, 12);

    await client.query(
      `INSERT INTO login_via_email
         (fk_user_id, email, password_hash, email_validated_datetime_utc)
       VALUES ($1, $2, $3, NOW())`,
      [user.id, email.toLowerCase().trim(), passwordHash]
    );

    await client.query(
      `INSERT INTO user_roles (fk_user_id, fk_role_id) VALUES ($1, $2)`,
      [user.id, role_id]
    );

    if (scope_ids.length > 0) {
      await client.query(
        `INSERT INTO user_scopes (fk_user_id, fk_scope_id)
         SELECT $1, unnest($2::bigint[])
         ON CONFLICT DO NOTHING`,
        [user.id, scope_ids.map(Number)]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ user_guid: user.guid });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') return res.status(409).json({ error: 'Email already in use' });
    if (err.code === '23503') return res.status(400).json({ error: 'Invalid role' });
    next(err);
  } finally {
    client.release();
  }
});

router.get('/:guid', authenticate, authorize('users:read'), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         usr.id,
         usr.guid AS user_guid,
         usr.status,
         lve.email,
         ur.fk_role_id AS role_id,
         array_agg(DISTINCT r.name  ORDER BY r.name)
           FILTER (WHERE r.name IS NOT NULL)           AS roles,
         array_agg(DISTINCT us.fk_scope_id)
           FILTER (WHERE us.fk_scope_id IS NOT NULL)   AS scope_ids
       FROM "user" usr
       LEFT JOIN login_via_email lve ON lve.fk_user_id  = usr.id
       LEFT JOIN user_roles      ur  ON ur.fk_user_id   = usr.id
       LEFT JOIN roles           r   ON r.id             = ur.fk_role_id
       LEFT JOIN user_scopes     us  ON us.fk_user_id   = usr.id
       WHERE usr.guid = $1
         AND ($2 OR usr.fk_scope_id = $3)
       GROUP BY usr.id, usr.guid, usr.status, lve.email, ur.fk_role_id`,
      [req.params.guid, req.user.is_super, req.user.scope_id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.put('/:guid', authenticate, authorize('users:write'), async (req, res, next) => {
  const { email, password, status, role_id, scope_ids } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: [user] } = await client.query(
      `SELECT id FROM "user"
       WHERE guid = $1 AND ($2 OR fk_scope_id = $3)`,
      [req.params.guid, req.user.is_super, req.user.scope_id]
    );
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (status) {
      await client.query(
        `UPDATE "user" SET status = $1 WHERE id = $2`,
        [status, user.id]
      );
    }

    if (email) {
      await client.query(
        `UPDATE login_via_email SET email = $1 WHERE fk_user_id = $2`,
        [email.toLowerCase().trim(), user.id]
      );
    }

    if (password) {
      const passwordHash = await bcrypt.hash(password, 12);
      await client.query(
        `UPDATE login_via_email SET password_hash = $1 WHERE fk_user_id = $2`,
        [passwordHash, user.id]
      );
    }

    if (role_id) {
      await client.query(
        `UPDATE user_roles SET fk_role_id = $1 WHERE fk_user_id = $2`,
        [Number(role_id), user.id]
      );
    }

    if (scope_ids !== undefined) {
      await client.query(
        `DELETE FROM user_scopes WHERE fk_user_id = $1`,
        [user.id]
      );
      if (scope_ids.length > 0) {
        await client.query(
          `INSERT INTO user_scopes (fk_user_id, fk_scope_id)
           SELECT $1, unnest($2::bigint[])
           ON CONFLICT DO NOTHING`,
          [user.id, scope_ids.map(Number)]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') return res.status(409).json({ error: 'Email already in use' });
    if (err.code === '23503') return res.status(400).json({ error: 'Invalid role' });
    next(err);
  } finally {
    client.release();
  }
});

export default router;
