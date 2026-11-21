import React from 'react';
import { Clock, RefreshCw, CheckCircle2, AlertCircle, Eye } from 'lucide-react';

export default function StatusChip({ status, size = 'md' }) {
  const s = status || 'Reported';

  let config = {
    bg: 'bg-[#F1F3F4]',
    text: 'text-[#5F6368]',
    border: 'border-[#DADCE0]',
    icon: <Clock className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />,
    label: 'Reported',
  };

  if (s === 'In Progress') {
    config = {
      bg: 'bg-[#FEF7E0]',
      text: 'text-[#8A4600]',
      border: 'border-[#F9AB00]/40',
      icon: <RefreshCw className={`${size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} animate-spin-slow`} />,
      label: 'In Progress',
    };
  } else if (s === 'Pending Review') {
    config = {
      bg: 'bg-[#E6F4EA]',
      text: 'text-[#0D652D]',
      border: 'border-[#188038]/30',
      icon: <Eye className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />,
      label: 'Pending Review',
    };
  } else if (s === 'Resolved') {
    config = {
      bg: 'bg-[#E6F4EA]',
      text: 'text-[#0D652D]',
      border: 'border-[#1E8E3E]/30',
      icon: <CheckCircle2 className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />,
      label: 'Resolved',
    };
  } else if (s === 'Reopened') {
    config = {
      bg: 'bg-[#FCE8E6]',
      text: 'text-[#B71C1C]',
      border: 'border-[#D93025]/30',
      icon: <AlertCircle className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />,
      label: 'Reopened',
    };
  }

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-medium';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${config.bg} ${config.text} ${config.border} ${sizeClasses}`}
    >
      {config.icon}
      <span>{config.label}</span>
    </span>
  );
}
