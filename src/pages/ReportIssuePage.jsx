import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { useToast } from '../hooks/useToast.jsx';
import { issuesApi } from '../lib/api.js';
import { CATEGORIES, TRY_EXAMPLES, COIMBATORE_CENTER } from '../lib/constants.js';
import { copyToClipboard } from '../lib/utils.js';
import LocationPicker from '../components/LocationPicker.jsx';
import PriorityBadge from '../components/PriorityBadge.jsx';
import NearbyIssuesModal from '../components/NearbyIssuesModal.jsx';
import VoiceAssistantModal from '../components/VoiceAssistantModal.jsx';
import {
  Sparkles,
  X,
  UploadCloud,
  Check,
  Copy,
  ExternalLink,
  Loader2,
  AlertCircle,
  HelpCircle,
  Send,
  Building,
  Activity,
  LogIn,
  Mic,
} from 'lucide-react';

export default function ReportIssuePage() {
  const { user, isAuthenticated, isAdmin } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (user && (user.role === 'admin' || isAdmin)) {
      showToast('Admins manage complaints and cannot file reports', 'error');
      navigate('/admin', { replace: true });
    }
  }, [user, isAdmin, navigate, showToast]);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Let AI decide');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [location, setLocation] = useState({
    latitude: COIMBATORE_CENTER.lat,
    longitude: COIMBATORE_CENTER.lng,
    address: 'Gandhipuram, Coimbatore, Tamil Nadu',
    locality: 'Gandhipuram',
    landmark: 'Near Central Bus Terminus',
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(null);

  // Duplicate detection state
  const [duplicateMatches, setDuplicateMatches] = useState([]);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [bypassDuplicateCheck, setBypassDuplicateCheck] = useState(false);

  // Nearby issues drawer state (500m / 1km / 5km)
  const [nearbyRadius, setNearbyRadius] = useState(1000);
  const [nearbyIssues, setNearbyIssues] = useState([]);
  const [loadingNearby, setLoadingNearby] = useState(false);

  // Follow-up answer inline state
  const [followUpAnswer, setFollowUpAnswer] = useState('');
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Guided Voice Assistant Modal State
  const [showVoiceAssistant, setShowVoiceAssistant] = useState(false);

  // Auto-fetch nearby issues whenever location or radius changes
  React.useEffect(() => {
    let active = true;
    async function fetchNearby() {
      if (!location.latitude || !location.longitude) return;
      try {
        setLoadingNearby(true);
        const res = await issuesApi.getNearby({
          latitude: location.latitude,
          longitude: location.longitude,
          radiusMeters: nearbyRadius,
        });
        if (active && res.issues) {
          setNearbyIssues(res.issues);
        }
      } catch (err) {
        console.warn('Failed to load nearby issues:', err);
      } finally {
        if (active) setLoadingNearby(false);
      }
    }
    fetchNearby();
    return () => {
      active = false;
    };
  }, [location.latitude, location.longitude, nearbyRadius]);

  const handleTryExample = () => {
    const randomExample = TRY_EXAMPLES[Math.floor(Math.random() * TRY_EXAMPLES.length)];
    setTitle(randomExample.title);
    setDescription(randomExample.description);
    setCategory(randomExample.category);
    setLocation({
      latitude: randomExample.latitude,
      longitude: randomExample.longitude,
      address: randomExample.address,
      locality: randomExample.locality,
      landmark: randomExample.landmark,
      captureMethod: 'prefill',
    });
    setErrors({});
    showToast(`Loaded example: "${randomExample.title.slice(0, 32)}..."`, 'info');
  };

  const handlePrefillFromVoice = (parsed) => {
    if (!parsed) return;
    if (parsed.title) setTitle(parsed.title);
    if (parsed.description) setDescription(parsed.description);
    if (parsed.category) setCategory(parsed.category);
    setLocation((prev) => ({
      ...prev,
      landmark: parsed.landmark || prev.landmark,
      locality: parsed.locality || prev.locality,
      address: parsed.landmark
        ? `${parsed.landmark}, ${parsed.locality || prev.locality}, Coimbatore`
        : prev.address,
    }));
    setErrors({});
    showToast(
      'Form prefilled from your voice conversation. Please review details, attach a photo if available, and submit.',
      'success'
    );
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setErrors((prev) => ({ ...prev, image: 'Only JPG, PNG, or WebP images are allowed.' }));
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, image: 'Image size must be smaller than 4 MB.' }));
      return;
    }

    setErrors((prev) => {
      const copy = { ...prev };
      delete copy.image;
      return copy;
    });

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const validate = () => {
    const newErrors = {};
    if (!title.trim() || title.length < 5 || title.length > 100) {
      newErrors.title = 'Title must be between 5 and 100 characters.';
    }
    if (!description.trim() || description.length < 20 || description.length > 1000) {
      newErrors.description = 'Description must be between 20 and 1000 characters.';
    }
    if (!location.latitude || !location.longitude) {
      newErrors.location = 'Please pick a valid location on the map or use GPS.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e, forceBypass = false) => {
    if (e) e.preventDefault();
    if (!validate()) {
      showToast('Please correct form errors before submitting.', 'error');
      return;
    }

    setSubmitting(true);

    try {
      if (!forceBypass && !bypassDuplicateCheck) {
        const dupRes = await issuesApi.checkDuplicates({
          category,
          latitude: location.latitude,
          longitude: location.longitude,
          title,
          description,
        });

        if (dupRes.duplicates && dupRes.duplicates.length > 0) {
          setDuplicateMatches(dupRes.duplicates);
          setShowDuplicateModal(true);
          setSubmitting(false);
          return;
        }
      }

      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('category', category);
      formData.append('latitude', location.latitude);
      formData.append('longitude', location.longitude);
      formData.append('address', location.address || '');
      formData.append('locality', location.locality || '');
      formData.append('landmark', location.landmark || '');
      formData.append('captureMethod', location.captureMethod || 'manual');

      if (imageFile) {
        formData.append('image', imageFile);
      }

      const response = await issuesApi.create(formData);
      setSubmissionSuccess({
        issue: response.issue,
        analysis: response.aiAnalysis,
      });
      setShowDuplicateModal(false);
      setBypassDuplicateCheck(false);
      showToast(`Complaint registered with ID ${response.issue.id}!`, 'success');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      if (err.errors) {
        setErrors(err.errors);
      } else {
        showToast(err.message || 'Failed to submit issue.', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSupportExisting = async (issueId) => {
    try {
      await issuesApi.toggleSupport(issueId);
      showToast('Supported existing complaint! Redirecting...', 'success');
      setShowDuplicateModal(false);
      navigate(`/issue/${issueId}`);
    } catch (err) {
      showToast(err.message || 'Failed to support issue.', 'error');
    }
  };

  const handleProceedAnyway = () => {
    setShowDuplicateModal(false);
    setBypassDuplicateCheck(true);
    handleSubmit(null, true);
  };

  const handleFollowUpSubmit = async (e) => {
    e.preventDefault();
    if (!followUpAnswer.trim() || !submissionSuccess?.issue?.id) return;

    setSubmittingAnswer(true);
    try {
      const res = await issuesApi.submitFollowUp(submissionSuccess.issue.id, followUpAnswer);
      setSubmissionSuccess((prev) => ({
        ...prev,
        issue: res.issue,
      }));
      setFollowUpAnswer('');
      showToast('Additional detail successfully attached to your report.', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to submit additional information.', 'error');
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const handleCopyId = async (id) => {
    const ok = await copyToClipboard(id);
    if (ok) {
      setCopiedId(true);
      showToast(`Copied ${id} to clipboard!`, 'info');
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  // If successfully submitted, display the AI Analysis Result Card
  if (submissionSuccess) {
    const { issue, analysis } = submissionSuccess;
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-card p-6 sm:p-8 border border-[#DADCE0] shadow-card space-y-8 animate-in fade-in">
          {/* Header Strip */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[#DADCE0]">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#E6F4EA] text-[#1E8E3E]">
                  Report Registered
                </span>
                {analysis?.aiSource === 'fallback' && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#FEF7E0] text-[#B06000]">
                    Rule-Based Fallback
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-medium font-heading text-[#202124] mt-1.5">
                AI Analysis Assessment
              </h1>
              <p className="text-xs text-[#5F6368] mt-0.5">
                Reported by {issue.reporter?.name} on {new Date(issue.createdAt).toLocaleString()}
              </p>
            </div>

            {/* Tracking ID with Copy Button */}
            <div className="flex items-center gap-2 bg-[#F8F9FA] p-2.5 rounded-lg border border-[#DADCE0]">
              <span className="text-xs text-[#5F6368] font-medium">Tracking ID:</span>
              <span className="font-mono-numbers font-medium text-base text-[#188038]">
                {issue.id}
              </span>
              <button
                onClick={() => handleCopyId(issue.id)}
                className="p-1.5 rounded hover:bg-[#F1F3F4] text-[#5F6368] transition-colors"
                title="Copy Tracking ID"
                aria-label="Copy tracking ID"
              >
                {copiedId ? <Check className="w-4 h-4 text-[#1E8E3E]" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* AI Analysis Card Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Urgency & Routing Badges */}
            <div className="p-5 rounded-xl bg-[#F8F9FA] border border-[#DADCE0] space-y-4">
              <div>
                <span className="text-[11px] font-medium text-[#5F6368] uppercase tracking-wider block mb-1">
                  Urgency Priority
                </span>
                <PriorityBadge priority={analysis?.priority} size="md" />
              </div>

              <div>
                <span className="text-[11px] font-medium text-[#5F6368] uppercase tracking-wider block mb-1">
                  Assigned Department
                </span>
                <div className="flex items-start gap-2 text-xs font-medium text-[#202124]">
                  <Building className="w-4 h-4 text-[#188038] shrink-0 mt-0.5" />
                  <span>{analysis?.department}</span>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-medium text-[#5F6368] uppercase tracking-wider block mb-1">
                  Categorization
                </span>
                <span className="text-xs font-medium text-[#202124]">
                  {analysis?.category}
                </span>
              </div>

              <div className="pt-2 border-t border-[#DADCE0] flex justify-between text-xs">
                <span className="text-[#5F6368]">Model Confidence:</span>
                <span className="font-mono-numbers font-medium text-[#202124]">
                  {Math.round((analysis?.confidence || 0.85) * 100)}%
                </span>
              </div>
            </div>

            {/* Severity and Impact Breakdown */}
            <div className="md:col-span-2 p-5 rounded-xl bg-white border border-[#DADCE0] shadow-sm space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-[#F8F9FA] rounded-lg border border-[#DADCE0]">
                  <div className="text-[11px] text-[#5F6368] font-medium">Severity Score</div>
                  <div className="text-2xl font-mono-numbers font-medium text-[#202124] mt-1">
                    {analysis?.severity_score}<span className="text-sm text-[#5F6368]">/100</span>
                  </div>
                </div>

                <div className="p-3 bg-[#F8F9FA] rounded-lg border border-[#DADCE0]">
                  <div className="text-[11px] text-[#5F6368] font-medium">Safety Hazard Impact</div>
                  <div className="text-2xl font-mono-numbers font-medium text-[#202124] mt-1">
                    {analysis?.safety_impact_score}<span className="text-sm text-[#5F6368]">/100</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-medium text-[#202124] uppercase tracking-wider mb-1">
                  Executive Summary
                </h4>
                <p className="text-sm text-[#5F6368] italic">
                  "{analysis?.summary}"
                </p>
              </div>

              <div>
                <h4 className="text-xs font-medium text-[#202124] uppercase tracking-wider mb-1">
                  Engineering Reasoning
                </h4>
                <p className="text-xs text-[#5F6368] leading-relaxed">
                  {analysis?.priority_reason}
                </p>
              </div>

              {analysis?.affects_accessibility && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#E6F4EA] text-xs text-[#188038] border border-[#188038]/30">
                  <Activity className="w-4 h-4 text-[#188038]" />
                  <span>Flags pedestrian, sidewalk, or wheelchair accessibility obstruction.</span>
                </div>
              )}
            </div>
          </div>

          {/* Inline Clarifying Follow-Up Questions */}
          {analysis?.follow_up_questions && analysis.follow_up_questions.length > 0 && (
            <div className="p-5 rounded-xl bg-[#FEF7E0] border border-[#F9AB00]/40 space-y-3">
              <div className="flex items-center gap-2 text-xs font-medium text-[#B06000]">
                <HelpCircle className="w-4 h-4 text-[#F9AB00]" />
                <span>AI Municipal Clarification Request</span>
              </div>
              <p className="text-xs text-[#5F6368]">
                The municipal dispatch engineer requests additional context:
              </p>
              <ul className="list-disc pl-5 text-xs text-[#202124] space-y-1">
                {analysis.follow_up_questions.map((q, idx) => (
                  <li key={idx} className="font-medium">{q}</li>
                ))}
              </ul>

              <form onSubmit={handleFollowUpSubmit} className="pt-2 flex gap-2">
                <input
                  id="clarifying-details-input"
                  aria-label="Clarifying details response"
                  type="text"
                  value={followUpAnswer}
                  onChange={(e) => setFollowUpAnswer(e.target.value)}
                  placeholder="Type clarifying details here (e.g. 'Near gate 3, supply cuts at 10 PM')..."
                  className="flex-1 px-3 py-2 text-xs rounded-control border border-[#DADCE0] bg-white text-[#202124] focus:border-[#188038] focus:ring-1 focus:ring-[#188038] outline-none"
                />
                <button
                  type="submit"
                  disabled={submittingAnswer || !followUpAnswer.trim()}
                  className="px-4 py-2 rounded-control text-xs font-medium text-white bg-[#188038] hover:bg-[#137333] disabled:opacity-50 flex items-center gap-1.5 transition-colors"
                >
                  {submittingAnswer ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Attach</span>
                </button>
              </form>
            </div>
          )}

          {/* Action CTAs */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#DADCE0]">
            <button
              onClick={() => {
                setSubmissionSuccess(null);
                setTitle('');
                setDescription('');
                setImageFile(null);
                setImagePreview(null);
              }}
              className="text-xs font-medium text-[#188038] hover:underline"
            >
              &larr; Report Another Civic Issue
            </button>

            <Link
              to={`/issue/${issue.id}`}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-control text-sm font-medium text-white bg-[#188038] hover:bg-[#137333] shadow-sm transition-colors"
            >
              <span>View Public Complaint Page</span>
              <ExternalLink className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      {/* Intro Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-medium font-heading text-[#202124]">
            Report a Civic Issue
          </h1>
          <p className="text-xs text-[#5F6368] mt-1">
            Submit a civic issue with location and photo. Gemini AI handles categorization and routing.
          </p>
        </div>

        {/* Action Buttons: Speak with assistant & Try an example */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setShowVoiceAssistant(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-control text-xs font-medium text-white bg-[#188038] hover:bg-[#137333] transition-colors shadow-xs focus:outline-none focus:ring-2 focus:ring-[#188038] focus:ring-offset-2"
          >
            <Mic className="w-4 h-4" />
            <span>Speak with assistant</span>
          </button>

          <button
            type="button"
            onClick={handleTryExample}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-control text-xs font-medium text-[#188038] bg-[#E6F4EA] hover:bg-[#CDE8D4] transition-colors shadow-2xs border border-[#188038]/20 focus:outline-none focus:ring-2 focus:ring-[#188038]"
          >
            <Sparkles className="w-4 h-4 text-[#188038]" />
            <span>Try an example</span>
          </button>
        </div>
      </div>

      {/* Unauthenticated Notification Banner */}
      {!isAuthenticated && (
        <div className="mb-6 p-4 rounded-xl bg-[#E6F4EA] border border-[#188038]/30 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-[#188038] shrink-0" />
            <p className="text-xs text-[#202124]">
              Sign in to automatically track this complaint in <strong>My Complaints</strong> and receive resolution notifications.
            </p>
          </div>
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-control text-xs font-medium text-white bg-[#188038] hover:bg-[#137333] shrink-0"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </Link>
        </div>
      )}

      {/* Form Container */}
      <form onSubmit={handleSubmit} className="bg-white rounded-card p-6 sm:p-8 border border-[#DADCE0] shadow-card space-y-6">
        {/* Issue Title */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label htmlFor="issue-title" className="text-xs font-medium text-[#202124] uppercase tracking-wider">
              Issue Title <span className="text-[#D93025]">*</span>
            </label>
            <span className="text-[11px] font-mono-numbers text-[#5F6368]">
              {title.length}/100
            </span>
          </div>
          <input
            id="issue-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Dangerous deep pothole outside Gandhipuram bus terminal"
            maxLength={100}
            required
            aria-describedby={errors.title ? 'title-error' : undefined}
            className={`w-full px-3.5 py-2.5 text-sm rounded-control border ${
              errors.title
                ? 'border-[#D93025] focus:ring-red-400'
                : 'border-[#DADCE0]'
            } bg-white text-[#202124] focus:border-[#188038] focus:ring-1 focus:ring-[#188038] outline-none`}
          />
          {errors.title && (
            <p id="title-error" className="text-xs text-[#D93025] mt-1 font-medium">
              {errors.title}
            </p>
          )}
        </div>

        {/* Category Dropdown */}
        <div>
          <label htmlFor="issue-category" className="block text-xs font-medium text-[#202124] uppercase tracking-wider mb-1">
            Category
          </label>
          <select
            id="issue-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm rounded-control border border-[#DADCE0] bg-white text-[#202124] focus:border-[#188038] focus:ring-1 focus:ring-[#188038] outline-none"
          >
            <option value="Let AI decide">Let AI decide (Recommended)</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-[#5F6368] mt-1">
            Gemini AI automatically detects the category if left as "Let AI decide".
          </p>
        </div>

        {/* Description */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label htmlFor="issue-description" className="text-xs font-medium text-[#202124] uppercase tracking-wider">
              Issue Description <span className="text-[#D93025]">*</span>
            </label>
            <span className="text-[11px] font-mono-numbers text-[#5F6368]">
              {description.length}/1000
            </span>
          </div>
          <textarea
            id="issue-description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the severity, location specifics, when it started, and whether it blocks pedestrians or vehicles (min. 20 characters)..."
            maxLength={1000}
            required
            aria-describedby={errors.description ? 'description-error' : undefined}
            className={`w-full px-3.5 py-2.5 text-sm rounded-control border ${
              errors.description
                ? 'border-[#D93025] focus:ring-red-400'
                : 'border-[#DADCE0]'
            } bg-white text-[#202124] focus:border-[#188038] focus:ring-1 focus:ring-[#188038] outline-none`}
          />
          {errors.description && (
            <p id="description-error" className="text-xs text-[#D93025] mt-1 font-medium">
              {errors.description}
            </p>
          )}
        </div>

        {/* Image Upload with Preview & Remove */}
        <div>
          <label className="block text-xs font-medium text-[#202124] uppercase tracking-wider mb-1">
            Photo Evidence (Optional - JPG, PNG, WebP up to 4 MB)
          </label>

          {imagePreview ? (
            <div className="relative inline-block mt-2 rounded-xl overflow-hidden border border-[#DADCE0] shadow-sm">
              <img
                src={imagePreview}
                alt="Selected issue evidence preview"
                className="w-56 h-36 object-cover"
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-[#D93025] text-white hover:bg-[#B82218] shadow-md transition-colors"
                aria-label="Remove uploaded image"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label
              htmlFor="image-upload"
              className="mt-1 flex flex-col items-center justify-center p-6 border-2 border-dashed border-[#DADCE0] rounded-card hover:border-[#188038] hover:bg-[#F8F9FA] cursor-pointer transition-colors"
            >
              <UploadCloud className="w-8 h-8 text-[#5F6368] mb-2" />
              <span className="text-xs font-medium text-[#188038]">
                Click or drag to upload photo
              </span>
              <span className="text-[11px] text-[#5F6368] mt-0.5">
                Gemini visually analyzes cracks, debris volume, and hazard levels
              </span>
              <input
                id="image-upload"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageChange}
                className="sr-only"
              />
            </label>
          )}

          {errors.image && (
            <p className="text-xs text-[#D93025] mt-1 font-medium">{errors.image}</p>
          )}
        </div>

        {/* Location Picker Section */}
        <div className="pt-2 border-t border-[#DADCE0]">
          <LocationPicker
            location={location}
            onChange={setLocation}
            errors={errors}
          />
        </div>

        {/* Nearby Issues Panel with 500m / 1km / 5km selector */}
        <div className="pt-4 border-t border-[#DADCE0] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-medium text-[#202124] uppercase tracking-wider block">
                Nearby Open Civic Issues
              </span>
              <p className="text-[11px] text-[#5F6368]">
                Check active complaints around your pinned coordinates to avoid duplicate reporting.
              </p>
            </div>

            {/* Radius Selector Pills */}
            <div className="flex items-center gap-1.5 bg-[#F1F3F4] p-1 rounded-lg self-start sm:self-auto">
              {[
                { label: '500 m', value: 500 },
                { label: '1 km', value: 1000 },
                { label: '5 km', value: 5000 },
              ].map((pill) => (
                <button
                  key={pill.value}
                  type="button"
                  onClick={() => setNearbyRadius(pill.value)}
                  className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                    nearbyRadius === pill.value
                      ? 'bg-white text-[#188038] shadow-xs'
                      : 'text-[#5F6368] hover:text-[#202124]'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          {loadingNearby ? (
            <div className="py-4 text-center text-xs text-[#5F6368] flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#188038]" />
              <span>Scanning open neighborhood complaints...</span>
            </div>
          ) : nearbyIssues.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto pr-1">
              {nearbyIssues.slice(0, 6).map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 rounded-lg bg-[#F8F9FA] border border-[#DADCE0] text-xs flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-mono-numbers font-medium text-[#188038]">{item.id}</span>
                    <span className="text-[10px] text-[#5F6368]">{item.distanceMeters}m away</span>
                  </div>
                  <p className="font-medium text-[#202124] line-clamp-1 mb-1">
                    {item.title}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-[#5F6368]">
                    <span>{item.category}</span>
                    <Link
                      to={`/issue/${item.id}`}
                      target="_blank"
                      className="text-[#188038] hover:underline font-medium"
                    >
                      View &rarr;
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#5F6368] italic py-2">
              No open complaints within {nearbyRadius >= 1000 ? `${nearbyRadius / 1000} km` : `${nearbyRadius} m`}. Your report will be the first!
            </p>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-4 border-t border-[#DADCE0]">
          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-control text-base font-medium text-white bg-[#188038] hover:bg-[#137333] shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Analyzing Report with Google Gemini AI...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Submit Complaint for AI Routing</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Pre-Submission Duplicate Warning Modal */}
      <NearbyIssuesModal
        isOpen={showDuplicateModal}
        duplicates={duplicateMatches}
        onSupportExisting={handleSupportExisting}
        onProceedAnyway={handleProceedAnyway}
        onCancel={() => setShowDuplicateModal(false)}
      />

      {/* Guided Voice Assistant Modal (Tamil & English) */}
      <VoiceAssistantModal
        isOpen={showVoiceAssistant}
        onClose={() => setShowVoiceAssistant(false)}
        onPrefillForm={handlePrefillFromVoice}
      />
    </div>
  );
}
