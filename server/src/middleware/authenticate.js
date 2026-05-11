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
         usr.id,
         usr.guid,
         usr.status,
         usr.fk_scope_id              AS scope_id,
         bool_or(r.is_super)          AS is_super,
         array_agg(DISTINCT p.name)
           FILTER (WHERE p.name IS NOT NULL) AS permissions
       FROM "user" usr
       JOIN user_roles         ur  ON ur.fk_user_id    = usr.id
       JOIN roles              r   ON r.id              = ur.fk_role_id
       LEFT JOIN role_permissions rp ON rp.fk_role_id  = r.id
       LEFT JOIN permissions   p   ON p.id              = rp.fk_permission_id
       WHERE usr.id = $1 AND usr.status = 'active'
       GROUP BY usr.id, usr.guid, usr.status, usr.fk_scope_id`,
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
