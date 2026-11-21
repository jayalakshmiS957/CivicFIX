import React from 'react';

export function CardSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading content"
      className="bg-white rounded-card p-5 border border-[#DADCE0] animate-pulse space-y-4 shadow-card"
    >
      <div className="flex items-center justify-between">
        <div className="h-5 bg-[#F1F3F4] rounded w-28" />
        <div className="h-5 bg-[#F1F3F4] rounded-full w-20" />
      </div>
      <div className="h-6 bg-[#F1F3F4] rounded w-3/4" />
      <div className="space-y-2">
        <div className="h-4 bg-[#F1F3F4] rounded w-full" />
        <div className="h-4 bg-[#F1F3F4] rounded w-5/6" />
      </div>
      <div className="pt-2 flex items-center justify-between border-t border-[#DADCE0]">
        <div className="h-4 bg-[#F1F3F4] rounded w-32" />
        <div className="h-4 bg-[#F1F3F4] rounded w-16" />
      </div>
    </div>
  );
}

export function TableRowSkeleton() {
  return (
    <tr className="animate-pulse border-b border-[#DADCE0]">
      <td className="py-4 px-4"><div className="h-4 bg-[#F1F3F4] rounded w-24" /></td>
      <td className="py-4 px-4"><div className="h-4 bg-[#F1F3F4] rounded w-48" /></td>
      <td className="py-4 px-4"><div className="h-5 bg-[#F1F3F4] rounded-full w-20" /></td>
      <td className="py-4 px-4"><div className="h-5 bg-[#F1F3F4] rounded-full w-20" /></td>
      <td className="py-4 px-4"><div className="h-4 bg-[#F1F3F4] rounded w-32" /></td>
      <td className="py-4 px-4"><div className="h-8 bg-[#F1F3F4] rounded w-16" /></td>
    </tr>
  );
}
