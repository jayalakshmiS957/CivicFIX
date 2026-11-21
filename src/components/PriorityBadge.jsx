import React from 'react';
import { AlertOctagon, AlertTriangle, AlertCircle, ShieldCheck } from 'lucide-react';

export default function PriorityBadge({ priority, size = 'md' }) {
  const p = priority || 'Medium';

  let config = {
    bg: 'bg-[#F9AB00]',
    text: 'text-[#202124]',
    border: 'border-[#F9AB00]',
    icon: <AlertCircle className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />,
    label: 'Medium',
  };

  if (p === 'Critical') {
    config = {
      bg: 'bg-[#D93025]',
      text: 'text-white',
      border: 'border-[#D93025]',
      icon: <AlertOctagon className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />,
      label: 'Critical',
    };
  } else if (p === 'High') {
    config = {
      bg: 'bg-[#E8710A]',
      text: 'text-white',
      border: 'border-[#E8710A]',
      icon: <AlertTriangle className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />,
      label: 'High',
    };
  } else if (p === 'Low') {
    config = {
      bg: 'bg-[#1E8E3E]',
      text: 'text-white',
      border: 'border-[#1E8E3E]',
      icon: <ShieldCheck className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />,
      label: 'Low',
    };
  }

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-medium';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${config.bg} ${config.text} ${config.border} ${sizeClasses} shadow-xs`}
    >
      {config.icon}
      <span>{config.label}</span>
    </span>
  );
}
