import { useEffect, useMemo } from "react";
import L from "leaflet";
import {
  Circle,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import { Link } from "react-router-dom";
import { Navigation, Shield } from "lucide-react";
import { formatLKR, resolveImageUrl } from "../services/api";

const SRI_LANKA_CENTER = [7.2906, 80.6337];

function createUniversityIcon(name) {
  return L.divIcon({
    className: "nestnear-uni-marker",
    html: `
      <div style="
        display:inline-flex;align-items:center;gap:6px;
        padding:5px 10px;border-radius:9999px;
        background:#0f172a;color:#ffffff;border:2px solid #38bdf8;
        font-size:11px;font-weight:700;white-space:nowrap;
        box-shadow:0 6px 16px rgba(15,23,42,0.35);
      ">
        <span style="color:#38bdf8;">🎓</span>
        <span>${name}</span>
      </div>
    `,
    iconSize: [160, 32],
    iconAnchor: [80, 16],
  });
}

function createPriceMarkerIcon(rent, isSelected, isAvailable) {
  const shortRent =
    rent >= 1000 ? `LKR ${(rent / 1000).toFixed(rent % 1000 === 0 ? 0 : 1)}k` : `LKR ${rent}`;
  const bg = isSelected
    ? "#0f172a"
    : isAvailable
    ? "#0f766e"
    : "#64748b";
  const border = isSelected ? "#38bdf8" : "#ffffff";
  const scale = isSelected ? "scale(1.12)" : "scale(1)";

  return L.divIcon({
    className: "nestnear-price-marker",
    html: `
      <div style="
        display:inline-flex;align-items:center;justify-content:center;
        padding:4px 9px;border-radius:9999px;
        background:${bg};color:#ffffff;border:2px solid ${border};
        font-size:11px;font-weight:700;white-space:nowrap;
        transform:${scale};transition:transform 0.15s ease;
        box-shadow:0 4px 12px rgba(15,23,42,0.28);
      ">
        ${shortRent}
      </div>
    `,
    iconSize: [76, 28],
    iconAnchor: [38, 14],
  });
}

function MapViewportUpdater({
  selectedUniversity,
  accommodations,
  selectedId,
  radiusKm,
}) {
  const map = useMap();

  // Pan to selected listing when user clicks/selects a card
  useEffect(() => {
    if (!selectedId) return;
    const item = accommodations.find((a) => a.id === selectedId);
    if (!item) return;
    const lat = item.latitude ?? item.approx_latitude;
    const lng = item.longitude ?? item.approx_longitude;
    if (lat !== null && lat !== undefined && lng !== null && lng !== undefined) {
      map.flyTo([lat, lng], Math.max(map.getZoom(), 14), { duration: 0.6 });
    }
  }, [selectedId, accommodations, map]);

  // Recenter when university or listing set changes
  useEffect(() => {
    if (
      selectedUniversity &&
      typeof selectedUniversity.latitude === "number" &&
      typeof selectedUniversity.longitude === "number"
    ) {
      const zoomForRadius =
        radiusKm <= 1
          ? 15
          : radiusKm <= 3
          ? 14
          : radiusKm <= 5
          ? 13
          : radiusKm <= 10
          ? 12
          : 13;
      map.flyTo(
        [selectedUniversity.latitude, selectedUniversity.longitude],
        zoomForRadius,
        { duration: 0.7 }
      );
      return;
    }

    const points = accommodations
      .map((a) => {
        const lat = a.latitude ?? a.approx_latitude;
        const lng = a.longitude ?? a.approx_longitude;
        return lat !== null && lat !== undefined && lng !== null && lng !== undefined
          ? [lat, lng]
          : null;
      })
      .filter(Boolean);

    if (points.length === 1) {
      map.setView(points[0], 14);
    } else if (points.length > 1) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [selectedUniversity, accommodations, radiusKm, map]);

  return null;
}

export default function AccommodationMap({
  accommodations = [],
  selectedUniversity = null,
  radiusKm = null,
  selectedId = null,
  onSelectAccommodation,
  heightClass = "h-[540px]",
  showExact = false,
}) {
  const validListings = useMemo(
    () =>
      accommodations.filter((item) => {
        const lat = showExact
          ? item.latitude ?? item.approx_latitude
          : item.approx_latitude;
        const lng = showExact
          ? item.longitude ?? item.approx_longitude
          : item.approx_longitude;
        return lat !== null && lat !== undefined && lng !== null && lng !== undefined;
      }),
    [accommodations, showExact]
  );

  const initialCenter = useMemo(() => {
    if (selectedUniversity?.latitude && selectedUniversity?.longitude) {
      return [selectedUniversity.latitude, selectedUniversity.longitude];
    }
    if (validListings.length > 0) {
      const first = validListings[0];
      return [
        (showExact ? first.latitude : null) ?? first.approx_latitude,
        (showExact ? first.longitude : null) ?? first.approx_longitude,
      ];
    }
    return SRI_LANKA_CENTER;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={`relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100 ${heightClass}`}
    >
      <MapContainer
        center={initialCenter}
        zoom={selectedUniversity ? 13 : 8}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapViewportUpdater
          selectedUniversity={selectedUniversity}
          accommodations={validListings}
          selectedId={selectedId}
          radiusKm={radiusKm}
        />

        {/* Selected University Marker + Search Radius Circle */}
        {selectedUniversity?.latitude && selectedUniversity?.longitude && (
          <>
            <Marker
              position={[
                selectedUniversity.latitude,
                selectedUniversity.longitude,
              ]}
              icon={createUniversityIcon(selectedUniversity.name)}
            >
              <Popup>
                <div className="text-xs space-y-1">
                  <p className="font-bold text-slate-900">
                    {selectedUniversity.name}
                  </p>
                  <p className="text-slate-600">
                    {selectedUniversity.town}, {selectedUniversity.district}
                  </p>
                </div>
              </Popup>
            </Marker>

            {radiusKm && Number(radiusKm) > 0 && (
              <Circle
                center={[
                  selectedUniversity.latitude,
                  selectedUniversity.longitude,
                ]}
                radius={Number(radiusKm) * 1000}
                pathOptions={{
                  color: "#0284c7",
                  fillColor: "#38bdf8",
                  fillOpacity: 0.08,
                  weight: 1.5,
                  dashArray: "6 6",
                }}
              />
            )}
          </>
        )}

        {/* Accommodation Markers */}
        {validListings.map((item) => {
          const isExactShown =
            showExact &&
            item.latitude !== null &&
            item.latitude !== undefined &&
            item.longitude !== null &&
            item.longitude !== undefined;
          const lat = isExactShown ? item.latitude : item.approx_latitude;
          const lng = isExactShown ? item.longitude : item.approx_longitude;
          const isSelected = item.id === selectedId;
          const isAvailable = item.is_available && item.available_rooms > 0;
          const imgSrc = resolveImageUrl(item.image_url);

          return (
            <div key={item.id}>
              {(isSelected || validListings.length === 1) && !isExactShown && (
                <Circle
                  center={[lat, lng]}
                  radius={260}
                  pathOptions={{
                    color: "#0f766e",
                    fillColor: "#14b8a6",
                    fillOpacity: 0.16,
                    weight: 1.5,
                  }}
                />
              )}

              <Marker
                position={[lat, lng]}
                icon={createPriceMarkerIcon(
                  item.monthly_rent,
                  isSelected,
                  isAvailable
                )}
                eventHandlers={{
                  click: () => {
                    if (onSelectAccommodation) {
                      onSelectAccommodation(item.id);
                    }
                  },
                }}
              >
                <Popup>
                  <div className="w-52 space-y-2">
                    {imgSrc && (
                      <img
                        src={imgSrc}
                        alt={item.title}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                    )}
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-teal-700">
                        {item.accommodation_type} • {item.town}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 line-clamp-1">
                        {item.title}
                      </h4>
                      {item.distance_km !== null &&
                        item.distance_km !== undefined && (
                          <p className="text-[11px] text-slate-600 flex items-center gap-1 mt-0.5">
                            <Navigation className="w-3 h-3 text-teal-700" />~
                            {item.distance_km} km from campus
                          </p>
                        )}
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs font-extrabold text-teal-800">
                          {formatLKR(item.monthly_rent)}/mo
                        </span>
                        <Link
                          to={`/accommodations/${item.id}`}
                          className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-900 text-white hover:bg-slate-800"
                        >
                          View
                        </Link>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            </div>
          );
        })}
      </MapContainer>

      {/* Privacy Legend Overlay */}
      <div className="absolute bottom-3 left-3 z-20 bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs flex items-center gap-1.5 text-[11px] text-slate-600">
        <Shield className="w-3.5 h-3.5 text-teal-700 shrink-0" />
        <span>
          {showExact
            ? "Exact authorized property location"
            : "Approximate neighborhood locations shown for privacy"}
        </span>
      </div>
    </div>
  );
}
