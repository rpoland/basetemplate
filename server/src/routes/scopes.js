import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { pool } from '../db/pool.js';

const router = Router();

router.get('/', authenticate, authorize('scope:read'), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, guid, name FROM scope ORDER BY name`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/', authenticate, authorize('scope:write'), async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    const { rows: [scope] } = await pool.query(
      `INSERT INTO scope (name) VALUES ($1) RETURNING id, guid, name`,
      [name.trim()]
    );
    res.status(201).json(scope);
  } catch (err) { next(err); }
});

export default router;
