import React, { useState } from 'react';
import { issuesApi } from '../lib/api.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { useToast } from '../hooks/useToast.jsx';
import {
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Loader2,
  Send,
} from 'lucide-react';

export default function ResolutionVerificationCard({
  issue,
  onIssueUpdated,
}) {
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const [feedbackNote, setFeedbackNote] = useState('');
  const [showReopenInput, setShowReopenInput] = useState(false);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  if (!issue) return null;

  const verification = issue?.verification;
  const beforeImage = issue?.imageUrl;
  const afterImage = verification?.afterImageUrl;

  const handleConfirmFixed = async () => {
    if (!isAuthenticated) {
      showToast('Please sign in to confirm repair verification.', 'error');
      return;
    }

    setSubmittingFeedback(true);
    try {
      const res = await issuesApi.submitVerificationFeedback(issue.id, {
        confirmedFixed: true,
        note: 'Citizen confirmed resolution in person on site.',
      });
      showToast(res.message, 'success');
      if (onIssueUpdated) onIssueUpdated(res.issue);
    } catch (err) {
      showToast(err.message || 'Failed to submit confirmation.', 'error');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleReopenSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      showToast('Please sign in to report a persistent civic issue.', 'error');
      return;
    }

    if (!feedbackNote.trim()) {
      showToast('Please provide a brief ground observation explaining why the defect persists.', 'error');
      return;
    }

    setSubmittingFeedback(true);
    try {
      const res = await issuesApi.submitVerificationFeedback(issue.id, {
        confirmedFixed: false,
        note: feedbackNote.trim(),
      });
      showToast(res.message, 'success');
      setShowReopenInput(false);
      setFeedbackNote('');
      if (onIssueUpdated) onIssueUpdated(res.issue);
    } catch (err) {
      showToast(err.message || 'Failed to reopen issue.', 'error');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  if (!verification && issue.status !== 'Resolved' && issue.status !== 'Reopened' && issue.status !== 'Pending Review') {
    return null;
  }

  return (
    <div className="bg-white rounded-card p-6 border border-[#DADCE0] shadow-card space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#DADCE0]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium font-heading text-[#202124] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#188038]" />
              <span>AI Resolution Verification</span>
            </span>
            {verification?.needsManualReview && (
              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#FEF7E0] text-[#B06000] border border-[#F9AB00]/40">
                Needs Manual Review
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#5F6368] mt-0.5">
            Notice: <strong className="text-[#202124]">AI assistance, not proof.</strong> Municipal administration and citizen verification make the final determination.
          </p>
        </div>

        {verification && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#5F6368]">Confidence:</span>
            <span className="font-mono-numbers font-medium text-xs text-[#188038]">
              {Math.round((verification.confidence ?? 0.85) * 100)}%
            </span>
          </div>
        )}
      </div>

      {/* Before / After Photo Comparison */}
      {(beforeImage || afterImage) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Before Photo */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-medium text-[#5F6368] uppercase tracking-wider block">
              1. Before Repair (Citizen Report)
            </span>
            <div className="h-40 rounded-lg overflow-hidden bg-[#F8F9FA] border border-[#DADCE0]">
              {beforeImage ? (
                <img
                  src={beforeImage}
                  alt="Incident before repair"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-[#5F6368]">
                  No initial photo attached
                </div>
              )}
            </div>
          </div>

          {/* After Photo */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-medium text-[#5F6368] uppercase tracking-wider block">
              2. After Repair (Municipal Work Crew)
            </span>
            <div className="h-40 rounded-lg overflow-hidden bg-[#F8F9FA] border border-[#DADCE0]">
              {afterImage ? (
                <img
                  src={afterImage}
                  alt="Site after repair completion"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-[#5F6368]">
                  Pending after-repair photo upload
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Verification Observations */}
      {verification && (
        <div className="p-3.5 rounded-lg bg-[#F8F9FA] border border-[#DADCE0] text-xs space-y-1">
          <div className="font-medium text-[#202124] flex items-center gap-1.5">
            {verification.repair_appears_complete ? (
              <CheckCircle2 className="w-4 h-4 text-[#1E8E3E]" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-[#F9AB00]" />
            )}
            <span>
              {verification.repair_appears_complete
                ? 'Visual verification indicates repair completed successfully.'
                : 'Visual verification uncertain or flags residual defects.'}
            </span>
          </div>
          <p className="text-[#5F6368] leading-relaxed pl-5">
            {verification.observations}
          </p>
        </div>
      )}

      {/* Reopened Alert */}
      {issue.status === 'Reopened' && (
        <div className="p-3.5 rounded-lg bg-[#FCE8E6] border border-[#D93025]/30 text-xs text-[#D93025] flex items-center gap-2">
          <RotateCcw className="w-4 h-4 shrink-0" />
          <span>
            This issue was <strong>Reopened</strong> following citizen feedback and returned to the department queue.
          </span>
        </div>
      )}

      {/* Citizen Feedback Actions */}
      <div className="pt-2 border-t border-[#DADCE0]">
        <span className="text-xs font-medium text-[#202124] block mb-2">
          Citizen Ground Verification:
        </span>

        {!showReopenInput ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleConfirmFixed}
              disabled={submittingFeedback}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-control text-xs font-medium text-white bg-[#1E8E3E] hover:bg-[#137333] shadow-xs transition-colors disabled:opacity-50"
            >
              {submittingFeedback ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              <span>Confirm fixed</span>
            </button>

            <button
              onClick={() => setShowReopenInput(true)}
              disabled={submittingFeedback}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-control text-xs font-medium text-[#202124] bg-white hover:bg-[#FCE8E6] hover:text-[#D93025] border border-[#DADCE0] transition-colors shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Still a problem (Reopen)</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleReopenSubmit} className="space-y-2 mt-2">
            <textarea
              rows={2}
              value={feedbackNote}
              onChange={(e) => setFeedbackNote(e.target.value)}
              placeholder="Explain what is still broken or incomplete (e.g. pothole asphalt washed away in rain, debris left on sidewalk)..."
              required
              className="w-full px-3 py-2 text-xs rounded-control border border-[#D93025]/50 bg-white text-[#202124] focus:ring-1 focus:ring-[#D93025] outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowReopenInput(false)}
                className="px-3 py-1.5 rounded-control text-xs text-[#5F6368] bg-white border border-[#DADCE0] hover:bg-[#F8F9FA]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingFeedback}
                className="px-3.5 py-1.5 rounded-control text-xs font-medium text-white bg-[#D93025] hover:bg-[#B82218] flex items-center gap-1.5"
              >
                {submittingFeedback ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Submit & Reopen Issue</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
