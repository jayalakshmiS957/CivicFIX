import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimiter.js';
import { validateVoiceParseInput } from '../validators/voiceValidator.js';
import { parseVoiceAnswers } from '../services/voiceParseService.js';

const router = express.Router();

/**
 * POST /api/voice/parse
 * Parses guided conversational voice assistant answers into a pre-filled complaint form payload.
 * Protected by requireAuth and rate limited by aiLimiter.
 */
router.post('/parse', requireAuth, aiLimiter, async (req, res) => {
  try {
    const { isValid, errors, data } = validateVoiceParseInput(req.body);
    if (!isValid) {
      const firstError = Object.values(errors).find((v) => typeof v === 'string') || 'Invalid voice parse input.';
      return res.status(400).json({
        success: false,
        error: firstError,
        errors,
      });
    }

    const result = await parseVoiceAnswers({
      answers: data.answers,
      language: data.language,
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error('[VoiceRoutes /parse Error]', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to parse voice assistant responses. Please review and type your report manually.',
    });
  }
});

export default router;
