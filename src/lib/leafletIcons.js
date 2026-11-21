import L from 'leaflet';

/**
 * Creates custom accessible SVG Leaflet DivIcons with distinct shapes and colors.
 * - Critical: Red Octagon (Alert / Hazard)
 * - High: Orange Diamond (Warning)
 * - Medium: Blue Circle / Hexagon (Standard Civic Work)
 * - Low: Slate Teardrop (Cosmetic)
 * - Resolved: Green Shield with Checkmark
 */

export function createCivicMarkerIcon(priority, status) {
  // If resolved, always use the Green Shield with Checkmark
  if (status === 'Resolved') {
    const svg = `
      <svg width="34" height="42" viewBox="0 0 34 42" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Resolved Issue Marker: Green Shield">
        <filter id="shadow" x="0" y="0" width="34" height="42" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.3"/>
        </filter>
        <g filter="url(#shadow)">
          <path d="M17 38L8 28C4 23 4 13 4 8L17 3L30 8C30 13 30 23 26 28L17 38Z" fill="#1E8E3E" stroke="#FFFFFF" stroke-width="2"/>
          <path d="M11 17L15 21L23 13" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </g>
      </svg>
    `;
    return L.divIcon({
      className: 'civic-marker-wrapper',
      html: svg,
      iconSize: [34, 42],
      iconAnchor: [17, 40],
      popupAnchor: [0, -36],
    });
  }

  // Critical: Red Octagon with Exclamation Alert
  if (priority === 'Critical') {
    const svg = `
      <svg width="34" height="42" viewBox="0 0 34 42" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Critical Priority Marker: Red Octagon">
        <filter id="shadow-crit" x="0" y="0" width="34" height="42" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.35"/>
        </filter>
        <g filter="url(#shadow-crit)">
          <polygon points="11,2 23,2 31,10 31,22 23,30 17,38 11,30 3,22 3,10" fill="#D93025" stroke="#FFFFFF" stroke-width="2"/>
          <line x1="17" y1="9" x2="17" y2="19" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/>
          <circle cx="17" cy="24" r="1.5" fill="#FFFFFF"/>
        </g>
      </svg>
    `;
    return L.divIcon({
      className: 'civic-marker-wrapper',
      html: svg,
      iconSize: [34, 42],
      iconAnchor: [17, 40],
      popupAnchor: [0, -36],
    });
  }

  // High: Orange Diamond
  if (priority === 'High') {
    const svg = `
      <svg width="34" height="42" viewBox="0 0 34 42" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="High Priority Marker: Orange Diamond">
        <filter id="shadow-high" x="0" y="0" width="34" height="42" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.3"/>
        </filter>
        <g filter="url(#shadow-high)">
          <path d="M17 2L31 16L17 38L3 16L17 2Z" fill="#E8710A" stroke="#FFFFFF" stroke-width="2"/>
          <circle cx="17" cy="16" r="3.5" fill="#FFFFFF"/>
        </g>
      </svg>
    `;
    return L.divIcon({
      className: 'civic-marker-wrapper',
      html: svg,
      iconSize: [34, 42],
      iconAnchor: [17, 40],
      popupAnchor: [0, -36],
    });
  }

  // Medium: Blue Circle Pin
  if (priority === 'Medium') {
    const svg = `
      <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Medium Priority Marker: Blue Circle">
        <filter id="shadow-med" x="0" y="0" width="32" height="40" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.25"/>
        </filter>
        <g filter="url(#shadow-med)">
          <path d="M16 2C8.27 2 2 8.27 2 16C2 26 16 38 16 38C16 38 30 26 30 16C30 8.27 23.73 2 16 2Z" fill="#1A73E8" stroke="#FFFFFF" stroke-width="2"/>
          <circle cx="16" cy="15" r="4.5" fill="#FFFFFF"/>
        </g>
      </svg>
    `;
    return L.divIcon({
      className: 'civic-marker-wrapper',
      html: svg,
      iconSize: [32, 40],
      iconAnchor: [16, 38],
      popupAnchor: [0, -34],
    });
  }

  // Low: Gray / Slate Pill Pin
  const svg = `
    <svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Low Priority Marker: Slate Pin">
      <filter id="shadow-low" x="0" y="0" width="28" height="36" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" flood-color="#000" flood-opacity="0.2"/>
      </filter>
      <g filter="url(#shadow-low)">
        <path d="M14 2C7.37 2 2 7.37 2 14C2 22 14 34 14 34C14 34 26 22 26 14C26 7.37 20.63 2 14 2Z" fill="#5F6368" stroke="#FFFFFF" stroke-width="1.8"/>
        <circle cx="14" cy="14" r="3.5" fill="#FFFFFF"/>
      </g>
    </svg>
  `;
  return L.divIcon({
    className: 'civic-marker-wrapper',
    html: svg,
    iconSize: [28, 36],
    iconAnchor: [14, 34],
    popupAnchor: [0, -30],
  });
}
