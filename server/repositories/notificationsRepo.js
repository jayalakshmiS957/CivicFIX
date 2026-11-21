import fs from 'fs';
import path from 'path';
import { config } from '../config.js';

class NotificationsRepository {
  constructor() {
    this.filePath = path.join(config.paths.data, 'notifications.json');
    this.notifications = [];
    this.init();
  }

  init() {
    try {
      if (!fs.existsSync(config.paths.data)) {
        fs.mkdirSync(config.paths.data, { recursive: true });
      }

      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        this.notifications = JSON.parse(raw);
      } else {
        // Seed initial notification for demo citizen
        this.notifications = [
          {
            id: 'notif_init_01',
            userId: 'usr_cit_001',
            issueId: 'CR-2026-1001',
            title: 'Urgent Work Order Dispatched',
            message: 'TNEB emergency quick response linemen dispatched to Gandhipuram cable hazard.',
            read: false,
            createdAt: '2026-11-20T08:35:00.000Z',
          },
          {
            id: 'notif_init_02',
            userId: 'usr_cit_002',
            issueId: 'CR-2026-1008',
            title: 'Complaint Resolved & Verified',
            message: 'Race Course promenade paver blocks have been leveled and reopened to public walkers.',
            read: true,
            createdAt: '2026-11-16T16:30:00.000Z',
          },
        ];
        this.persist();
      }
    } catch (err) {
      console.warn('[NotificationsRepo] Error reading notifications:', err.message);
      this.notifications = [];
      this.persist();
    }
  }

  persist() {
    try {
      if (!fs.existsSync(config.paths.data)) {
        fs.mkdirSync(config.paths.data, { recursive: true });
      }
      fs.writeFileSync(this.filePath, JSON.stringify(this.notifications, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[NotificationsRepo] Failed to save notifications file (keeping data in memory):', err.message);
    }
  }

  /**
   * Get notifications for a user sorted newest first
   * @param {string} userId
   * @returns {Array<object>}
   */
  getByUserId(userId) {
    if (!userId) return [];
    return this.notifications
      .filter((n) => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Create a new notification
   * @param {object} params
   */
  create({ userId, issueId, title, message }) {
    const newNotif = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      issueId,
      title: title.trim(),
      message: message.trim(),
      read: false,
      createdAt: new Date().toISOString(),
    };

    this.notifications.unshift(newNotif);
    this.persist();
    return newNotif;
  }

  /**
   * Mark a single notification as read
   * @param {string} notificationId
   * @param {string} userId
   */
  markAsRead(notificationId, userId) {
    const item = this.notifications.find((n) => n.id === notificationId && n.userId === userId);
    if (!item) return false;
    item.read = true;
    this.persist();
    return true;
  }

  /**
   * Mark all notifications for a user as read
   * @param {string} userId
   */
  markAllAsRead(userId) {
    let count = 0;
    for (const notif of this.notifications) {
      if (notif.userId === userId && !notif.read) {
        notif.read = true;
        count += 1;
      }
    }
    if (count > 0) this.persist();
    return count;
  }
}

export const notificationsRepo = new NotificationsRepository();
