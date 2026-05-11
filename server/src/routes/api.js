import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

router.get('/ping', (req, res) => {
  res.json({ message: 'pong', timestamp: new Date().toISOString() });
});

router.get('/me', authenticate, async (req, res, next) => {
  try {
    res.json({
      user_guid:   req.user.guid,
      scope_id:    req.user.scope_id,
      is_super:    req.user.is_super,
      permissions: req.user.permissions || [],
    });
  } catch (err) { next(err); }
});

export default router;
