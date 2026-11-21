import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { issuesApi } from '../lib/api.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { useToast } from '../hooks/useToast.jsx';
import { copyToClipboard } from '../lib/utils.js';
import { ThumbsUp, Share2, Users, Check, Loader2, User } from 'lucide-react';

export default function CivicVoiceActions({
  issueId,
  reporterId,
  initialSupportsCount = 0,
  initialSharesCount = 0,
  initialIsSupported = false,
  communityImpactScore = 0,
  issueTitle = '',
  issueDescription = '',
}) {
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [supported, setSupported] = useState(initialIsSupported);
  const [supportsCount, setSupportsCount] = useState(initialSupportsCount);
  const [sharesCount, setSharesCount] = useState(initialSharesCount);
  const [impactScore, setImpactScore] = useState(communityImpactScore);
  const [loadingSupport, setLoadingSupport] = useState(false);
  const [sharing, setSharing] = useState(false);

  // Sync prop changes when issue loads asynchronously
  useEffect(() => {
    setSupported(Boolean(initialIsSupported));
  }, [initialIsSupported]);

  useEffect(() => {
    setSupportsCount(initialSupportsCount);
  }, [initialSupportsCount]);

  useEffect(() => {
    setSharesCount(initialSharesCount);
  }, [initialSharesCount]);

  useEffect(() => {
    setImpactScore(communityImpactScore);
  }, [communityImpactScore]);

  // Check if current authenticated user is the original reporter
  const isReporter = Boolean(
    isAuthenticated && user?.id && reporterId && String(user.id) === String(reporterId)
  );

  const redirectToLogin = () => {
    const currentUrl = `/issue/${issueId}`;
    navigate(
      `/login?returnTo=${encodeURIComponent(currentUrl)}&message=${encodeURIComponent(
        'Please sign in to support this issue'
      )}`
    );
  };

  // Support Action (1 per citizen enforced by server; owner blocked)
  const handleToggleSupport = async () => {
    if (!isAuthenticated) {
      redirectToLogin();
      return;
    }

    if (isReporter) {
      showToast('You reported this issue', 'error');
      return;
    }

    const prevSupported = supported;
    const prevSupportsCount = supportsCount;
    const prevImpactScore = impactScore;

    setLoadingSupport(true);
    try {
      if (supported) {
        const res = await issuesApi.removeSupport(issueId);
        setSupported(false);
        setSupportsCount(res.totalSupports);
        setImpactScore(res.communityImpact);
        showToast(res.message || 'Support withdrawn.', 'info');
      } else {
        const res = await issuesApi.addSupport(issueId);
        setSupported(true);
        setSupportsCount(res.totalSupports);
        setImpactScore(res.communityImpact);
        showToast(res.message || 'Support recorded for this civic issue.', 'success');
      }
    } catch (err) {
      // Revert to previous state if request fails
      setSupported(prevSupported);
      setSupportsCount(prevSupportsCount);
      setImpactScore(prevImpactScore);
      showToast(err.message || 'Failed to update support status.', 'error');
    } finally {
      setLoadingSupport(false);
    }
  };

  // Share Action: Uses Web Share API with redirect if logged out
  const handleShare = async () => {
    if (!isAuthenticated) {
      redirectToLogin();
      return;
    }

    setSharing(true);
    const shareUrl = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `CivicResolve: ${issueTitle}`,
          text: `Support this civic complaint in Coimbatore: ${issueDescription.slice(0, 100)}...`,
          url: shareUrl,
        });

        const res = await issuesApi.recordShare(issueId);
        setSharesCount(res.totalShares);
        showToast('Complaint shared successfully!', 'success');
      } catch (err) {
        if (err.name !== 'AbortError') {
          await copyToClipboard(shareUrl);
          showToast(
            'Complaint link copied to clipboard. (Share counter only increments on completed native share)',
            'info'
          );
        }
      } finally {
        setSharing(false);
      }
    } else {
      await copyToClipboard(shareUrl);
      showToast(
        'Link copied to clipboard. Note: Verified share counts only record when using native Web Share dialogs.',
        'info'
      );
      setSharing(false);
    }
  };

  return (
    <div className="bg-white rounded-xl p-4 border border-[#DADCE0] shadow-sm space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Support & Community Impact Stats */}
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[#202124] flex items-center gap-1.5">
              <Users className="w-4 h-4 text-[#188038]" />
              <span>CivicVoice Endorsement</span>
            </span>
            <span className="text-xs text-[#DADCE0]">•</span>
            <span className="text-xs text-[#5F6368]">
              Supported by{' '}
              <strong className="font-mono-numbers text-[#202124]">{supportsCount}</strong> citizens
            </span>
          </div>

          <div className="flex items-center gap-2 mt-1">
            <span className="text-[11px] text-[#5F6368]">Community Impact Score:</span>
            <span className="text-xs font-mono-numbers font-medium text-[#188038] bg-[#E6F4EA] px-2 py-0.5 rounded">
              {impactScore} / 100
            </span>
            <span className="text-[10px] text-[#5F6368]">(capped log-scale)</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Support Button */}
          <button
            type="button"
            onClick={handleToggleSupport}
            disabled={loadingSupport || isReporter}
            title={
              isReporter
                ? 'You reported this issue'
                : supported
                ? 'Withdraw your support'
                : 'Support this civic issue'
            }
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-control text-xs font-medium shadow-xs transition-colors ${
              isReporter
                ? 'bg-[#F1F3F4] text-[#80868B] border border-[#DADCE0] cursor-not-allowed'
                : supported
                ? 'bg-[#1E8E3E] text-white hover:bg-[#137333]'
                : 'bg-white text-[#188038] border border-[#DADCE0] hover:bg-[#F8F9FA]'
            }`}
            aria-pressed={supported}
            aria-disabled={isReporter}
          >
            {loadingSupport ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : isReporter ? (
              <User className="w-3.5 h-3.5 text-[#80868B]" />
            ) : supported ? (
              <Check className="w-3.5 h-3.5 text-white" />
            ) : (
              <ThumbsUp className="w-3.5 h-3.5" />
            )}
            <span>
              {isReporter
                ? 'You reported this issue'
                : supported
                ? 'Supported'
                : 'Support Issue'}
            </span>
          </button>

          {/* Share Button */}
          <button
            type="button"
            onClick={handleShare}
            disabled={sharing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-control text-xs font-medium bg-white text-[#202124] border border-[#DADCE0] hover:bg-[#F8F9FA] transition-colors shadow-xs"
            title="Share with Web Share API"
          >
            {sharing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Share2 className="w-3.5 h-3.5 text-[#188038]" />
            )}
            <span>Share ({sharesCount})</span>
          </button>
        </div>
      </div>
    </div>
  );
}
