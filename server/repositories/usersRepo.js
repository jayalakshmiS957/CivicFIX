import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { config } from '../config.js';
import { INITIAL_DEMO_USERS } from './seedData.js';
import { DEMO_ACCOUNTS } from '../data/demoAccounts.js';

class UsersRepository {
  constructor() {
    this.filePath = path.join(config.paths.data, 'users.json');
    this.users = [];
    this.init();
  }

  /**
   * Initializes users file store or loads existing data.
   */
  init() {
    try {
      if (!fs.existsSync(config.paths.data)) {
        fs.mkdirSync(config.paths.data, { recursive: true });
      }

      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        this.users = JSON.parse(raw);
      } else {
        this.users = [...INITIAL_DEMO_USERS];
        this.persist();
      }
    } catch (err) {
      console.warn('[UsersRepo] Error reading users.json, re-initializing seed users:', err.message);
      this.users = [...INITIAL_DEMO_USERS];
      this.persist();
    }
    this.ensureDemoAccounts();
  }

  /**
   * Ensures canonical demo accounts exist, have matching credentials and maintain stable IDs.
   */
  ensureDemoAccounts() {
    let modified = false;

    for (const demo of DEMO_ACCOUNTS) {
      // Find existing by ID or email
      const existingIndex = this.users.findIndex(
        (u) => u.id === demo.id || u.email.toLowerCase() === demo.email.toLowerCase()
      );

      if (existingIndex !== -1) {
        const existing = this.users[existingIndex];
        let passwordMatches = false;
        try {
          passwordMatches = bcrypt.compareSync(demo.password, existing.passwordHash || '');
        } catch {
          passwordMatches = false;
        }

        const needsUpdate =
          existing.id !== demo.id ||
          existing.email !== demo.email ||
          existing.name !== demo.name ||
          existing.role !== demo.role ||
          !passwordMatches;

        if (needsUpdate) {
          existing.id = demo.id;
          existing.email = demo.email;
          existing.name = demo.name;
          existing.role = demo.role;
          if (!passwordMatches) {
            existing.passwordHash = bcrypt.hashSync(demo.password, 10);
          }
          modified = true;
        }
      } else {
        this.users.push({
          id: demo.id,
          name: demo.name,
          email: demo.email,
          passwordHash: bcrypt.hashSync(demo.password, 10),
          role: demo.role,
          createdAt: new Date().toISOString(),
        });
        modified = true;
      }
    }

    if (modified) {
      this.persist();
    }

    console.log('[Auth] Active demo accounts: ' + DEMO_ACCOUNTS.map((d) => d.email).join(', '));
  }

  /**
   * Persists users to JSON disk store safely.
   */
  persist() {
    try {
      if (!fs.existsSync(config.paths.data)) {
        fs.mkdirSync(config.paths.data, { recursive: true });
      }
      fs.writeFileSync(this.filePath, JSON.stringify(this.users, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[UsersRepo] Failed to save users (keeping data in memory):', err.message);
    }
  }

  /**
   * Find user by unique email (case-insensitive)
   * @param {string} email
   */
  async findByEmail(email) {
    if (!email) return null;
    const normalized = email.trim().toLowerCase();
    return this.users.find((u) => u.email.toLowerCase() === normalized) || null;
  }

  /**
   * Find user by id
   * @param {string} id
   */
  async findById(id) {
    if (!id) return null;
    return this.users.find((u) => u.id === id) || null;
  }

  /**
   * Find all users by role
   * @param {'citizen'|'admin'} role
   * @returns {Array<object>}
   */
  async findByRole(role) {
    if (!role) return [];
    return this.users.filter((u) => u.role === role);
  }

  /**
   * Create a new citizen user
   * @param {object} params
   * @param {string} params.name
   * @param {string} params.email
   * @param {string} params.password
   * @param {'citizen'|'admin'} [params.role='citizen']
   */
  async create({ name, email, password, role = 'citizen' }) {
    const existing = await this.findByEmail(email);
    if (existing) {
      throw new Error('An account with this email address already exists.');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const id = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newUser = {
      id,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      role: role === 'admin' ? 'admin' : 'citizen',
      createdAt: new Date().toISOString(),
    };

    this.users.push(newUser);
    this.persist();

    return {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      createdAt: newUser.createdAt,
    };
  }

  /**
   * Verifies a password against the stored bcrypt hash
   * @param {string} plainPassword
   * @param {string} hash
   */
  async verifyPassword(plainPassword, hash) {
    return bcrypt.compare(plainPassword, hash);
  }

  /**
   * Return all users (stripped of password hashes)
   */
  async getAll() {
    return this.users.map(({ passwordHash, ...safeUser }) => safeUser);
  }
}

export const usersRepo = new UsersRepository();
