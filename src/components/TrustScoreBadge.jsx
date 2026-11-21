import React, { useState } from 'react';
import { ShieldCheck, Info, X } from 'lucide-react';

export default function TrustScoreBadge({ trustScore }) {
  const [showModal, setShowModal] = useState(false);
  const score = trustScore?.score ?? 70;
  const breakdown = trustScore?.breakdown || [];

  let badgeColor = 'bg-[#E6F4EA] text-[#188038] border-[#188038]/30';
  if (score >= 80) badgeColor = 'bg-[#E6F4EA] text-[#1E8E3E] border-[#1E8E3E]/30';
  else if (score < 50) badgeColor = 'bg-[#FEF7E0] text-[#B06000] border-[#F9AB00]/30';

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium shadow-xs hover:opacity-90 transition-opacity ${badgeColor}`}
        title="View Civic Trust Score Breakdown"
      >
        <ShieldCheck className="w-3.5 h-3.5" />
        <span>Trust: <strong className="font-mono-numbers">{score}/100</strong></span>
        <Info className="w-3 h-3 opacity-60 ml-0.5" />
      </button>

      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-in fade-in"
        >
          <div className="bg-white rounded-card max-w-md w-full p-5 shadow-card border border-[#DADCE0] space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-medium font-heading text-[#202124] flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#188038]" />
                  <span>Civic Trust Score Breakdown</span>
                </h3>
                <p className="text-xs text-[#5F6368] mt-0.5">
                  Algorithmic evidence-confidence rating: <strong className="font-mono-numbers text-[#202124]">{score} / 100</strong>
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-[#5F6368] hover:text-[#202124] p-1"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              {breakdown.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-[#F8F9FA] border border-[#DADCE0] flex items-center justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <span className="font-medium text-[#202124]">
                      {item.factor}
                    </span>
                    <p className="text-[11px] text-[#5F6368]">{item.status}</p>
                  </div>
                  <span className="font-mono-numbers font-medium text-[#202124] shrink-0">
                    +{item.points} <span className="text-[10px] text-[#5F6368] font-normal">/ {item.max}</span>
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-[#DADCE0] flex justify-end">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-1.5 rounded-control text-xs font-medium text-[#202124] bg-white border border-[#DADCE0] hover:bg-[#F8F9FA]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
