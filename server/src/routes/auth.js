import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { pool } from '../db/pool.js';

const router = Router();

const DUMMY_HASH = '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW';

function issueToken(user) {
  return jwt.sign(
    { sub: user.user_guid, uid: user.user_id, sid: user.scope_id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// Register — scope_guid optional; falls back to first scope (dev convenience).
// In production, always pass scope_guid (e.g. from an invite link).
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, scope_guid } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const scopeResult = scope_guid
      ? await pool.query(`SELECT id FROM scope WHERE guid = $1`, [scope_guid])
      : await pool.query(`SELECT id FROM scope ORDER BY id LIMIT 1`);

    if (!scopeResult.rows.length) {
      return res.status(400).json({ error: 'No scope found — pass a valid scope_guid' });
    }
    const scopeId = scopeResult.rows[0].id;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { rows: [person] } = await client.query(
        `INSERT INTO unique_person DEFAULT VALUES RETURNING id`
      );

      const { rows: [user] } = await client.query(
        `INSERT INTO "user" (fk_unique_person_id, fk_scope_id)
         VALUES ($1, $2) RETURNING id, guid`,
        [person.id, scopeId]
      );

      const passwordHash = await bcrypt.hash(password, 12);
      const validationToken = crypto.randomBytes(32).toString('hex');
      const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await client.query(
        `INSERT INTO login_via_email
           (fk_user_id, email, password_hash,
            validation_token, validation_token_expires_datetime_utc)
         VALUES ($1, $2, $3, $4, $5)`,
        [user.id, email.toLowerCase().trim(), passwordHash, validationToken, tokenExpires]
      );

      await client.query(
        `INSERT INTO user_roles (fk_user_id, fk_role_id)
         SELECT $1, id FROM roles WHERE name = 'user'`,
        [user.id]
      );

      await client.query('COMMIT');

      res.status(201).json({
        message: 'Account created. Check your email to verify your address.',
        ...(process.env.NODE_ENV === 'development' && { validationToken }),
      });
    } catch (err) {
      await client.query('ROLLBACK');
      if (err.code === '23505') return res.status(409).json({ error: 'Email already in use' });
      throw err;
    } finally {
      client.release();
    }
  } catch (err) { next(err); }
});

// Login — if the email exists in multiple scopes, returns a scope list instead
// of a token. Client presents the picker and calls again with scope_guid.
router.post('/login', async (req, res, next) => {
  try {
    const { email, password, scope_guid } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const params = [email.toLowerCase().trim()];
    const scopeFilter = scope_guid ? `AND s.guid = $2` : '';
    if (scope_guid) params.push(scope_guid);

    const { rows } = await pool.query(
      `SELECT
         lve.password_hash,
         usr.id   AS user_id,
         usr.guid AS user_guid,
         usr.status,
         usr.fk_scope_id AS scope_id,
         s.guid          AS scope_guid,
         s.name          AS scope_name
       FROM login_via_email lve
       JOIN "user" usr ON usr.id = lve.fk_user_id
       JOIN scope   s  ON s.id  = usr.fk_scope_id
       WHERE lve.email = $1
         AND lve.email_validated_datetime_utc IS NOT NULL
         ${scopeFilter}`,
      params
    );

    const passwordMatch = await bcrypt.compare(
      password,
      rows[0]?.password_hash ?? DUMMY_HASH
    );

    if (!rows.length || !passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const active = rows.filter(r => r.status === 'active');

    if (!active.length) {
      return res.status(403).json({ error: 'Account is inactive' });
    }

    // Multiple active scopes and none specified — return list for picker
    if (active.length > 1) {
      return res.json({
        scopes: active.map(r => ({ guid: r.scope_guid, name: r.scope_name })),
      });
    }

    res.json({ token: issueToken(active[0]) });
  } catch (err) { next(err); }
});

router.get('/verify-email', async (req, res, next) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const { rowCount } = await pool.query(
      `UPDATE login_via_email
       SET email_validated_datetime_utc          = NOW(),
           validation_token                      = NULL,
           validation_token_expires_datetime_utc = NULL
       WHERE validation_token = $1
         AND validation_token_expires_datetime_utc > NOW()
         AND email_validated_datetime_utc IS NULL`,
      [token]
    );

    if (rowCount === 0) {
      return res.status(400).json({ error: 'Token is invalid or has expired' });
    }

    res.json({ message: 'Email verified. You can now sign in.' });
  } catch (err) { next(err); }
});

export default router;
