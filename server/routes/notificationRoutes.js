import express from 'express';
import { notificationsRepo } from '../repositories/notificationsRepo.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

/**
 * GET /api/notifications
 * Get user's notifications and unread count
 */
router.get('/', (req, res) => {
  try {
    const list = notificationsRepo.getByUserId(req.user.id);
    const unreadCount = list.filter((n) => !n.read).length;
    return res.json({
      success: true,
      unreadCount,
      notifications: list,
    });
  } catch (err) {
    console.error('[NotificationRoutes GET Error]', err);
    return res.status(500).json({ success: false, error: 'An unexpected internal server error occurred. Please try again later.' });
  }
});

/**
 * PATCH /api/notifications/:id/read
 * Mark a single notification as read
 */
router.patch('/:id/read', (req, res) => {
  try {
    const success = notificationsRepo.markAsRead(req.params.id, req.user.id);
    return res.json({ success });
  } catch (err) {
    console.error('[NotificationRoutes mark read Error]', err);
    return res.status(500).json({ success: false, error: 'An unexpected internal server error occurred. Please try again later.' });
  }
});

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications for this user as read
 */
router.patch('/read-all', (req, res) => {
  try {
    const count = notificationsRepo.markAllAsRead(req.user.id);
    return res.json({ success: true, count });
  } catch (err) {
    console.error('[NotificationRoutes mark-all Error]', err);
    return res.status(500).json({ success: false, error: 'An unexpected internal server error occurred. Please try again later.' });
  }
});

export default router;
