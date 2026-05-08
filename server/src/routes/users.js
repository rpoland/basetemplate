import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { pool } from '../db/pool.js';

const router = Router();

router.post('/', authenticate, authorize('users:write'), async (req, res, next) => {
  const { first_name, email, password, status = 'active', role_id } = req.body;

  if (!email || !password || !role_id) {
    return res.status(400).json({ error: 'Email, password and role are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: [user] } = await client.query(
      `INSERT INTO users (first_name, status) VALUES ($1, $2) RETURNING id, user_guid`,
      [first_name || null, status]
    );

    const passwordHash = await bcrypt.hash(password, 12);

    // Admin-created accounts are pre-validated — no email verification needed
    await client.query(
      `INSERT INTO user_email_logins (user_id, email, password_hash, email_validated_at)
       VALUES ($1, $2, $3, NOW())`,
      [user.id, email.toLowerCase().trim(), passwordHash]
    );

    await client.query(
      `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`,
      [user.id, role_id]
    );

    await client.query('COMMIT');
    res.status(201).json({ user_guid: user.user_guid });
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
