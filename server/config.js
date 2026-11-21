import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import fs from 'fs';

const initialEnv = process.env.NODE_ENV;
dotenv.config();
if (initialEnv) {
  process.env.NODE_ENV = initialEnv;
}

const isTest =
  (process.env.NODE_ENV || '').trim() === 'test' ||
  Boolean(process.env.NODE_TEST_CONTEXT) ||
  process.execArgv.some((a) => a.includes('test')) ||
  process.argv.some((a) => a.includes('test'));

if (isTest) {
  process.env.NODE_ENV = 'test';
}

const isVercel = Boolean(process.env.VERCEL);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const testDir = path.join(os.tmpdir(), `civicresolve-test-${process.pid}`);
const vercelDir = path.join(os.tmpdir(), 'civicresolve-data');
const vercelUploads = path.join(os.tmpdir(), 'civicresolve-uploads');

let dataDir = path.join(rootDir, 'data');
let uploadsDir = path.join(rootDir, 'uploads');

if (isTest) {
  dataDir = testDir;
  uploadsDir = path.join(testDir, 'uploads');
} else if (isVercel) {
  dataDir = vercelDir;
  uploadsDir = vercelUploads;

  // On Vercel, copy seed files into os.tmpdir() on cold startup
  try {
    if (!fs.existsSync(vercelDir)) {
      fs.mkdirSync(vercelDir, { recursive: true });
    }
    const seedSourceDir = path.join(rootDir, 'data');
    if (fs.existsSync(seedSourceDir)) {
      const files = fs.readdirSync(seedSourceDir);
      for (const file of files) {
        const dest = path.join(vercelDir, file);
        if (!fs.existsSync(dest)) {
          fs.copyFileSync(path.join(seedSourceDir, file), dest);
        }
      }
    }
  } catch (copyErr) {
    console.warn('[Config Warning] Error copying seed data to /tmp on Vercel:', copyErr.message);
  }
}

let jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || !jwtSecret.trim()) {
  console.warn('[Config Warning] JWT_SECRET is missing. Using stable fallback secret for session signing.');
  jwtSecret = 'civicresolve_super_secure_jwt_secret_key_2026_gdgoc';
}

export const config = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: (process.env.NODE_ENV || 'development').trim(),
  jwtSecret,
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  defaultAdminEmail: (process.env.DEFAULT_ADMIN_EMAIL || '').trim() || 'admin@civicresolve.gov',
  defaultAdminPassword: (process.env.DEFAULT_ADMIN_PASSWORD || '').trim() || 'Admin@Civic2026!',
  isVercel,
  paths: {
    root: rootDir,
    data: dataDir,
    uploads: uploadsDir,
    dist: path.join(rootDir, 'dist'),
  },
};
