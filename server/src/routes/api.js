import { Router } from 'express';

const router = Router();

// Add your API routes here
router.get('/ping', (req, res) => {
  res.json({ message: 'pong', timestamp: new Date().toISOString() });
});

export default router;
