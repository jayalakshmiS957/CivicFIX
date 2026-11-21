import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const testDir = path.join(os.tmpdir(), `civicresolve-test-${process.pid}`);

export const config = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: (process.env.NODE_ENV || 'development').trim(),
  jwtSecret: process.env.JWT_SECRET || 'civicresolve_super_secure_jwt_secret_key_2026_gdgoc',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  defaultAdminEmail: (process.env.DEFAULT_ADMIN_EMAIL || '').trim() || 'admin@civicresolve.gov',
  defaultAdminPassword: (process.env.DEFAULT_ADMIN_PASSWORD || '').trim() || 'Admin@Civic2026!',
  paths: {
    root: rootDir,
    data: isTest ? testDir : path.join(rootDir, 'data'),
    uploads: isTest ? path.join(testDir, 'uploads') : path.join(rootDir, 'uploads'),
    dist: path.join(rootDir, 'dist'),
  },
};
