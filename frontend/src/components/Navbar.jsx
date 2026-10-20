import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Compass, Home, LogOut, Menu, PlusCircle, User, X } from "lucide-react";
import { useAuth } from "../services/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    await logout();
    setMenuOpen(false);
    navigate("/");
  }

  const navLinkClass = ({ isActive }) =>
    `inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
      isActive
        ? "bg-teal-700 text-white"
        : "text-slate-200 hover:bg-slate-800 hover:text-white"
    }`;

  return (
    <header className="bg-slate-900 text-white shadow-xs sticky top-0 z-40 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Simple NestNear Text Logo */}
          <Link
            to="/"
            className="flex items-center gap-2.5 text-xl font-extrabold tracking-tight text-white"
            onClick={() => setMenuOpen(false)}
          >
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-teal-600 text-white font-black shadow-xs">
              N
            </span>
            <span>
              Nest<span className="text-teal-400">Near</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1.5">
            <NavLink to="/" end className={navLinkClass}>
              <Home className="w-4 h-4" />
              <span>Home</span>
            </NavLink>
            <NavLink to="/accommodations" className={navLinkClass}>
              <Compass className="w-4 h-4" />
              <span>Find Accommodation</span>
            </NavLink>

            {user?.role === "student" && (
              <>
                <NavLink to="/student/dashboard" className={navLinkClass}>
                  Student Dashboard
                </NavLink>
                <NavLink to="/student/bookings" className={navLinkClass}>
                  My Bookings
                </NavLink>
              </>
            )}

            {user?.role === "owner" && (
              <>
                <NavLink to="/owner/dashboard" className={navLinkClass}>
                  Owner Dashboard
                </NavLink>
                <NavLink
                  to="/owner/accommodations/new"
                  className={navLinkClass}
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Add Listing</span>
                </NavLink>
                <NavLink to="/owner/bookings" className={navLinkClass}>
                  Booking Requests
                </NavLink>
              </>
            )}
          </nav>

          {/* Right side Auth Controls */}
          <div className="hidden md:flex items-center gap-3">
            {!user ? (
              <>
                <NavLink
                  to="/login"
                  className="px-3.5 py-2 rounded-xl text-sm font-medium text-slate-200 hover:bg-slate-800"
                >
                  Login
                </NavLink>
                <NavLink
                  to="/register"
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-teal-600 text-white hover:bg-teal-500 transition-colors"
                >
                  Register
                </NavLink>
              </>
            ) : (
              <div className="flex items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 text-xs bg-slate-800 text-slate-200 px-3 py-1.5 rounded-full border border-slate-700 capitalize">
                  <User className="w-3.5 h-3.5 text-teal-400" />
                  {user.full_name} ({user.role})
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="md:hidden inline-flex items-center justify-center p-2 rounded-xl text-slate-200 hover:text-white hover:bg-slate-800"
            aria-label="Toggle navigation menu"
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {menuOpen && (
        <div className="md:hidden bg-slate-900 border-t border-slate-800 px-4 pt-2 pb-4 space-y-1">
          <NavLink
            to="/"
            end
            onClick={() => setMenuOpen(false)}
            className="block px-3 py-2 rounded-xl text-base font-medium text-white hover:bg-slate-800"
          >
            Home
          </NavLink>
          <NavLink
            to="/accommodations"
            onClick={() => setMenuOpen(false)}
            className="block px-3 py-2 rounded-xl text-base font-medium text-white hover:bg-slate-800"
          >
            Find Accommodation
          </NavLink>

          {user?.role === "student" && (
            <>
              <NavLink
                to="/student/dashboard"
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-2 rounded-xl text-base font-medium text-white hover:bg-slate-800"
              >
                Student Dashboard
              </NavLink>
              <NavLink
                to="/student/bookings"
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-2 rounded-xl text-base font-medium text-white hover:bg-slate-800"
              >
                My Bookings
              </NavLink>
            </>
          )}

          {user?.role === "owner" && (
            <>
              <NavLink
                to="/owner/dashboard"
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-2 rounded-xl text-base font-medium text-white hover:bg-slate-800"
              >
                Owner Dashboard
              </NavLink>
              <NavLink
                to="/owner/accommodations/new"
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-2 rounded-xl text-base font-medium text-white hover:bg-slate-800"
              >
                Add Listing
              </NavLink>
              <NavLink
                to="/owner/bookings"
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-2 rounded-xl text-base font-medium text-white hover:bg-slate-800"
              >
                Booking Requests
              </NavLink>
            </>
          )}

          <div className="pt-2 border-t border-slate-800">
            {!user ? (
              <div className="flex flex-col gap-2">
                <NavLink
                  to="/login"
                  onClick={() => setMenuOpen(false)}
                  className="block px-3 py-2 rounded-xl text-base font-medium text-slate-200 hover:bg-slate-800"
                >
                  Login
                </NavLink>
                <NavLink
                  to="/register"
                  onClick={() => setMenuOpen(false)}
                  className="block px-3 py-2 rounded-xl text-base font-semibold bg-teal-600 text-white text-center"
                >
                  Register
                </NavLink>
              </div>
            ) : (
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-sm text-slate-300">
                  {user.full_name} ({user.role})
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-3 py-1.5 rounded-xl text-sm font-medium bg-slate-800 text-white"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
