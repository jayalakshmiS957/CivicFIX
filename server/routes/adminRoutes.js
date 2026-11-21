import express from 'express';
import path from 'path';
import { issuesRepo } from '../repositories/issuesRepo.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { handleUpload } from '../middleware/upload.js';
import { isValidStatusTransition, validateAdminOverride } from '../validators/issueValidator.js';
import { verifyRepairWithAI } from '../services/verificationService.js';
import { config } from '../config.js';

const router = express.Router();

// Guard all admin routes with authentication and admin role check
router.use(requireAuth, requireRole('admin'));

/**
 * GET /api/admin/analytics
 * Returns department accountability table and ward/locality comparative metrics
 */
router.get('/analytics', async (_req, res) => {
  try {
    const [departmentAnalytics, localityAnalytics] = await Promise.all([
      issuesRepo.getDepartmentAnalytics(),
      issuesRepo.getLocalityAnalytics(),
    ]);

    return res.json({
      success: true,
      departmentAnalytics,
      localityAnalytics,
    });
  } catch (err) {
    console.error('[AdminRoutes Error]', err);
    return res.status(500).json({ success: false, error: 'An unexpected internal server error occurred. Please try again later.' });
  }
});

/**
 * POST /api/admin/issues/:id/assign-work
 * Assigns municipal crew and transitions status to In Progress
 */
router.post('/issues/:id/assign-work', async (req, res) => {
  try {
    const { assignedTo, officer, notes, scheduledDate } = req.body;
    if (!assignedTo || !assignedTo.trim()) {
      return res.status(400).json({ success: false, error: 'Crew or contractor name required.' });
    }

    const updated = await issuesRepo.recordWorkAssignment(
      req.params.id,
      { assignedTo: assignedTo.trim(), officer, notes: notes?.trim() || '', scheduledDate },
      req.user.name || 'Municipal Admin'
    );

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Issue not found.' });
    }

    return res.json({
      success: true,
      message: `Work assigned to ${assignedTo}. Status updated to In Progress.`,
      issue: updated,
    });
  } catch (err) {
    console.error('[AdminRoutes Error]', err);
    return res.status(500).json({ success: false, error: 'An unexpected internal server error occurred. Please try again later.' });
  }
});

/**
 * POST /api/admin/issues/:id/verify-repair
 * Uploads "after" repair photo and performs Gemini multimodal verification
 */
router.post('/issues/:id/verify-repair', handleUpload, async (req, res) => {
  try {
    const issue = await issuesRepo.getById(req.params.id);
    if (!issue) {
      return res.status(404).json({ success: false, error: 'Issue not found.' });
    }

    const afterImageUrl = req.file ? `/uploads/${req.file.filename}` : null;
    const afterImagePath = req.file ? req.file.path : null;

    // Resolve before image disk path if exists
    let beforeImagePath = null;
    if (issue.imageUrl) {
      const filename = path.basename(issue.imageUrl);
      beforeImagePath = path.join(config.paths.uploads, filename);
    }

    // Call AI resolution verification comparing before and after
    const aiVerification = /** @type {any} */ (await verifyRepairWithAI({
      issueTitle: issue.title,
      issueDescription: issue.description,
      beforeImagePath,
      afterImagePath,
    }));

    const needsManualReview = typeof aiVerification.confidence === 'number' && aiVerification.confidence < 0.7;

    const verificationRecord = {
      afterImageUrl,
      repair_appears_complete: aiVerification.repair_appears_complete,
      confidence: aiVerification.confidence,
      observations: aiVerification.observations,
      needsManualReview,
      verifiedBy: req.user.name || 'Municipal Admin',
    };

    const updated = await issuesRepo.recordVerification(
      req.params.id,
      verificationRecord,
      req.user.name || 'Municipal Admin'
    );

    return res.json({
      success: true,
      message: 'Repair verification completed. Status set to Pending Review.',
      verification: verificationRecord,
      issue: updated,
    });
  } catch (err) {
    console.error('[AdminRoutes Error]', err);
    return res.status(500).json({ success: false, error: 'An unexpected internal server error occurred. Please try again later.' });
  }
});

/**
 * PATCH /api/admin/issues/:id/status
 * Transition issue status and record admin note
 */
router.patch('/issues/:id/status', async (req, res) => {
  try {
    const { status, note, assignedTo, officer, scheduledDate } = req.body;
    const issue = await issuesRepo.getById(req.params.id);

    if (!issue) {
      return res.status(404).json({ success: false, error: 'Issue not found.' });
    }

    if (!['Reported', 'In Progress', 'Resolved', 'Reopened', 'Pending Review'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status term.',
      });
    }

    if (!isValidStatusTransition(issue.status, status)) {
      return res.status(400).json({
        success: false,
        error: `Cannot transition status directly from "${issue.status}" to "${status}".`,
      });
    }

    const updated = await issuesRepo.updateStatus(
      req.params.id,
      status,
      note,
      req.user.name || 'Municipal Admin',
      { assignedTo, officer, scheduledDate }
    );

    return res.json({
      success: true,
      message: `Issue status updated to ${status}.`,
      issue: updated,
    });
  } catch (err) {
    console.error('[AdminRoutes Error]', err);
    return res.status(500).json({ success: false, error: 'An unexpected internal server error occurred. Please try again later.' });
  }
});

/**
 * PATCH /api/admin/issues/:id/override
 * Override AI classification and assign department
 */
router.patch('/issues/:id/override', async (req, res) => {
  try {
    const { isValid, errors, data } = validateAdminOverride(req.body);
    if (!isValid) {
      const firstError = Object.values(errors).find((v) => typeof v === 'string') || 'Invalid override parameters.';
      return res.status(400).json({ success: false, error: firstError, errors });
    }

    const updated = await issuesRepo.overrideAiAnalysis(
      req.params.id,
      data,
      req.user.name || 'Municipal Admin'
    );

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Issue not found.' });
    }

    return res.json({
      success: true,
      message: 'Issue parameters overridden by admin.',
      issue: updated,
    });
  } catch (err) {
    console.error('[AdminRoutes Error]', err);
    return res.status(500).json({ success: false, error: 'An unexpected internal server error occurred. Please try again later.' });
  }
});

/**
 * DELETE /api/admin/issues/:id
 * Permanently remove an issue
 */
router.delete('/issues/:id', async (req, res) => {
  try {
    const success = await issuesRepo.delete(req.params.id);
    if (!success) {
      return res.status(404).json({ success: false, error: 'Issue not found.' });
    }
    return res.json({
      success: true,
      message: `Issue ${req.params.id} has been permanently deleted.`,
    });
  } catch (err) {
    console.error('[AdminRoutes Error]', err);
    return res.status(500).json({ success: false, error: 'An unexpected internal server error occurred. Please try again later.' });
  }
});

export default router;
