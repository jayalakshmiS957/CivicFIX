import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { config } from '../config.js';
import { SECURITY_LIMITS } from '../constants.js';

// Ensure uploads directory exists
if (!fs.existsSync(config.paths.uploads)) {
  fs.mkdirSync(config.paths.uploads, { recursive: true });
}

// Storage configuration with sanitized unique filenames
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, config.paths.uploads);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `civic-${uniqueSuffix}${ext}`);
  },
});

/**
 * Validates uploaded file MIME type and file extension.
 * Rejects any non-image extensions or unexpected MIME types.
 */
const fileFilter = (_req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const isValidMime = SECURITY_LIMITS.ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype);
  const isValidExt = SECURITY_LIMITS.ALLOWED_IMAGE_EXTENSIONS.includes(ext);

  if (isValidMime && isValidExt) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file format. Only JPG, PNG, and WebP images are allowed.'));
  }
};

export const upload = multer({
  storage,
  limits: {
    fileSize: SECURITY_LIMITS.UPLOAD_MAX_FILE_SIZE_BYTES, // 5 MB
  },
  fileFilter,
});

/**
 * Middleware wrapper to cleanly catch Multer errors (file size, format).
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export const handleUpload = (req, res, next) => {
  const uploadSingle = upload.single('image');
  uploadSingle(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          error: 'Image file size exceeds the 5 MB limit.',
        });
      }
      return res.status(400).json({
        success: false,
        error: `File upload error: ${err.message}`,
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        error: err.message || 'Failed to process uploaded file.',
      });
    }
    next();
  });
};
