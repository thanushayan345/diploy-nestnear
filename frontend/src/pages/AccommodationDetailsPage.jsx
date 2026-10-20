import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Armchair,
  ArrowLeft,
  Bath,
  BedDouble,
  BookOpen,
  Calendar,
  Camera,
  Car,
  CheckCircle2,
  Droplets,
  Expand,
  Fan,
  Flame,
  GraduationCap,
  Lock,
  MapPin,
  MessageSquare,
  Navigation,
  Phone,
  ShieldCheck,
  Shirt,
  UserCheck,
  Users,
  Utensils,
  Wifi,
  Wind,
  X,
  Zap,
} from "lucide-react";
import AccommodationMap from "../components/AccommodationMap";
import StatusBadge from "../components/StatusBadge";
import { useAuth } from "../services/AuthContext";
import {
  accommodationApi,
  bookingApi,
  formatLKR,
  resolveImageUrl,
} from "../services/api";

const FACILITY_ICONS = {
  "Wi-Fi": Wifi,
  "Attached Bathroom": Bath,
  Furniture: Armchair,
  "Study Table": BookOpen,
  "Kitchen Access": Utensils,
  "Meals Provided": Utensils,
  "Air Conditioning": Wind,
  Fan: Fan,
  "Water Included": Droplets,
  "Electricity Included": Zap,
  Laundry: Shirt,
  Parking: Car,
  CCTV: Camera,
  "Hot Water": Flame,
};

export default function AccommodationDetailsPage() {
  const { id } = useParams();
  const { user } = useAuth();

  const [accommodation, setAccommodation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Booking request form state
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  const [moveInDate, setMoveInDate] = useState(tomorrow);
  const [message, setMessage] = useState("");
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState("");

  async function loadDetails() {
    setLoading(true);
    setError("");
    try {
      const data = await accommodationApi.getById(id);
      setAccommodation(data.accommodation);
    } catch (err) {
      setError(err.message || "Accommodation not found.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id]);

  async function handleBookingSubmit(event) {
    event.preventDefault();
    setBookingError("");
    setBookingSuccess("");
    setBookingSubmitting(true);

    try {
      await bookingApi.create({
        accommodation_id: Number(id),
        move_in_date: moveInDate,
        message,
      });
      setBookingSuccess(
        "Your booking request has been submitted with Pending status!"
      );
      setMessage("");
      await loadDetails();
    } catch (err) {
      setBookingError(err.message || "Could not submit booking request.");
    } finally {
      setBookingSubmitting(false);
    }
  }

  async function handleCancelBooking(bookingId) {
    setBookingError("");
    try {
      await bookingApi.cancel(bookingId);
      setBookingSuccess("Your pending booking request was cancelled.");
      await loadDetails();
    } catch (err) {
      setBookingError(err.message || "Could not cancel booking request.");
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 space-y-6 animate-pulse">
        <div className="h-5 w-44 bg-slate-200 rounded" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 h-96 bg-slate-200 rounded-2xl" />
          <div className="h-80 bg-slate-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !accommodation) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-2xl border border-slate-200 p-8">
          <h2 className="text-lg font-bold text-slate-900">
            {error || "Accommodation not found"}
          </h2>
          <Link
            to="/accommodations"
            className="mt-4 inline-block px-4 py-2 rounded-xl text-sm font-semibold bg-teal-700 text-white hover:bg-teal-800"
          >
            Back to Search
          </Link>
        </div>
      </div>
    );
  }

  const imageSrc = resolveImageUrl(accommodation.image_url);
  const isAvailable =
    accommodation.is_available && accommodation.available_rooms > 0;
  const myBooking = accommodation.my_booking;
  const hasActiveBooking =
    myBooking && ["Pending", "Accepted"].includes(myBooking.status);
  const isAuthorizedExact = Boolean(
    accommodation.address && accommodation.contact_phone
  );

  const uniMeta = accommodation.university_coordinates
    ? {
        name: accommodation.nearby_university,
        town: accommodation.town,
        district: accommodation.district,
        latitude: accommodation.university_coordinates.latitude,
        longitude: accommodation.university_coordinates.longitude,
      }
    : null;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-4">
        <Link
          to="/accommodations"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700 hover:text-teal-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Accommodation Search</span>
        </Link>
      </div>

      {/* Lightbox Modal */}
      {lightboxOpen && imageSrc && (
        <div
          onClick={() => setLightboxOpen(false)}
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/15 text-white hover:bg-white/25 cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={imageSrc}
            alt={accommodation.title}
            className="max-h-[85vh] max-w-full rounded-2xl shadow-2xl object-contain"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left 2 Columns: Photo Showcase, Details, Facilities & Map */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Large Photo Gallery Header */}
            <div className="relative h-72 sm:h-96 bg-slate-100 group">
              {imageSrc ? (
                <>
                  <img
                    src={imageSrc}
                    alt={accommodation.title}
                    onClick={() => setLightboxOpen(true)}
                    className="w-full h-full object-cover cursor-zoom-in"
                  />
                  <button
                    type="button"
                    onClick={() => setLightboxOpen(true)}
                    className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-slate-900/75 text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-900 cursor-pointer"
                  >
                    <Expand className="w-3.5 h-3.5" />
                    <span>View Full Photo</span>
                  </button>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">
                  No Photo Available
                </div>
              )}

              <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-900/90 text-white backdrop-blur-xs">
                  {accommodation.accommodation_type}
                </span>
                <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-white/90 text-slate-800 backdrop-blur-xs flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-teal-700" />
                  {accommodation.gender_preference}
                </span>
              </div>

              <div className="absolute top-4 right-4">
                <StatusBadge
                  status={isAvailable ? "Available" : "Not Available"}
                />
              </div>
            </div>

            <div className="p-6 sm:p-8">
              {/* University & Distance Banner */}
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-teal-800">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200">
                  <GraduationCap className="w-3.5 h-3.5 text-teal-700" />
                  {accommodation.nearby_university}
                </span>
                {accommodation.distance_km !== null &&
                  accommodation.distance_km !== undefined && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 text-sky-900 border border-sky-200">
                      <Navigation className="w-3.5 h-3.5 text-sky-700" />~
                      {accommodation.distance_km} km from campus
                    </span>
                  )}
                <span className="inline-flex items-center gap-1 text-slate-500">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {accommodation.town}, {accommodation.district} District
                </span>
              </div>

              <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-900">
                {accommodation.title}
              </h1>

              {/* Prominent Rent, Deposit & Room Stats */}
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="block text-xs font-medium text-slate-500">
                    Monthly Rent
                  </span>
                  <span className="text-lg font-extrabold text-teal-800">
                    {formatLKR(accommodation.monthly_rent)}
                  </span>
                </div>
                <div>
                  <span className="block text-xs font-medium text-slate-500">
                    Key Money / Deposit
                  </span>
                  <span className="text-base font-bold text-slate-900">
                    {formatLKR(accommodation.deposit)}
                  </span>
                </div>
                <div>
                  <span className="block text-xs font-medium text-slate-500">
                    Available Rooms
                  </span>
                  <span className="text-base font-bold text-slate-900 inline-flex items-center gap-1">
                    <BedDouble className="w-4 h-4 text-teal-700" />
                    {accommodation.available_rooms}
                  </span>
                </div>
                <div>
                  <span className="block text-xs font-medium text-slate-500">
                    Gender Preference
                  </span>
                  <span className="text-base font-bold text-slate-900">
                    {accommodation.gender_preference}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div className="mt-6">
                <h2 className="text-base font-bold text-slate-900">
                  About This Accommodation
                </h2>
                <p className="mt-2 text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                  {accommodation.description}
                </p>
              </div>

              {/* Facilities with Icons */}
              <div className="mt-6 pt-6 border-t border-slate-100">
                <h2 className="text-base font-bold text-slate-900">
                  Included Facilities
                </h2>
                {accommodation.facilities?.length > 0 ? (
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {accommodation.facilities.map((facility) => {
                      const IconComponent =
                        FACILITY_ICONS[facility] || CheckCircle2;
                      return (
                        <div
                          key={facility}
                          className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800"
                        >
                          <IconComponent className="w-4 h-4 text-teal-700 shrink-0" />
                          <span>{facility}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">
                    No specific facilities listed.
                  </p>
                )}
              </div>

              {/* Map Section */}
              <div className="mt-6 pt-6 border-t border-slate-100 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Location & Distance to Campus
                    </h2>
                    <p className="text-xs text-slate-600">
                      {isAuthorizedExact
                        ? "Showing the exact authorized location for this property."
                        : `Approximate neighborhood in ${accommodation.town} (${
                            accommodation.distance_km
                              ? `~${accommodation.distance_km} km from ${accommodation.nearby_university}`
                              : accommodation.nearby_university
                          }).`}
                    </p>
                  </div>
                  <Link
                    to={`/accommodations?university=${encodeURIComponent(
                      accommodation.nearby_university
                    )}`}
                    className="text-xs font-semibold text-teal-700 hover:underline"
                  >
                    More near {accommodation.nearby_university} &rarr;
                  </Link>
                </div>

                {accommodation.approx_latitude !== null &&
                accommodation.approx_latitude !== undefined ? (
                  <AccommodationMap
                    accommodations={[accommodation]}
                    selectedUniversity={uniMeta}
                    selectedId={accommodation.id}
                    heightClass="h-72 sm:h-80"
                    showExact={isAuthorizedExact}
                  />
                ) : (
                  <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 text-center">
                    Map coordinates are not available for this listing.
                  </div>
                )}
              </div>

              {/* Privacy-Protected Address & Contact Section */}
              <div className="mt-6 pt-6 border-t border-slate-100">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-teal-700" />
                  <span>Exact Address & Owner Contact</span>
                </h2>
                {isAuthorizedExact ? (
                  <div className="mt-3 p-4 rounded-2xl bg-teal-50 border border-teal-200 space-y-2 text-sm text-slate-900">
                    {accommodation.owner_name && (
                      <p className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-teal-700" />
                        <span>
                          <strong>Property Owner:</strong>{" "}
                          {accommodation.owner_name}
                        </span>
                      </p>
                    )}
                    <p className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-teal-700" />
                      <span>
                        <strong>Exact Address:</strong> {accommodation.address}
                      </span>
                    </p>
                    <p className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-teal-700" />
                      <span>
                        <strong>Contact Phone:</strong>{" "}
                        <a
                          href={`tel:${accommodation.contact_phone}`}
                          className="font-bold text-teal-800 underline"
                        >
                          {accommodation.contact_phone}
                        </a>
                      </span>
                    </p>
                  </div>
                ) : (
                  <div className="mt-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5 leading-relaxed">
                    <Lock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <span>
                      For the safety and privacy of residents and property
                      owners, the exact street address, exact pin, and owner
                      phone number are revealed only after the owner{" "}
                      <strong>accepts</strong> your booking request.
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Sticky Booking Request Card */}
        <div className="lg:sticky lg:top-20 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="pb-4 border-b border-slate-100 flex items-baseline justify-between">
              <div>
                <span className="text-2xl font-extrabold text-slate-900">
                  {formatLKR(accommodation.monthly_rent)}
                </span>
                <span className="text-xs text-slate-500"> / month</span>
              </div>
              <StatusBadge
                status={isAvailable ? "Available" : "Not Available"}
              />
            </div>

            <h2 className="mt-4 text-base font-bold text-slate-900">
              Request to Book
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              Choose your preferred move-in date and send a message to the
              property owner.
            </p>

            {bookingError && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                {bookingError}
              </div>
            )}

            {bookingSuccess && (
              <div className="mt-4 p-3 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-900 font-medium">
                {bookingSuccess}
              </div>
            )}

            {/* Case 1: Current user is the owner of this listing */}
            {accommodation.is_owner ? (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-slate-700">
                  You are the owner of this accommodation listing.
                </p>
                <Link
                  to={`/owner/accommodations/${accommodation.id}/edit`}
                  className="block w-full text-center py-2.5 px-4 rounded-xl text-sm font-semibold bg-teal-700 text-white hover:bg-teal-800"
                >
                  Edit This Listing
                </Link>
              </div>
            ) : !user ? (
              /* Case 2: Visitor is not logged in */
              <div className="mt-5 space-y-3">
                <p className="text-xs text-slate-600">
                  Log in or create a free student account to send a booking
                  request for this accommodation.
                </p>
                <Link
                  to="/login"
                  state={{ from: `/accommodations/${accommodation.id}` }}
                  className="block w-full text-center py-2.5 px-4 rounded-xl text-sm font-semibold bg-teal-700 text-white hover:bg-teal-800"
                >
                  Log In to Request Booking
                </Link>
                <Link
                  to="/register"
                  className="block w-full text-center py-2.5 px-4 rounded-xl text-sm font-semibold border border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Create Student Account
                </Link>
              </div>
            ) : user.role !== "student" ? (
              /* Case 3: Logged in as another Owner */
              <div className="mt-4 p-3 rounded-xl bg-slate-100 text-xs text-slate-700">
                Only student accounts can submit booking requests.
              </div>
            ) : hasActiveBooking ? (
              /* Case 4: Student already has a Pending or Accepted booking here */
              <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">
                    Your Request Status
                  </span>
                  <StatusBadge status={myBooking.status} />
                </div>
                <p className="text-xs text-slate-700">
                  Preferred Move-In Date:{" "}
                  <strong>{myBooking.move_in_date}</strong>
                </p>
                {myBooking.status === "Pending" && (
                  <button
                    type="button"
                    onClick={() => handleCancelBooking(myBooking.id)}
                    className="w-full py-2 px-3 rounded-xl border border-red-300 text-xs font-semibold text-red-700 hover:bg-red-50 cursor-pointer"
                  >
                    Cancel Pending Request
                  </button>
                )}
                <Link
                  to="/student/bookings"
                  className="block text-center text-xs font-semibold text-teal-700 hover:underline"
                >
                  View all my booking requests &rarr;
                </Link>
              </div>
            ) : !isAvailable ? (
              /* Case 5: Listing is not available */
              <div className="mt-4 p-3 rounded-xl bg-slate-100 text-xs text-slate-700">
                This accommodation is currently full or not accepting new
                booking requests.
              </div>
            ) : (
              /* Case 6: Logged-in Student can submit a booking request */
              <form onSubmit={handleBookingSubmit} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-teal-700" />
                    <span>Preferred Move-In Date *</span>
                  </label>
                  <input
                    type="date"
                    min={new Date().toISOString().split("T")[0]}
                    value={moveInDate}
                    onChange={(e) => setMoveInDate(e.target.value)}
                    required
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-teal-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-teal-700" />
                    <span>Message to Owner</span>
                  </label>
                  <textarea
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Introduce yourself (university, year of study, how long you plan to stay)..."
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-teal-600 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={bookingSubmitting}
                  className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold bg-teal-700 text-white hover:bg-teal-800 disabled:opacity-60 transition-colors cursor-pointer shadow-xs"
                >
                  {bookingSubmitting
                    ? "Sending Request..."
                    : "Request Booking"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
