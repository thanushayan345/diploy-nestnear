import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  Compass,
  GraduationCap,
  MapPin,
  Search,
  ShieldCheck,
} from "lucide-react";
import AccommodationCard from "../components/AccommodationCard";
import UniversitySelector from "../components/UniversitySelector";
import { accommodationApi } from "../services/api";

export default function HomePage() {
  const navigate = useNavigate();
  const [options, setOptions] = useState({
    districts: [],
    universities: [],
    university_details: [],
  });
  const [university, setUniversity] = useState("");
  const [district, setDistrict] = useState("");
  const [maxRent, setMaxRent] = useState("");

  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    accommodationApi
      .getOptions()
      .then((data) => setOptions((prev) => ({ ...prev, ...data })))
      .catch(() => {});

    accommodationApi
      .list({ limit: 6 })
      .then((data) => setFeatured(data.accommodations || []))
      .catch((err) => setError(err.message || "Could not load accommodations."))
      .finally(() => setLoading(false));
  }, []);

  function handleSearch(event) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (university) {
      params.set("university", university);
      params.set("radius_km", "10");
      params.set("sort", "nearest");
    }
    if (district) params.set("district", district);
    if (maxRent) params.set("max_rent", maxRent);
    navigate(`/accommodations?${params.toString()}`);
  }

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 text-white py-16 md:py-22">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-semibold bg-teal-500/15 text-teal-300 border border-teal-400/25 mb-4">
              <GraduationCap className="w-4 h-4" />
              Sri Lanka University Housing Discovery
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
              Find Your Perfect Student Accommodation
            </h1>
            <p className="mt-4 text-base sm:text-lg text-slate-200 leading-relaxed">
              Select your university, explore nearby rooms, boarding houses, and
              annexes on an interactive map, compare distances and monthly rent
              in LKR, and book safely.
            </p>
          </div>

          {/* Search Form for University, District, and Maximum Monthly Rent */}
          <form
            onSubmit={handleSearch}
            className="mt-8 bg-white text-slate-900 p-4 sm:p-6 rounded-2xl shadow-xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 items-end"
          >
            <div className="lg:col-span-5">
              <UniversitySelector
                label="University"
                universities={options.universities}
                universityDetails={options.university_details}
                value={university}
                onChange={setUniversity}
                placeholder="Search or select your university..."
              />
            </div>

            <div className="lg:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                District
              </label>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-teal-600 focus:outline-none"
              >
                <option value="">All Districts</option>
                {options.districts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Max Rent (LKR)
              </label>
              <input
                type="number"
                min="1000"
                step="500"
                value={maxRent}
                onChange={(e) => setMaxRent(e.target.value)}
                placeholder="e.g. 25000"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-teal-600 focus:outline-none"
              />
            </div>

            <div className="lg:col-span-2">
              <button
                type="submit"
                className="w-full py-2.5 px-5 rounded-xl font-semibold text-sm bg-teal-700 text-white hover:bg-teal-800 transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-sm"
              >
                <Search className="w-4 h-4" />
                <span>Explore Map</span>
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Featured Accommodations Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900">
              Recent Student Accommodations
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Explore rooms, boarding houses, and annexes with verified campus
              distances.
            </p>
          </div>
          <Link
            to="/accommodations"
            className="text-sm font-semibold text-teal-700 hover:text-teal-900"
          >
            Open interactive map search &rarr;
          </Link>
        </div>

        {loading && (
          <div className="py-12 text-center text-slate-500 text-sm">
            Loading accommodations...
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && featured.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-600">
            No accommodations found yet.
          </div>
        )}

        {!loading && !error && featured.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featured.map((item) => (
              <AccommodationCard key={item.id} accommodation={item} />
            ))}
          </div>
        )}
      </section>

      {/* How NestNear Works Section */}
      <section className="bg-slate-100 py-14 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-2xl font-extrabold text-slate-900">
              How NestNear Works
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              A simple, privacy-first workflow for university students and
              property owners across Sri Lanka.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-teal-700 text-white font-bold flex items-center justify-center">
                <Compass className="w-5 h-5" />
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-900">
                1. Pick Your University & Radius
              </h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Select your campus to center the interactive map, filter by
                distance (1 km – 25 km) and budget in LKR, and compare nearby
                listings.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-teal-700 text-white font-bold flex items-center justify-center">
                <MapPin className="w-5 h-5" />
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-900">
                2. Send a Booking Request
              </h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Choose your preferred move-in date and send a message to the
                property owner. Public maps show approximate neighborhoods to
                protect resident privacy.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-teal-700 text-white font-bold flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-900">
                3. Unlock Exact Address & Move In
              </h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Once the owner accepts your request, the exact street address,
                exact pin, and owner phone number are unlocked on your
                dashboard.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
