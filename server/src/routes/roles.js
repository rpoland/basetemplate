import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { pool } from '../db/pool.js';

const router = Router();

router.get('/', authenticate, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, description FROM roles ORDER BY name`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

export default router;
