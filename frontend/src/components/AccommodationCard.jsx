import { Link } from "react-router-dom";
import {
  ArrowRight,
  BedDouble,
  GraduationCap,
  MapPin,
  Navigation,
  Users,
} from "lucide-react";
import { formatLKR, resolveImageUrl } from "../services/api";
import StatusBadge from "./StatusBadge";

export default function AccommodationCard({
  accommodation,
  selected = false,
  onSelect,
}) {
  const imageSrc = resolveImageUrl(accommodation.image_url);
  const isAvailable =
    accommodation.is_available && accommodation.available_rooms > 0;
  const hasDistance =
    accommodation.distance_km !== null &&
    accommodation.distance_km !== undefined;

  return (
    <div
      id={`accommodation-card-${accommodation.id}`}
      onClick={() => onSelect && onSelect(accommodation.id)}
      onMouseEnter={() => onSelect && onSelect(accommodation.id)}
      className={`bg-white rounded-2xl border transition-all overflow-hidden flex flex-col ${
        onSelect ? "cursor-pointer" : ""
      } ${
        selected
          ? "border-teal-600 ring-2 ring-teal-500/30 shadow-md"
          : "border-slate-200 shadow-xs hover:shadow-md hover:border-slate-300"
      }`}
    >
      {/* Photo */}
      <div className="relative h-48 bg-slate-100 overflow-hidden">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={accommodation.title}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
            No Photo Available
          </div>
        )}
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-900/85 text-white backdrop-blur-xs">
            {accommodation.accommodation_type}
          </span>
          {hasDistance && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-teal-700/95 text-white backdrop-blur-xs">
              <Navigation className="w-3 h-3" />~{accommodation.distance_km} km
            </span>
          )}
        </div>
        <div className="absolute top-3 right-3">
          <StatusBadge status={isAvailable ? "Available" : "Not Available"} />
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <p className="text-xs font-semibold text-teal-700 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span>
              {accommodation.town}, {accommodation.district}
            </span>
          </p>
          <h3 className="mt-1 text-base font-bold text-slate-900 line-clamp-1">
            {accommodation.title}
          </h3>
          <p className="mt-1 text-xs text-slate-600 flex items-center gap-1.5 line-clamp-1">
            <GraduationCap className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{accommodation.nearby_university}</span>
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <BedDouble className="w-3.5 h-3.5 text-slate-400" />
              Rooms:{" "}
              <strong className="text-slate-700">
                {accommodation.available_rooms}
              </strong>
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              Gender:{" "}
              <strong className="text-slate-700">
                {accommodation.gender_preference}
              </strong>
            </span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-lg font-extrabold text-slate-900">
              {formatLKR(accommodation.monthly_rent)}
            </span>
            <span className="text-xs text-slate-500"> / month</span>
          </div>
          <Link
            to={`/accommodations/${accommodation.id}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-teal-700 text-white hover:bg-teal-800 transition-colors"
          >
            <span>View Details</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
