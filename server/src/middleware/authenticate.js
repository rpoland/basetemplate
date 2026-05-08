import jwt from 'jsonwebtoken';
import { pool } from '../db/pool.js';

export async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' });
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const { rows } = await pool.query(
      `SELECT
         u.id, u.user_guid, u.first_name, u.status,
         bool_or(r.is_super) AS is_super,
         array_agg(DISTINCT p.name) FILTER (WHERE p.name IS NOT NULL) AS permissions
       FROM users u
       JOIN user_roles ur ON ur.user_id = u.id
       JOIN roles r ON r.id = ur.role_id
       LEFT JOIN role_permissions rp ON rp.role_id = r.id
       LEFT JOIN permissions p ON p.id = rp.permission_id
       WHERE u.id = $1 AND u.status = 'active'
       GROUP BY u.id, u.user_guid, u.first_name, u.status`,
      [payload.uid]
    );

    if (!rows.length) {
      return res.status(401).json({ error: 'Account not found or inactive' });
    }

    req.user = rows[0];
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
