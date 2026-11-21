import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { nominatimApi } from '../lib/api.js';
import { COIMBATORE_CENTER } from '../lib/constants.js';
import { MapPin, Navigation, Search, Loader2, AlertCircle } from 'lucide-react';

// Draggable pin marker icon
const pinIcon = L.divIcon({
  className: 'civic-marker-wrapper',
  html: `
    <svg width="34" height="42" viewBox="0 0 34 42" fill="none" xmlns="http://www.w3.org/2000/svg">
      <filter id="pin-shadow" x="0" y="0" width="34" height="42" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.25"/>
      </filter>
      <g filter="url(#pin-shadow)">
        <path d="M17 2C9.268 2 3 8.268 3 16C3 26.5 17 40 17 40C17 40 31 26.5 31 16C31 8.268 24.732 2 17 2Z" fill="#188038" stroke="#FFFFFF" stroke-width="2"/>
        <circle cx="17" cy="16" r="5" fill="#FFFFFF"/>
      </g>
    </svg>
  `,
  iconSize: [34, 42],
  iconAnchor: [17, 40],
});

/**
 * Child component to handle map clicks and programmatic center updates
 */
function MapEvents({ onPinChange }) {
  useMapEvents({
    click(e) {
      onPinChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function PanToCoordinates({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords && coords.lat && coords.lng) {
      map.flyTo([coords.lat, coords.lng], 16, { duration: 1.2 });
    }
  }, [coords, map]);
  return null;
}

export default function LocationPicker({
  location,
  onChange,
  errors = {},
}) {
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [reverseGeocoding, setReverseGeocoding] = useState(false);
  const searchTimeoutRef = useRef(null);

  const lat = location?.latitude || COIMBATORE_CENTER.lat;
  const lng = location?.longitude || COIMBATORE_CENTER.lng;

  // Handle marker drag or map click
  const handlePinUpdate = async (newLat, newLng, method = 'manual') => {
    const roundedLat = parseFloat(newLat.toFixed(6));
    const roundedLng = parseFloat(newLng.toFixed(6));

    onChange({
      ...location,
      latitude: roundedLat,
      longitude: roundedLng,
      captureMethod: method,
    });

    // Auto reverse-geocode address
    setReverseGeocoding(true);
    const geoData = await nominatimApi.reverseGeocode(roundedLat, roundedLng);
    setReverseGeocoding(false);

    if (geoData && geoData.address) {
      const road = geoData.address.road || geoData.address.suburb || '';
      const suburb = geoData.address.suburb || geoData.address.neighbourhood || geoData.address.city_district || 'Coimbatore';
      const displayName = geoData.display_name || '';

      onChange({
        latitude: roundedLat,
        longitude: roundedLng,
        address: displayName || road || location.address,
        locality: suburb || location.locality,
        landmark: location.landmark || (road ? `Near ${road}` : ''),
        captureMethod: method,
      });
    }
  };

  // Option (a): Geolocation API
  const handleCurrentLocation = () => {
    setGeoError('');
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }

    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setGeoLoading(false);
        const { latitude, longitude } = pos.coords;
        handlePinUpdate(latitude, longitude, 'gps');
      },
      (err) => {
        setGeoLoading(false);
        if (err.code === 1) {
          setGeoError('Location permission denied. You can click on the map or type a landmark below.');
        } else if (err.code === 2) {
          setGeoError('Position unavailable. Please search or pick your location on the map.');
        } else {
          setGeoError('Location request timed out. Please click a point on the map.');
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Option (c): Nominatim Search with debounce
  const handleSearchChange = (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (q.trim().length < 3) {
      setSearchResults([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setSearching(true);
      const results = await nominatimApi.searchPlace(q);
      setSearching(false);
      setSearchResults(results || []);
    }, 400);
  };

  const handleSelectSearchResult = (result) => {
    const targetLat = parseFloat(result.lat);
    const targetLng = parseFloat(result.lon);
    setSearchResults([]);
    setSearchQuery('');

    onChange({
      latitude: targetLat,
      longitude: targetLng,
      address: result.display_name,
      locality: result.address?.suburb || result.address?.neighbourhood || 'Coimbatore',
      landmark: result.address?.road || location.landmark || '',
    });
  };

  const markerPosition = useMemo(() => [lat, lng], [lat, lng]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <label className="block text-sm font-medium text-[#202124]">
            Issue Location <span className="text-[#D93025]">*</span>
          </label>
          <p className="text-xs text-[#5F6368] mt-0.5">
            Pinpoint on the map, use GPS, or search a landmark.
          </p>
        </div>

        {/* Option (a) Geolocation CTA */}
        <button
          type="button"
          onClick={handleCurrentLocation}
          disabled={geoLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-control text-xs font-medium text-[#188038] bg-[#E6F4EA] hover:bg-[#CDE8D4] transition-colors shadow-2xs disabled:opacity-50"
        >
          {geoLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Navigation className="w-3.5 h-3.5" />
          )}
          <span>Use my current location</span>
        </button>
      </div>

      {/* Geolocation denial / error banner */}
      {geoError && (
        <div
          role="alert"
          className="flex items-center gap-2 p-2.5 rounded-lg bg-[#FEF7E0] border border-[#F9AB00]/40 text-xs text-[#B06000]"
        >
          <AlertCircle className="w-4 h-4 shrink-0 text-[#F9AB00]" />
          <span>{geoError}</span>
        </div>
      )}

      {/* Option (c) Place search */}
      <div className="relative">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search neighborhood or landmark (e.g. Gandhipuram, RS Puram, PSG Tech)..."
            className="w-full pl-9 pr-9 py-2 text-xs rounded-control border border-[#DADCE0] bg-white text-[#202124] placeholder-[#5F6368] focus:border-[#188038] focus:ring-1 focus:ring-[#188038] outline-none transition-colors"
            aria-label="Search landmark or locality"
          />
          <Search className="w-4 h-4 text-[#5F6368] absolute left-3 top-2.5 pointer-events-none" />
          {searching && (
            <Loader2 className="w-4 h-4 text-[#188038] animate-spin absolute right-3 top-2.5" />
          )}
        </div>

        {searchResults.length > 0 && (
          <ul
            className="absolute z-30 left-0 right-0 mt-1 bg-white border border-[#DADCE0] rounded-lg shadow-card max-h-56 overflow-y-auto text-xs divide-y divide-[#DADCE0]"
            role="listbox"
          >
            {searchResults.map((res, i) => (
              <li
                key={i}
                onClick={() => handleSelectSearchResult(res)}
                className="px-3 py-2.5 hover:bg-[#F8F9FA] cursor-pointer flex items-start gap-2 text-[#202124]"
              >
                <MapPin className="w-3.5 h-3.5 text-[#188038] shrink-0 mt-0.5" />
                <span className="truncate">{res.display_name}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Option (b) Interactive Leaflet Map */}
      <div className="relative h-64 rounded-card overflow-hidden border border-[#DADCE0] shadow-sm">
        <MapContainer
          center={[lat, lng]}
          zoom={14}
          scrollWheelZoom={false}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapEvents onPinChange={handlePinUpdate} />
          <PanToCoordinates coords={{ lat, lng }} />
          <Marker
            position={markerPosition}
            icon={pinIcon}
            draggable={true}
            eventHandlers={{
              dragend: (e) => {
                const marker = e.target;
                const position = marker.getLatLng();
                handlePinUpdate(position.lat, position.lng);
              },
            }}
          />
        </MapContainer>

        <div className="absolute bottom-2 left-2 z-20 px-2.5 py-1 bg-white/95 backdrop-blur-xs rounded text-[11px] font-mono-numbers text-[#202124] border border-[#DADCE0] shadow-sm flex items-center gap-2">
          <MapPin className="w-3 h-3 text-[#188038]" />
          <span>{lat.toFixed(5)}, {lng.toFixed(5)}</span>
          {reverseGeocoding && <Loader2 className="w-3 h-3 animate-spin text-[#188038]" />}
        </div>
      </div>

      {/* Location Detail Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
        <div className="sm:col-span-2">
          <label htmlFor="input-address" className="block text-xs font-medium text-[#202124] mb-1">
            Street Address / Area Name
          </label>
          <input
            id="input-address"
            type="text"
            value={location.address || ''}
            onChange={(e) => onChange({ ...location, address: e.target.value })}
            placeholder="e.g. 104 Cross Cut Road, 2nd Cross"
            className="w-full px-3 py-2 text-xs rounded-control border border-[#DADCE0] bg-white text-[#202124] focus:border-[#188038] focus:ring-1 focus:ring-[#188038] outline-none"
          />
        </div>

        <div>
          <label htmlFor="input-locality" className="block text-xs font-medium text-[#202124] mb-1">
            Ward / Locality
          </label>
          <input
            id="input-locality"
            type="text"
            value={location.locality || ''}
            onChange={(e) => onChange({ ...location, locality: e.target.value })}
            placeholder="e.g. Gandhipuram"
            className="w-full px-3 py-2 text-xs rounded-control border border-[#DADCE0] bg-white text-[#202124] focus:border-[#188038] focus:ring-1 focus:ring-[#188038] outline-none"
          />
        </div>

        <div className="sm:col-span-3">
          <label htmlFor="input-landmark" className="block text-xs font-medium text-[#202124] mb-1">
            Prominent Landmark (Helps municipal crews navigate)
          </label>
          <input
            id="input-landmark"
            type="text"
            value={location.landmark || ''}
            onChange={(e) => onChange({ ...location, landmark: e.target.value })}
            placeholder="e.g. Opposite City Bus Stand Bay 3, near Nilgiris"
            className="w-full px-3 py-2 text-xs rounded-control border border-[#DADCE0] bg-white text-[#202124] focus:border-[#188038] focus:ring-1 focus:ring-[#188038] outline-none"
          />
        </div>
      </div>

      {(errors.latitude || errors.longitude) && (
        <p className="text-xs text-[#D93025] font-medium flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{errors.latitude || errors.longitude}</span>
        </p>
      )}
    </div>
  );
}
