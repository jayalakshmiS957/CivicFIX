import React from 'react';
import { Link } from 'react-router-dom';
import PriorityBadge from './PriorityBadge.jsx';
import {
  AlertTriangle,
  ThumbsUp,
  X,
  ExternalLink,
} from 'lucide-react';

export default function NearbyIssuesModal({
  isOpen,
  duplicates = [],
  onSupportExisting,
  onProceedAnyway,
  onCancel,
}) {
  if (!isOpen || duplicates.length === 0) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-in fade-in"
    >
      <div className="bg-white rounded-card max-w-lg w-full p-6 shadow-card border border-[#DADCE0] space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#FEF7E0] text-[#B06000] flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-[#B06000]" />
            </div>
            <div>
              <h3 className="text-base font-medium font-heading text-[#202124]">
                Similar Civic Issue Found
              </h3>
              <p className="text-xs text-[#5F6368]">
                A nearby open report in this category already exists within 200 meters.
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-[#5F6368] hover:text-[#202124] p-1"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Existing duplicate issue card */}
        <div className="space-y-3 max-h-72 overflow-y-auto divide-y divide-[#DADCE0]">
          {duplicates.map(({ issue, distanceMeters }) => (
            <div
              key={issue.id}
              className="p-3.5 rounded-xl bg-[#F8F9FA] border border-[#DADCE0] space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono-numbers font-medium text-xs text-[#188038]">
                  {issue.id}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono-numbers px-2 py-0.5 rounded-full bg-[#F1F3F4] text-[#5F6368]">
                    {distanceMeters}m away
                  </span>
                  <PriorityBadge priority={issue.priority} size="sm" />
                </div>
              </div>

              <h4 className="text-xs font-medium text-[#202124] leading-snug">
                {issue.title}
              </h4>

              <p className="text-[11px] text-[#5F6368] line-clamp-2">
                {issue.description}
              </p>

              <div className="pt-2 flex items-center justify-between text-[11px]">
                <span className="text-[#5F6368]">
                  {issue.location?.locality} • {issue.department}
                </span>
                <Link
                  to={`/issue/${issue.id}`}
                  target="_blank"
                  className="text-[#188038] font-medium flex items-center gap-1 hover:underline"
                >
                  <span>View Details</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-[#5F6368]">
          Supporting the existing complaint consolidates community votes into a higher Combined Planning Score, prioritizing faster dispatch.
        </p>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2 border-t border-[#DADCE0]">
          <button
            type="button"
            onClick={onProceedAnyway}
            className="w-full sm:w-auto px-4 py-2 rounded-control text-xs font-medium text-[#5F6368] bg-white border border-[#DADCE0] hover:bg-[#F8F9FA] transition-colors"
          >
            Report anyway
          </button>
          <button
            type="button"
            onClick={() => onSupportExisting(duplicates[0]?.issue?.id)}
            className="w-full sm:w-auto px-4 py-2 rounded-control text-xs font-medium text-white bg-[#188038] hover:bg-[#137333] flex items-center justify-center gap-1.5 transition-colors shadow-sm"
          >
            <ThumbsUp className="w-3.5 h-3.5" />
            <span>Support existing issue instead</span>
          </button>
        </div>
      </div>
    </div>
  );
}
