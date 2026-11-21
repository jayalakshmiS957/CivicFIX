import express from 'express';
import fs from 'fs';
import { issuesRepo } from '../repositories/issuesRepo.js';
import { supportsRepo } from '../repositories/supportsRepo.js';
import { handleUpload } from '../middleware/upload.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { aiLimiter, supportLimiter } from '../middleware/rateLimiter.js';
import { validateIssueInput } from '../validators/issueValidator.js';
import { analyzeCivicIssue } from '../services/geminiService.js';
import { calculateCommunityImpactScore } from '../services/scoringService.js';

const router = express.Router();

/**
 * Format reporter object for public endpoints:
 * Removes reporter.email for non-admins; exposes only the reporter's first name.
 * Full reporter data is preserved for admin users.
 */
function formatReporterForUser(issue, user) {
  if (!issue) return issue;
  if (user && user.role === 'admin') {
    return issue;
  }
  const cloned = { ...issue };
  if (cloned.reporter) {
    const rawName = cloned.reporter.name || 'Citizen';
    const firstName = rawName.trim().split(/\s+/)[0] || 'Citizen';
    cloned.reporter = {
      id: cloned.reporter.id,
      name: firstName,
    };
  }
  return cloned;
}

/**
 * GET /api/issues
 * Public list of issues with optional filtering, sorting, and user-support status.
 * Non-admins receive reporter with only first name and no email.
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { status, category, priority, reporterId, search, sort, location } = req.query;
    const issues = await issuesRepo.getAll(
      { status, category, priority, reporterId, search, sort, location },
      req.user?.id
    );
    const sanitized = issues.map((i) => formatReporterForUser(i, req.user));
    return res.json({ success: true, count: sanitized.length, issues: sanitized });
  } catch (err) {
    console.error('[IssueRoutes GET / Error]', err);
    return res.status(500).json({ success: false, error: 'An unexpected internal server error occurred. Please try again later.' });
  }
});

/**
 * POST /api/issues/check-duplicates
 * Checks for duplicate open issues within 200m before saving a report
 */
router.post('/check-duplicates', optionalAuth, async (req, res) => {
  try {
    const { title, description, category, latitude, longitude } = req.body;
    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, error: 'Latitude and longitude required.' });
    }

    const duplicates = await issuesRepo.checkDuplicates({
      title: title || '',
      description: description || '',
      category: category || 'Other',
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
    });

    return res.json({
      success: true,
      hasDuplicates: duplicates.length > 0,
      duplicates,
    });
  } catch (err) {
    console.error('[IssueRoutes check-duplicates Error]', err);
    return res.status(500).json({ success: false, error: 'An unexpected internal server error occurred. Please try again later.' });
  }
});

/**
 * GET /api/issues/nearby
 * Returns issues within selected radius (500m = 0.5, 1km = 1.0, 5km = 5.0).
 * Non-admins receive reporter with only first name and no email.
 */
router.get('/nearby', optionalAuth, async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radiusKm = parseFloat(req.query.radiusKm) || 1.0;

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({ success: false, error: 'Valid lat and lng query params required.' });
    }

    const nearby = await issuesRepo.getNearby(lat, lng, radiusKm, req.user?.id);
    const sanitized = nearby.map((i) => formatReporterForUser(i, req.user));
    return res.json({
      success: true,
      count: sanitized.length,
      radiusKm,
      issues: sanitized,
    });
  } catch (err) {
    console.error('[IssueRoutes nearby Error]', err);
    return res.status(500).json({ success: false, error: 'An unexpected internal server error occurred. Please try again later.' });
  }
});

/**
 * GET /api/issues/:id
 * Public detail view for a specific issue by tracking ID.
 * Non-admins receive reporter with only first name and no email.
 */
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const issue = await issuesRepo.getById(req.params.id, req.user?.id);
    if (!issue) {
      return res.status(404).json({
        success: false,
        error: `Issue with tracking ID "${req.params.id}" was not found.`,
      });
    }
    return res.json({ success: true, issue: formatReporterForUser(issue, req.user) });
  } catch (err) {
    console.error('[IssueRoutes GET /:id Error]', err);
    return res.status(500).json({ success: false, error: 'An unexpected internal server error occurred. Please try again later.' });
  }
});

/**
 * POST /api/issues
 * Create a new civic report with Gemini AI multimodal analysis.
 * Blocked for admin role (citizens only).
 * Non-admins receive created issue with reporter email redacted and only first name.
 */
router.post('/', requireAuth, aiLimiter, handleUpload, async (req, res) => {
  try {
    if (req.user && req.user.role === 'admin') {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(403).json({
        success: false,
        error: 'Admins manage complaints and cannot file reports. Citizens only.',
      });
    }

    const { isValid, errors, data } = validateIssueInput(req.body);
    if (!isValid) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      const firstError = Object.values(errors).find((v) => typeof v === 'string') || 'Invalid issue report details.';
      return res.status(400).json({ success: false, error: firstError, errors });
    }

    let imageBase64 = null;
    let imageMime = null;
    let imageUrl = null;

    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
      try {
        const fileBuffer = fs.readFileSync(req.file.path);
        imageBase64 = fileBuffer.toString('base64');
        imageMime = req.file.mimetype;
      } catch (fileErr) {
        console.warn('[IssueRoutes] Error reading uploaded image for AI:', fileErr.message);
      }
    }

    const locationText = `${data.location.address || ''} ${data.location.locality || ''} ${data.location.landmark || ''}`.trim();

    // Perform Google Gemini AI analysis
    const aiAnalysis = await analyzeCivicIssue({
      title: data.title,
      description: data.description,
      requestedCategory: data.category,
      locationText,
      imageBase64,
      imageMime,
    });

    const finalCategory = data.category !== 'Let AI decide' ? data.category : aiAnalysis.category;
    const finalPriority = aiAnalysis.priority;
    const finalDepartment = aiAnalysis.department;

    const createdIssue = await issuesRepo.create({
      title: data.title,
      description: data.description,
      category: finalCategory,
      priority: finalPriority,
      department: finalDepartment,
      secondaryDepartment: aiAnalysis.secondary_department,
      location: data.location,
      locationCaptureMethod: req.body.locationCaptureMethod || 'manual',
      imageUrl,
      reporter: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
      },
      aiAnalysis,
    });

    return res.status(201).json({
      success: true,
      message: 'Civic issue successfully analyzed and logged.',
      issue: formatReporterForUser(createdIssue, req.user),
      aiAnalysis,
    });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch {}
    }
    console.error('[IssueRoutes POST / Error]', err);
    return res.status(500).json({
      success: false,
      error: 'An unexpected internal server error occurred. Please try again later.',
    });
  }
});

/**
 * POST /api/issues/:id/support
 * CivicVoice: Add citizen support.
 * One authenticated citizen supports an issue only once (strictly enforced on backend).
 * A second support attempt must be rejected server-side with HTTP 400.
 */
router.post('/:id/support', requireAuth, supportLimiter, async (req, res) => {
  try {
    const issue = await issuesRepo.getById(req.params.id);
    if (!issue) {
      return res.status(404).json({ success: false, error: 'Issue not found.' });
    }

    // Prevent citizens from supporting their own reported complaints
    if (issue.reporter && issue.reporter.id === req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'You reported this issue',
      });
    }

    if (supportsRepo.hasSupported(req.params.id, req.user.id)) {
      return res.status(400).json({
        success: false,
        error: 'Citizen has already supported this civic issue. Only one support per citizen is permitted.',
      });
    }

    const { supported, totalSupports } = supportsRepo.addSupport(req.params.id, req.user.id);
    const communityImpact = calculateCommunityImpactScore(totalSupports);

    return res.json({
      success: true,
      supported,
      totalSupports,
      communityImpact,
      message: 'Support recorded for this civic issue.',
    });
  } catch (err) {
    if (err.statusCode && err.statusCode < 500) {
      return res.status(err.statusCode).json({ success: false, error: err.message });
    }
    console.error('[IssueRoutes support Error]', err);
    return res.status(500).json({ success: false, error: 'An unexpected internal server error occurred. Please try again later.' });
  }
});

/**
 * DELETE /api/issues/:id/support
 * CivicVoice: Withdraw citizen support.
 */
router.delete('/:id/support', requireAuth, supportLimiter, async (req, res) => {
  try {
    const issue = await issuesRepo.getById(req.params.id);
    if (!issue) {
      return res.status(404).json({ success: false, error: 'Issue not found.' });
    }

    const { supported, totalSupports } = supportsRepo.removeSupport(req.params.id, req.user.id);
    const communityImpact = calculateCommunityImpactScore(totalSupports);

    return res.json({
      success: true,
      supported,
      totalSupports,
      communityImpact,
      message: 'Support withdrawn.',
    });
  } catch (err) {
    console.error('[IssueRoutes DELETE support Error]', err);
    return res.status(500).json({ success: false, error: 'An unexpected internal server error occurred. Please try again later.' });
  }
});

/**
 * POST /api/issues/:id/share
 * CivicVoice: Track verified Web Share dialog completion.
 * Protected with requireAuth and rate limiter; counts at most one share per user per issue.
 */
router.post('/:id/share', requireAuth, supportLimiter, async (req, res) => {
  try {
    const issue = await issuesRepo.getById(req.params.id);
    if (!issue) {
      return res.status(404).json({ success: false, error: 'Issue not found.' });
    }

    const { totalShares, alreadyShared } = supportsRepo.recordShare(req.params.id, req.user.id);
    return res.json({
      success: true,
      totalShares,
      alreadyShared,
      message: alreadyShared ? 'Share already recorded for this user.' : 'Verified Web Share recorded.',
    });
  } catch (err) {
    console.error('[IssueRoutes share Error]', err);
    return res.status(500).json({ success: false, error: 'An unexpected internal server error occurred. Please try again later.' });
  }
});

/**
 * POST /api/issues/:id/verify-feedback
 * Citizen Verification Feedback: "Confirm fixed" or "Still a problem" (reopens issue).
 * Allowed ONLY when status is 'Resolved' or 'Pending Review', and the user is the reporter or a supporter.
 * Rate limited by supportLimiter; otherwise returns 403 or 409.
 */
router.post('/:id/verify-feedback', requireAuth, supportLimiter, async (req, res) => {
  try {
    const issue = await issuesRepo.getById(req.params.id);

    if (!issue) {
      return res.status(404).json({ success: false, error: 'Issue not found.' });
    }

    // Allowed ONLY when status is Resolved or Pending Review; otherwise 409
    if (issue.status !== 'Resolved' && issue.status !== 'Pending Review') {
      return res.status(409).json({
        success: false,
        error: `Verification feedback is only allowed when status is Resolved or Pending Review (current status: "${issue.status}").`,
      });
    }

    // Allowed ONLY when caller is the issue reporter or a supporter; otherwise 403
    const isReporter = issue.reporter && issue.reporter.id === req.user.id;
    const isSupporter = supportsRepo.hasSupported(req.params.id, req.user.id);
    if (!isReporter && !isSupporter) {
      return res.status(403).json({
        success: false,
        error: 'Only the reporter or verified supporters of this civic issue can submit verification feedback.',
      });
    }

    const { confirmedFixed, note } = req.body;
    let updated = null;
    if (confirmedFixed === false) {
      // Citizen indicates problem persists -> Reopen issue
      updated = await issuesRepo.reopenIssue(req.params.id, note, req.user);
      return res.json({
        success: true,
        message: 'Issue reopened for administrative inspection.',
        issue: formatReporterForUser(updated, req.user),
      });
    } else {
      // Citizen confirms fixed -> Record citizen verification confirmation
      const timelineEntry = {
        status: issue.status,
        timestamp: new Date().toISOString(),
        author: req.user.name || 'Citizen Inspector',
        note: `Citizen confirmed resolution: ${note || 'Verified in person on site.'}`,
      };
      updated = await issuesRepo.update(req.params.id, {
        timeline: [...issue.timeline, timelineEntry],
      }, req.user.id);

      return res.json({
        success: true,
        message: 'Thank you! Your resolution confirmation was recorded.',
        issue: formatReporterForUser(updated, req.user),
      });
    }
  } catch (err) {
    console.error('[IssueRoutes verify-feedback Error]', err);
    return res.status(500).json({ success: false, error: 'An unexpected internal server error occurred. Please try again later.' });
  }
});

/**
 * POST /api/issues/:id/follow-up
 * Citizens can answer AI clarifying questions inline.
 * Only the issue's reporter or an admin may call it; otherwise 403.
 */
router.post('/:id/follow-up', requireAuth, async (req, res) => {
  try {
    const issue = await issuesRepo.getById(req.params.id);
    if (!issue) {
      return res.status(404).json({ success: false, error: 'Issue not found.' });
    }

    const isReporter = issue.reporter && issue.reporter.id === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!isReporter && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Only the issue reporter or an administrator may submit follow-up answers.',
      });
    }

    const { answer } = req.body;
    if (!answer || typeof answer !== 'string' || answer.trim().length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Answer must be at least 3 characters long.',
      });
    }

    const updated = await issuesRepo.appendCitizenAnswer(req.params.id, answer, req.user);
    return res.json({
      success: true,
      message: 'Additional information successfully attached to issue report.',
      issue: formatReporterForUser(updated, req.user),
    });
  } catch (err) {
    console.error('[IssueRoutes follow-up Error]', err);
    return res.status(500).json({ success: false, error: 'An unexpected internal server error occurred. Please try again later.' });
  }
});

export default router;
