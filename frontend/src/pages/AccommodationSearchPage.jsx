import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Compass,
  Filter,
  GraduationCap,
  RotateCcw,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import AccommodationCard from "../components/AccommodationCard";
import AccommodationMap from "../components/AccommodationMap";
import MapListToggle from "../components/MapListToggle";
import UniversitySelector from "../components/UniversitySelector";
import { accommodationApi } from "../services/api";

const RADIUS_OPTIONS = [
  { label: "Any Distance", value: "" },
  { label: "Within 1 km", value: "1" },
  { label: "Within 3 km", value: "3" },
  { label: "Within 5 km", value: "5" },
  { label: "Within 10 km", value: "10" },
  { label: "Within 25 km", value: "25" },
];

const QUICK_UNIVERSITIES = [
  "University of Moratuwa",
  "University of Peradeniya",
  "University of Colombo",
  "University of Sri Jayewardenepura",
  "University of Kelaniya",
  "SLIIT",
];

function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden animate-pulse">
      <div className="h-48 bg-slate-200" />
      <div className="p-4 space-y-3">
        <div className="h-3 w-28 bg-slate-200 rounded" />
        <div className="h-4 w-3/4 bg-slate-200 rounded" />
        <div className="h-3 w-1/2 bg-slate-200 rounded" />
        <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
          <div className="h-5 w-24 bg-slate-200 rounded" />
          <div className="h-7 w-24 bg-slate-200 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export default function AccommodationSearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [options, setOptions] = useState({
    districts: [],
    universities: [],
    university_details: [],
    accommodation_types: ["Room", "Boarding House", "Annex"],
    gender_preferences: ["Any", "Male", "Female"],
  });

  const [filters, setFilters] = useState({
    university: searchParams.get("university") || "",
    radius_km: searchParams.get("radius_km") || "",
    district: searchParams.get("district") || "",
    town: searchParams.get("town") || searchParams.get("q") || "",
    type: searchParams.get("type") || "",
    gender: searchParams.get("gender") || "",
    max_rent: searchParams.get("max_rent") || "",
    available_only: searchParams.get("available_only") === "true",
    sort:
      searchParams.get("sort") ||
      (searchParams.get("university") ? "nearest" : "newest"),
  });

  const [accommodations, setAccommodations] = useState([]);
  const [selectedUniversityMeta, setSelectedUniversityMeta] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [viewMode, setViewMode] = useState("split");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    accommodationApi
      .getOptions()
      .then((data) => setOptions((prev) => ({ ...prev, ...data })))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchListings(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentUniObject = useMemo(() => {
    if (selectedUniversityMeta) return selectedUniversityMeta;
    if (!filters.university) return null;
    return (
      options.university_details?.find((u) => u.name === filters.university) ||
      null
    );
  }, [selectedUniversityMeta, filters.university, options.university_details]);

  function syncUrlParams(activeFilters) {
    const nextParams = {};
    Object.entries(activeFilters).forEach(([key, val]) => {
      if (val !== "" && val !== false && val !== null && val !== undefined) {
        nextParams[key] = String(val);
      }
    });
    setSearchParams(nextParams, { replace: true });
  }

  async function fetchListings(activeFilters) {
    setLoading(true);
    setError("");
    try {
      const data = await accommodationApi.list({
        university: activeFilters.university,
        radius_km: activeFilters.university ? activeFilters.radius_km : "",
        district: activeFilters.district,
        town: activeFilters.town,
        type: activeFilters.type,
        gender: activeFilters.gender,
        max_rent: activeFilters.max_rent,
        available_only: activeFilters.available_only ? "true" : "",
        sort: activeFilters.sort,
      });
      const list = data.accommodations || [];
      setAccommodations(list);
      setSelectedUniversityMeta(data.selected_university || null);
      if (list.length > 0) {
        setSelectedId((prev) =>
          list.some((item) => item.id === prev) ? prev : list[0].id
        );
      } else {
        setSelectedId(null);
      }
    } catch (err) {
      setError(err.message || "Could not load accommodations.");
    } finally {
      setLoading(false);
    }
  }

  function handleUniversitySelect(uniName) {
    const next = {
      ...filters,
      university: uniName,
      radius_km: uniName ? filters.radius_km || "10" : "",
      sort: uniName ? "nearest" : filters.sort,
    };
    setFilters(next);
    syncUrlParams(next);
    fetchListings(next);
  }

  function handleRadiusChange(radiusValue) {
    const next = { ...filters, radius_km: radiusValue };
    setFilters(next);
    syncUrlParams(next);
    fetchListings(next);
  }

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setFilters((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    syncUrlParams(filters);
    fetchListings(filters);
  }

  function handleReset() {
    const cleared = {
      university: "",
      radius_km: "",
      district: "",
      town: "",
      type: "",
      gender: "",
      max_rent: "",
      available_only: false,
      sort: "newest",
    };
    setFilters(cleared);
    setSearchParams({});
    fetchListings(cleared);
  }

  function handleMarkerSelect(id) {
    setSelectedId(id);
    const el = document.getElementById(`accommodation-card-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-teal-700">
            <Compass className="w-3.5 h-3.5" />
            University-Based Discovery
          </span>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-slate-900">
            Find Student Accommodation Near Your Campus
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Select your university to explore nearby rooms, boarding houses, and
            annexes on the interactive map.
          </p>
        </div>

        <MapListToggle
          viewMode={viewMode}
          onChange={setViewMode}
          count={accommodations.length}
        />
      </div>

      {/* Primary University & Filter Panel */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 mb-6 space-y-4"
      >
        {/* Top Row: Searchable University Selector + Radius Selector */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
          <div className="lg:col-span-6">
            <UniversitySelector
              label="1. Select Your University"
              universities={options.universities}
              universityDetails={options.university_details}
              value={filters.university}
              onChange={handleUniversitySelect}
              placeholder="Search university name, town, or district..."
            />
          </div>

          <div className="lg:col-span-6">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              2. Search Radius Around Campus
            </label>
            <div className="flex flex-wrap gap-1.5">
              {RADIUS_OPTIONS.map((opt) => {
                const active = filters.radius_km === opt.value;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    disabled={!filters.university && opt.value !== ""}
                    onClick={() => handleRadiusChange(opt.value)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                      active
                        ? "bg-teal-700 text-white border-teal-700 shadow-xs"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Popular University Quick Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase mr-1 flex items-center gap-1">
            <GraduationCap className="w-3.5 h-3.5 text-teal-700" />
            Popular:
          </span>
          {QUICK_UNIVERSITIES.map((uni) => {
            const isSelected = filters.university === uni;
            return (
              <button
                key={uni}
                type="button"
                onClick={() =>
                  handleUniversitySelect(isSelected ? "" : uni)
                }
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {uni}
              </button>
            );
          })}
        </div>

        {/* Secondary Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 pt-3 border-t border-slate-100 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase">
              District
            </label>
            <select
              name="district"
              value={filters.district}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm focus:border-teal-600 focus:outline-none"
            >
              <option value="">All Districts</option>
              {options.districts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase">
              Town / Suburb
            </label>
            <input
              type="text"
              name="town"
              value={filters.town}
              onChange={handleChange}
              placeholder="e.g. Katubedda, Nugegoda"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm focus:border-teal-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase">
              Max Rent (LKR)
            </label>
            <input
              type="number"
              name="max_rent"
              min="1000"
              step="500"
              value={filters.max_rent}
              onChange={handleChange}
              placeholder="e.g. 25000"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm focus:border-teal-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase">
              Property Type
            </label>
            <select
              name="type"
              value={filters.type}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm focus:border-teal-600 focus:outline-none"
            >
              <option value="">All Types</option>
              {options.accommodation_types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase">
              Gender
            </label>
            <select
              name="gender"
              value={filters.gender}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm focus:border-teal-600 focus:outline-none"
            >
              <option value="">Any Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase">
              Sort By
            </label>
            <select
              name="sort"
              value={filters.sort}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm focus:border-teal-600 focus:outline-none"
            >
              <option value="nearest">Nearest to Campus</option>
              <option value="price_asc">Lowest Rent First</option>
              <option value="price_desc">Highest Rent First</option>
              <option value="newest">Newest Listed</option>
            </select>
          </div>
        </div>

        {/* Bottom Action Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <label className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              name="available_only"
              checked={filters.available_only}
              onChange={handleChange}
              className="accent-teal-700 w-4 h-4"
            />
            <span>Show currently available rooms only</span>
          </label>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold bg-teal-700 text-white hover:bg-teal-800 cursor-pointer shadow-xs"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search</span>
            </button>
          </div>
        </div>
      </form>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Results Header Summary */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-3.5 h-3.5 text-teal-700" />
          <span>
            Showing <strong className="text-slate-900">{accommodations.length}</strong>{" "}
            accommodation{accommodations.length === 1 ? "" : "s"}
            {filters.university && (
              <>
                {" "}
                near <strong className="text-teal-800">{filters.university}</strong>
              </>
            )}
            {filters.university && filters.radius_km && (
              <> (within {filters.radius_km} km)</>
            )}
          </span>
        </div>
        {accommodations.length > 0 && (
          <span className="text-slate-400">
            Click any card or map price tag to highlight its location
          </span>
        )}
      </div>

      {/* Main Content: Side-by-Side Map & Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : accommodations.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center max-w-xl mx-auto my-6">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mx-auto">
            <Filter className="w-6 h-6" />
          </div>
          <h3 className="mt-4 text-lg font-bold text-slate-900">
            No matching accommodations found
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            {filters.university && filters.radius_km
              ? `No listings matched within ${filters.radius_km} km of ${filters.university}. Try expanding the search radius or clearing filters.`
              : "Try increasing your maximum monthly rent or clearing one of your active filters."}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {filters.university && filters.radius_km && (
              <button
                type="button"
                onClick={() => handleRadiusChange("")}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-teal-700 text-teal-800 hover:bg-teal-50 cursor-pointer"
              >
                Show Any Distance from Campus
              </button>
            )}
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-teal-700 text-white hover:bg-teal-800 cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Listings Column */}
          {viewMode !== "map" && (
            <div
              className={
                viewMode === "split"
                  ? "lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-5"
                  : "lg:col-span-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
              }
            >
              {accommodations.map((item) => (
                <AccommodationCard
                  key={item.id}
                  accommodation={item}
                  selected={item.id === selectedId}
                  onSelect={(id) => setSelectedId(id)}
                />
              ))}
            </div>
          )}

          {/* Interactive Map Column */}
          {viewMode !== "list" && (
            <div
              className={
                viewMode === "split"
                  ? "lg:col-span-5 lg:sticky lg:top-20"
                  : "lg:col-span-12"
              }
            >
              <AccommodationMap
                accommodations={accommodations}
                selectedUniversity={currentUniObject}
                radiusKm={filters.radius_km ? Number(filters.radius_km) : null}
                selectedId={selectedId}
                onSelectAccommodation={handleMarkerSelect}
                heightClass={
                  viewMode === "map" ? "h-[620px]" : "h-[420px] lg:h-[600px]"
                }
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
