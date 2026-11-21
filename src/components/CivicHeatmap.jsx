import React from 'react';
import { Circle, Popup } from 'react-leaflet';
import { TrendingUp } from 'lucide-react';

export default function CivicHeatmap({
  localityAnalytics = [],
}) {
  return (
    <>
      {/* Density Circles Layer for Unresolved Complaints */}
      {localityAnalytics.map((loc) => {
        if (!loc.latitude || !loc.longitude) return null;
        const pending = loc.pending || 0;
        if (pending === 0) return null;

        // Radius proportional to pending concentration (min 300m, max 1200m)
        const radius = Math.min(1200, Math.max(300, pending * 250));

        let color = '#188038'; // Blue (moderate)
        let fillColor = '#188038';
        if (pending >= 4) {
          color = '#D93025'; // Red (critical hot spot)
          fillColor = '#D93025';
        } else if (pending >= 2) {
          color = '#E8710A'; // Orange (high density)
          fillColor = '#E8710A';
        }

        return (
          <Circle
            key={loc.locality}
            center={[loc.latitude, loc.longitude]}
            radius={radius}
            pathOptions={{
              color,
              fillColor,
              fillOpacity: 0.28,
              weight: 2,
            }}
          >
            <Popup>
              <div className="p-1 text-xs space-y-1">
                <strong className="text-[#202124] font-medium block">{loc.locality} Hotspot</strong>
                <p className="text-[#5F6368]">
                  <strong className="text-[#D93025] font-mono-numbers">{loc.pending}</strong> unresolved civic complaints
                </p>
                <p className="text-[10px] text-[#5F6368]">
                  Total recorded: {loc.total} • Avg resolve: {loc.avgResolveHours}h
                </p>
              </div>
            </Popup>
          </Circle>
        );
      })}
    </>
  );
}

/**
 * Ranked Locality Concentration Table
 * Doubles as the accessible text alternative to the heatmap.
 */
export function RankedLocalityTable({ localityAnalytics = [], onSelectLocality }) {
  return (
    <div className="bg-white rounded-card border border-[#DADCE0] shadow-card overflow-hidden">
      <div className="p-3 border-b border-[#DADCE0] bg-[#F8F9FA] flex items-center justify-between">
        <span className="text-xs font-medium text-[#202124] flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-[#188038]" />
          <span>Ranked Locality Concentration (Unresolved Issues)</span>
        </span>
        <span className="text-[11px] text-[#5F6368]">
          Accessible Alternative
        </span>
      </div>

      <div className="overflow-x-auto max-h-72 overflow-y-auto">
        <table className="w-full text-left text-xs" aria-label="Ranked Ward Unresolved Complaints">
          <thead className="bg-[#F8F9FA] text-[#5F6368] font-medium sticky top-0 border-b border-[#DADCE0]">
            <tr>
              <th scope="col" className="py-2.5 px-3">Ward / Locality</th>
              <th scope="col" className="py-2.5 px-3 text-center">Pending Hotspot</th>
              <th scope="col" className="py-2.5 px-3 text-center">Resolved</th>
              <th scope="col" className="py-2.5 px-3 text-right">Avg Resolve</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#DADCE0]">
            {localityAnalytics.map((loc, idx) => (
              <tr
                key={loc.locality}
                onClick={() => onSelectLocality && onSelectLocality(loc)}
                className="hover:bg-[#F8F9FA] cursor-pointer transition-colors"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSelectLocality && onSelectLocality(loc);
                }}
              >
                <td className="py-2.5 px-3 font-medium text-[#202124] flex items-center gap-2">
                  <span className="font-mono-numbers text-[10px] text-[#5F6368] w-4">
                    #{idx + 1}
                  </span>
                  <span>{loc.locality}</span>
                </td>
                <td className="py-2.5 px-3 text-center">
                  <span
                    className={`inline-block font-mono-numbers font-medium px-2 py-0.5 rounded-full text-xs ${
                      loc.pending >= 4
                        ? 'bg-[#FCE8E6] text-[#D93025]'
                        : loc.pending >= 2
                        ? 'bg-[#FEF7E0] text-[#B06000]'
                        : 'bg-[#F1F3F4] text-[#5F6368]'
                    }`}
                  >
                    {loc.pending}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-center font-mono-numbers text-[#5F6368]">
                  {loc.resolved}
                </td>
                <td className="py-2.5 px-3 text-right font-mono-numbers text-[#5F6368]">
                  {loc.avgResolveHours}h
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
