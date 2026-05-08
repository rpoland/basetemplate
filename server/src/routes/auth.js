import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { pool } from '../db/pool.js';

const router = Router();

// Prevents timing attacks when the email doesn't exist — always run bcrypt
const DUMMY_HASH = '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW';

router.post('/register', async (req, res) => {
  const { email, password, firstName } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: [user] } = await client.query(
      `INSERT INTO users DEFAULT VALUES RETURNING id, user_guid`
    );

    const passwordHash = await bcrypt.hash(password, 12);
    const validationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    await client.query(
      `INSERT INTO user_email_logins
         (user_id, email, password_hash, validation_token, validation_token_expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [user.id, email.toLowerCase().trim(), passwordHash, validationToken, tokenExpires]
    );

    await client.query(
      `INSERT INTO user_roles (user_id, role_id)
       SELECT $1, id FROM roles WHERE name = 'user'`,
      [user.id]
    );

    await client.query('COMMIT');

    // TODO: send verification email containing validationToken
    res.status(201).json({
      message: 'Account created. Check your email to verify your address.',
      // Expose token in dev so you can test without an email provider
      ...(process.env.NODE_ENV === 'development' && { validationToken }),
    });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already in use' });
    }
    throw err;
  } finally {
    client.release();
  }
});

router.post('/login', async (req, res, next) => {
  try {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const { rows } = await pool.query(
    `SELECT uel.password_hash, uel.email_validated_at,
            u.id AS user_id, u.user_guid, u.status
     FROM user_email_logins uel
     JOIN users u ON u.id = uel.user_id
     WHERE uel.email = $1 AND uel.email_validated_at IS NOT NULL`,
    [email.toLowerCase().trim()]
  );

  const record = rows[0];
  const passwordMatch = await bcrypt.compare(password, record?.password_hash ?? DUMMY_HASH);

  if (!record || !passwordMatch) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  if (record.status !== 'active') {
    return res.status(403).json({ error: 'Account is inactive' });
  }

  const token = jwt.sign(
    { sub: record.user_guid, uid: record.user_id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  res.json({ token });
  } catch (err) { next(err); }
});

router.get('/verify-email', async (req, res, next) => {
  try {
  const { token } = req.query;
  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  const { rowCount } = await pool.query(
    `UPDATE user_email_logins
     SET email_validated_at = NOW(),
         validation_token = NULL,
         validation_token_expires_at = NULL
     WHERE validation_token = $1
       AND validation_token_expires_at > NOW()
       AND email_validated_at IS NULL`,
    [token]
  );

  if (rowCount === 0) {
    return res.status(400).json({ error: 'Token is invalid or has expired' });
  }

  res.json({ message: 'Email verified. You can now sign in.' });
  } catch (err) { next(err); }
});

export default router;
