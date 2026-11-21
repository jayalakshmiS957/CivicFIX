import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { config } from './config.js';
import { generalLimiter } from './middleware/rateLimiter.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

// Route handlers
import authRoutes from './routes/authRoutes.js';
import issueRoutes from './routes/issueRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import statsRoutes from './routes/statsRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import departmentRoutes from './routes/departmentRoutes.js';
import voiceRoutes from './routes/voiceRoutes.js';
import trendRoutes from './routes/trendRoutes.js';

const app = express();

// Trust proxy for reverse proxies like Vercel so rate-limiting and IP detection work correctly
app.set('trust proxy', 1);

// Security Headers with safe CSP allowing OpenStreetMap and Google Fonts
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https://*.tile.openstreetmap.org', 'https://tile.openstreetmap.org'],
        connectSrc: ["'self'", 'https://nominatim.openstreetmap.org', 'https://*.tile.openstreetmap.org'],
        mediaSrc: ["'self'"],
        objectSrc: ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Restricted CORS configuration
const defaultOrigins = [
  'http://localhost:5173',
  'http://localhost:5000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5000',
];

const envOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const vercelOrigins = [];
if (process.env.VERCEL_URL) {
  vercelOrigins.push(`https://${process.env.VERCEL_URL}`);
  vercelOrigins.push(`http://${process.env.VERCEL_URL}`);
}

const allowedOriginsSet = new Set([...defaultOrigins, ...envOrigins, ...vercelOrigins]);

app.use(
  cors({
    origin: (origin, callback) => {
      // Do not block requests with no Origin header (same-origin, curl, mobile)
      if (!origin) {
        return callback(null, true);
      }

      if (
        allowedOriginsSet.has(origin) ||
        (process.env.VERCEL_URL && origin.includes('.vercel.app'))
      ) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked: Origin ${origin} not allowed.`));
    },
    credentials: true,
  })
);

// Parsers
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// Static Uploads Folder
if (!fs.existsSync(config.paths.uploads)) {
  fs.mkdirSync(config.paths.uploads, { recursive: true });
}
app.use('/uploads', express.static(config.paths.uploads));

// Apply general rate limiting to API routes
app.use('/api', generalLimiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/stats/trends', trendRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/voice', voiceRoutes);

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'healthy',
    product: 'CivicResolve',
    version: '1.0.0',
    time: new Date().toISOString(),
    geminiConfigured: Boolean(config.geminiApiKey && config.geminiApiKey !== 'your_gemini_api_key_here'),
  });
});

// Production Static Serving
if (fs.existsSync(config.paths.dist)) {
  app.use(express.static(config.paths.dist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(config.paths.dist, 'index.html'));
  });
}

// 404 & Error Handlers
app.use('/api/*', notFoundHandler);
app.use(errorHandler);

// Start server
let server = null;
const isTestEnv = (process.env.NODE_ENV || '').trim() === 'test';
if (!isTestEnv) {
  server = app.listen(config.port, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 CivicResolve Backend Engine Active`);
    console.log(`📍 Port: http://localhost:${config.port}`);
    console.log(`🛡️  Environment: ${config.nodeEnv}`);
    console.log(`🤖 Gemini Model: ${config.geminiModel} (${config.geminiApiKey ? 'API Key Configured' : 'Fallback Rules Active'})`);
    console.log(`======================================================\n`);
  });
}

export { app, server };
export default app;
