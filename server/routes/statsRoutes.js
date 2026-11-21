import express from 'express';
import { issuesRepo } from '../repositories/issuesRepo.js';

const router = express.Router();

/**
 * GET /api/stats
 * Public aggregate statistics
 */
router.get('/', async (_req, res) => {
  try {
    const stats = await issuesRepo.getStats();
    return res.json({ success: true, stats });
  } catch (err) {
    console.error('[StatsRoutes Error]', err);
    return res.status(500).json({ success: false, error: 'An unexpected internal server error occurred. Please try again later.' });
  }
});

export default router;
