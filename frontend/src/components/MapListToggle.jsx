import { Columns2, List, Map } from "lucide-react";

/**
 * Responsive toggle allowing students to switch between Split View, List View, and Map View.
 */
export default function MapListToggle({ viewMode, onChange, count = 0 }) {
  return (
    <div className="inline-flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200">
      <button
        type="button"
        onClick={() => onChange("list")}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
          viewMode === "list"
            ? "bg-white text-slate-900 shadow-xs"
            : "text-slate-600 hover:text-slate-900"
        }`}
      >
        <List className="w-3.5 h-3.5 text-teal-700" />
        <span>List ({count})</span>
      </button>

      <button
        type="button"
        onClick={() => onChange("split")}
        className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
          viewMode === "split"
            ? "bg-white text-slate-900 shadow-xs"
            : "text-slate-600 hover:text-slate-900"
        }`}
      >
        <Columns2 className="w-3.5 h-3.5 text-teal-700" />
        <span>Split View</span>
      </button>

      <button
        type="button"
        onClick={() => onChange("map")}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
          viewMode === "map"
            ? "bg-white text-slate-900 shadow-xs"
            : "text-slate-600 hover:text-slate-900"
        }`}
      >
        <Map className="w-3.5 h-3.5 text-teal-700" />
        <span>Map</span>
      </button>
    </div>
  );
}
