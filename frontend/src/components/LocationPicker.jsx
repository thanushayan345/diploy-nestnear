import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import {
  Circle,
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import {
  Compass,
  GraduationCap,
  LocateFixed,
  MapPin,
  Search,
  ShieldCheck,
} from "lucide-react";

const DEFAULT_SRI_LANKA_CENTER = [6.9271, 79.8612]; // Colombo

// Custom draggable owner pin icon
const ownerPinIcon = L.divIcon({
  className: "custom-owner-pin",
  html: `
    <div style="
      display:flex;align-items:center;justify-content:center;
      width:36px;height:36px;border-radius:9999px;
      background:#0f766e;color:#ffffff;border:3px solid #ffffff;
      box-shadow:0 6px 16px rgba(15,23,42,0.35);
    ">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 34],
});

const campusPinIcon = L.divIcon({
  className: "custom-campus-pin",
  html: `
    <div style="
      display:flex;align-items:center;justify-content:center;
      width:32px;height:32px;border-radius:9999px;
      background:#1e293b;color:#38bdf8;border:2px solid #ffffff;
      box-shadow:0 4px 12px rgba(15,23,42,0.3);
    ">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
        <path d="M6 12v5c3 3 9 3 12 0v-5"/>
      </svg>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

function MapClickAndViewHandler({ targetView, onSelectCoords }) {
  const map = useMap();

  useEffect(() => {
    if (
      targetView &&
      typeof targetView.lat === "number" &&
      typeof targetView.lng === "number"
    ) {
      map.flyTo([targetView.lat, targetView.lng], targetView.zoom || 15, {
        duration: 0.7,
      });
    }
  }, [map, targetView]);

  useMapEvents({
    click(event) {
      const lat = Number(event.latlng.lat.toFixed(6));
      const lng = Number(event.latlng.lng.toFixed(6));
      onSelectCoords(lat, lng);
    },
  });

  return null;
}

function snapToApproxGrid(value) {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  if (Number.isNaN(num)) return null;
  return Number((Math.round(num / 0.004) * 0.004).toFixed(4));
}

export default function LocationPicker({
  latitude,
  longitude,
  onChange,
  nearbyUniversity,
  universityDetails = [],
  error,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [geoMessage, setGeoMessage] = useState("");
  const [geoLoading, setGeoLoading] = useState(false);
  const [targetView, setTargetView] = useState(null);
  const markerRef = useRef(null);

  const selectedUniversityMeta = useMemo(
    () =>
      universityDetails.find((u) => u.name === nearbyUniversity) || null,
    [universityDetails, nearbyUniversity]
  );

  const hasValidCoords =
    latitude !== "" &&
    longitude !== "" &&
    latitude !== null &&
    longitude !== null &&
    !Number.isNaN(Number(latitude)) &&
    !Number.isNaN(Number(longitude));

  const latNum = hasValidCoords ? Number(latitude) : null;
  const lngNum = hasValidCoords ? Number(longitude) : null;

  const approxLat = snapToApproxGrid(latNum);
  const approxLng = snapToApproxGrid(lngNum);

  const initialCenter = useMemo(() => {
    if (latNum !== null && lngNum !== null) {
      return [latNum, lngNum];
    }
    if (selectedUniversityMeta) {
      return [
        selectedUniversityMeta.latitude,
        selectedUniversityMeta.longitude,
      ];
    }
    return DEFAULT_SRI_LANKA_CENTER;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced OpenStreetMap Nominatim search scoped to Sri Lanka
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 3) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=lk&limit=5&q=${encodeURIComponent(
          trimmed
        )}`;
        const res = await fetch(url, {
          headers: { Accept: "application/json" },
        });
        if (res.ok) {
          const data = await res.json();
          setSearchResults(Array.isArray(data) ? data : []);
        }
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  function handleSelectPoint(lat, lng, zoom = 16) {
    setGeoMessage("");
    onChange(String(lat), String(lng));
    setTargetView({ lat, lng, zoom, ts: Date.now() });
  }

  function handleChooseSearchResult(item) {
    const lat = Number(parseFloat(item.lat).toFixed(6));
    const lng = Number(parseFloat(item.lon).toFixed(6));
    setSearchResults([]);
    setSearchQuery(item.display_name.split(",").slice(0, 2).join(", "));
    handleSelectPoint(lat, lng, 16);
  }

  function handleCenterOnUniversity() {
    if (!selectedUniversityMeta) return;
    const { latitude: uLat, longitude: uLng } = selectedUniversityMeta;
    setTargetView({ lat: uLat, lng: uLng, zoom: 15, ts: Date.now() });
    if (!hasValidCoords) {
      onChange(String(uLat), String(uLng));
    }
  }

  // Geolocation requested ONLY when the owner clicks "Use My Location"
  function handleUseMyLocation() {
    if (!navigator.geolocation) {
      setGeoMessage("Geolocation is not supported by your browser.");
      return;
    }
    setGeoLoading(true);
    setGeoMessage("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLoading(false);
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        handleSelectPoint(lat, lng, 16);
      },
      (err) => {
        setGeoLoading(false);
        if (err.code === 1) {
          setGeoMessage(
            "Location permission was denied. You can search for a town or click directly on the map."
          );
        } else {
          setGeoMessage(
            "Could not detect your current location. Please click on the map to place the pin."
          );
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  const markerEventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker) {
          const pos = marker.getLatLng();
          onChange(
            String(Number(pos.lat.toFixed(6))),
            String(Number(pos.lng.toFixed(6)))
          );
        }
      },
    }),
    [onChange]
  );

  return (
    <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-teal-700" />
            Pin Property Location on Map *
          </h3>
          <p className="mt-0.5 text-xs text-slate-600">
            Search for a town or landmark, click anywhere on the map to drop the
            pin, or drag the marker to fine-tune.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selectedUniversityMeta && (
            <button
              type="button"
              onClick={handleCenterOnUniversity}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <GraduationCap className="w-3.5 h-3.5 text-teal-700" />
              Jump to {selectedUniversityMeta.town} Campus
            </button>
          )}
          <button
            type="button"
            onClick={handleUseMyLocation}
            disabled={geoLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 disabled:opacity-60 cursor-pointer"
          >
            <LocateFixed className="w-3.5 h-3.5" />
            {geoLoading ? "Locating..." : "Use My Location"}
          </button>
        </div>
      </div>

      {/* Place / Town Search Input */}
      <div className="relative">
        <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-300 px-3 py-2 focus-within:border-teal-600">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search town, suburb, landmark, or university in Sri Lanka..."
            className="w-full text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
          />
          {searching && (
            <span className="text-xs text-slate-400 shrink-0">
              Searching...
            </span>
          )}
        </div>

        {searchResults.length > 0 && (
          <ul className="absolute left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-lg z-30 divide-y divide-slate-100 max-h-56 overflow-y-auto">
            {searchResults.map((item) => (
              <li
                key={item.place_id}
                onClick={() => handleChooseSearchResult(item)}
                className="px-3.5 py-2.5 text-xs text-slate-700 hover:bg-teal-50 hover:text-teal-900 cursor-pointer flex items-center gap-2"
              >
                <Compass className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                <span className="truncate">{item.display_name}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {geoMessage && (
        <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
          {geoMessage}
        </div>
      )}

      {/* Interactive Map */}
      <div className="h-72 sm:h-80 rounded-xl overflow-hidden border border-slate-300 shadow-inner relative">
        <MapContainer
          center={initialCenter}
          zoom={hasValidCoords ? 15 : 13}
          scrollWheelZoom={true}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapClickAndViewHandler
            targetView={targetView}
            onSelectCoords={(lat, lng) => onChange(String(lat), String(lng))}
          />

          {/* Reference Campus Marker */}
          {selectedUniversityMeta && (
            <Marker
              position={[
                selectedUniversityMeta.latitude,
                selectedUniversityMeta.longitude,
              ]}
              icon={campusPinIcon}
            />
          )}

          {/* Owner's Draggable Exact Pin + Public Approximate Zone Circle */}
          {hasValidCoords && (
            <>
              <Marker
                draggable={true}
                eventHandlers={markerEventHandlers}
                position={[latNum, lngNum]}
                ref={markerRef}
                icon={ownerPinIcon}
              />
              {approxLat !== null && approxLng !== null && (
                <Circle
                  center={[approxLat, approxLng]}
                  radius={250}
                  pathOptions={{
                    color: "#0d9488",
                    fillColor: "#14b8a6",
                    fillOpacity: 0.15,
                    weight: 1.5,
                    dashArray: "4 4",
                  }}
                />
              )}
            </>
          )}
        </MapContainer>
      </div>

      {/* Coordinate Readout & Manual Adjustment */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center pt-1">
        <div>
          <label className="block text-xs font-semibold text-slate-600">
            Latitude
          </label>
          <input
            type="number"
            step="0.000001"
            value={latitude ?? ""}
            onChange={(e) => onChange(e.target.value, longitude)}
            placeholder="e.g. 6.798200"
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-teal-600 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600">
            Longitude
          </label>
          <input
            type="number"
            step="0.000001"
            value={longitude ?? ""}
            onChange={(e) => onChange(latitude, e.target.value)}
            placeholder="e.g. 79.898600"
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-teal-600 focus:outline-none"
          />
        </div>
        <div className="p-2.5 rounded-lg bg-teal-50/80 border border-teal-200 text-xs text-teal-900 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
          <div>
            {hasValidCoords ? (
              <>
                <span className="font-semibold block">Location Pinned</span>
                <span className="text-[11px] text-teal-800">
                  Public map shows approx area ({approxLat}, {approxLng}). Exact
                  pin stays private until booking is accepted.
                </span>
              </>
            ) : (
              <span>
                Click on the map or use the search bar above to set the
                accommodation coordinates.
              </span>
            )}
          </div>
        </div>
      </div>

      {error && (
        <p className="text-xs font-medium text-red-600">{error}</p>
      )}
    </div>
  );
}
