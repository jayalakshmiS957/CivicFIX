import fs from 'fs';
import path from 'path';
import { config } from '../config.js';

class SupportsRepository {
  constructor() {
    this.filePath = path.join(config.paths.data, 'supports.json');
    this.supports = []; // Array of { issueId, userId, createdAt }
    this.shares = {};   // Map of { [issueId]: number }
    this.userShares = []; // Array of { issueId, userId, createdAt }
    this.init();
  }

  init() {
    try {
      if (!fs.existsSync(config.paths.data)) {
        fs.mkdirSync(config.paths.data, { recursive: true });
      }

      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        this.supports = parsed.supports || [];
        this.shares = parsed.shares || {};
        this.userShares = parsed.userShares || [];
      } else {
        // Seed initial community supports for realistic demo issues
        this.supports = [
          { issueId: 'CR-2026-1001', userId: 'usr_cit_002', createdAt: '2026-11-20T08:20:00.000Z' },
          { issueId: 'CR-2026-1002', userId: 'usr_cit_001', createdAt: '2026-11-20T09:45:00.000Z' },
          { issueId: 'CR-2026-1003', userId: 'usr_cit_002', createdAt: '2026-11-19T07:25:00.000Z' },
          { issueId: 'CR-2026-1004', userId: 'usr_cit_001', createdAt: '2026-11-18T14:35:00.000Z' },
          { issueId: 'CR-2026-1005', userId: 'usr_cit_002', createdAt: '2026-11-20T06:50:00.000Z' },
        ];
        this.shares = {
          'CR-2026-1001': 14,
          'CR-2026-1002': 9,
          'CR-2026-1003': 22,
          'CR-2026-1004': 6,
          'CR-2026-1005': 8,
        };
        this.persist();
      }
    } catch (err) {
      console.warn('[SupportsRepo] Resetting supports data:', err.message);
      this.supports = [];
      this.shares = {};
      this.persist();
    }
  }

  persist() {
    try {
      fs.writeFileSync(
        this.filePath,
        JSON.stringify({ supports: this.supports, shares: this.shares, userShares: this.userShares }, null, 2),
        'utf-8'
      );
    } catch (err) {
      console.error('[SupportsRepo] Failed to save supports file:', err);
    }
  }

  /**
   * Check if a specific user has supported an issue
   * @param {string} issueId
   * @param {string} userId
   * @returns {boolean}
   */
  hasSupported(issueId, userId) {
    if (!issueId || !userId) return false;
    return this.supports.some((s) => s.issueId === issueId && s.userId === userId);
  }

  /**
   * Adds citizen support for an issue.
   * Strictly rejects duplicate support attempts server-side.
   * @param {string} issueId
   * @param {string} userId
   * @returns {{ supported: boolean, totalSupports: number }}
   */
  addSupport(issueId, userId) {
    if (!issueId || !userId) {
      throw new Error('issueId and userId are required to record support');
    }

    const already = this.supports.some((s) => s.issueId === issueId && s.userId === userId);
    if (already) {
      const err = new Error('Citizen has already supported this civic issue. Only one support per citizen is permitted.');
      err.statusCode = 400;
      throw err;
    }

    this.supports.push({
      issueId,
      userId,
      createdAt: new Date().toISOString(),
    });
    this.persist();
    return { supported: true, totalSupports: this.getSupportsCount(issueId) };
  }

  /**
   * Removes citizen support for an issue
   * @param {string} issueId
   * @param {string} userId
   * @returns {{ supported: boolean, totalSupports: number }}
   */
  removeSupport(issueId, userId) {
    const idx = this.supports.findIndex((s) => s.issueId === issueId && s.userId === userId);
    if (idx !== -1) {
      this.supports.splice(idx, 1);
      this.persist();
    }
    return { supported: false, totalSupports: this.getSupportsCount(issueId) };
  }

  /**
   * Toggles citizen support for an issue.
   * Strictly enforces one support per user per issue on the backend.
   * @param {string} issueId
   * @param {string} userId
   * @returns {{ supported: boolean, totalSupports: number }}
   */
  toggleSupport(issueId, userId) {
    if (!issueId || !userId) {
      throw new Error('issueId and userId are required to record support');
    }

    const existingIndex = this.supports.findIndex(
      (s) => s.issueId === issueId && s.userId === userId
    );

    let supported = false;
    if (existingIndex !== -1) {
      // Toggle off / remove support
      this.supports.splice(existingIndex, 1);
      supported = false;
    } else {
      // Add support
      this.supports.push({
        issueId,
        userId,
        createdAt: new Date().toISOString(),
      });
      supported = true;
    }

    this.persist();
    const totalSupports = this.getSupportsCount(issueId);
    return { supported, totalSupports };
  }

  /**
   * Return total verified supports for an issue
   * @param {string} issueId
   * @returns {number}
   */
  getSupportsCount(issueId) {
    return this.supports.filter((s) => s.issueId === issueId).length;
  }

  /**
   * Return list of issue IDs supported by a user
   * @param {string} userId
   * @returns {string[]}
   */
  getUserSupportedIssueIds(userId) {
    if (!userId) return [];
    return this.supports.filter((s) => s.userId === userId).map((s) => s.issueId);
  }

  /**
   * Records a verified Web Share event (navigator.share resolved successfully).
   * Plain copy-link NEVER calls this.
   * Counts at most one share per user per issue.
   * @param {string} issueId
   * @param {string|null} [userId=null]
   * @returns {{ totalShares: number, alreadyShared: boolean }}
   */
  recordShare(issueId, userId = null) {
    if (!issueId) throw new Error('issueId is required to record share');

    if (userId) {
      const alreadyShared = this.userShares.some(
        (s) => s.issueId === issueId && s.userId === userId
      );
      if (alreadyShared) {
        return { totalShares: this.getSharesCount(issueId), alreadyShared: true };
      }
      this.userShares.push({
        issueId,
        userId,
        createdAt: new Date().toISOString(),
      });
    }

    this.shares[issueId] = (this.shares[issueId] || 0) + 1;
    this.persist();
    return { totalShares: this.shares[issueId], alreadyShared: false };
  }

  /**
   * Return total verified shares for an issue
   * @param {string} issueId
   * @returns {number}
   */
  getSharesCount(issueId) {
    return this.shares[issueId] || 0;
  }
}

export const supportsRepo = new SupportsRepository();
