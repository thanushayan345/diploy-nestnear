import { useEffect, useMemo, useRef, useState } from "react";
import { GraduationCap, Search, X, ChevronDown, MapPin } from "lucide-react";

/**
 * Searchable University Selector combobox with keyboard navigation.
 */
export default function UniversitySelector({
  universities = [],
  universityDetails = [],
  value = "",
  onChange,
  placeholder = "Search or select your university...",
  label = "Select University",
  compact = false,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Build normalized list of university objects
  const items = useMemo(() => {
    if (universityDetails && universityDetails.length > 0) {
      return universityDetails;
    }
    return universities.map((name) => ({
      name,
      district: "",
      town: "",
    }));
  }, [universities, universityDetails]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        (u.town && u.town.toLowerCase().includes(q)) ||
        (u.district && u.district.toLowerCase().includes(q))
    );
  }, [items, query]);

  const selectedMeta = useMemo(
    () => items.find((u) => u.name === value) || null,
    [items, value]
  );

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(uniName) {
    onChange(uniName);
    setQuery("");
    setOpen(false);
  }

  function handleClear(event) {
    event.stopPropagation();
    onChange("");
    setQuery("");
    setOpen(false);
  }

  function handleKeyDown(event) {
    if (!open && (event.key === "ArrowDown" || event.key === "Enter")) {
      event.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedIndex((prev) =>
        filtered.length > 0 ? (prev + 1) % filtered.length : 0
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((prev) =>
        filtered.length > 0
          ? (prev - 1 + filtered.length) % filtered.length
          : 0
      );
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (filtered[highlightedIndex]) {
        handleSelect(filtered[highlightedIndex].name);
      }
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
          {label}
        </label>
      )}

      <div
        onClick={() => {
          setOpen(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className={`flex items-center gap-2 w-full rounded-xl border bg-white px-3.5 ${
          compact ? "py-2" : "py-2.5"
        } text-sm transition-all cursor-pointer ${
          open
            ? "border-teal-600 ring-2 ring-teal-500/20"
            : "border-slate-300 hover:border-slate-400"
        }`}
      >
        <GraduationCap className="w-4 h-4 text-teal-700 shrink-0" />

        {open ? (
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setHighlightedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder={value || placeholder}
            className="w-full bg-transparent text-slate-900 placeholder-slate-400 focus:outline-none text-sm"
            aria-label={label || "Search university"}
          />
        ) : (
          <div
            tabIndex={0}
            onKeyDown={handleKeyDown}
            className="flex-1 truncate text-left focus:outline-none"
          >
            {value ? (
              <span className="font-medium text-slate-900">{value}</span>
            ) : (
              <span className="text-slate-400">{placeholder}</span>
            )}
            {selectedMeta?.town && (
              <span className="ml-2 text-xs text-slate-500">
                ({selectedMeta.town})
              </span>
            )}
          </div>
        )}

        {value && (
          <button
            type="button"
            onClick={handleClear}
            title="Clear university selection"
            className="p-0.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </div>

      {open && (
        <div className="absolute left-0 right-0 mt-1.5 bg-white rounded-xl border border-slate-200 shadow-xl z-50 max-h-72 overflow-y-auto">
          <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50">
            <span className="flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-teal-700" />
              Type campus name, town, or district
            </span>
            {value && (
              <button
                type="button"
                onClick={handleClear}
                className="text-teal-700 font-semibold hover:underline cursor-pointer"
              >
                Show all universities
              </button>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500">
              No Sri Lankan university matches &ldquo;{query}&rdquo;.
            </div>
          ) : (
            <ul role="listbox" className="divide-y divide-slate-100">
              {filtered.map((uni, idx) => {
                const isSelected = uni.name === value;
                const isHighlighted = idx === highlightedIndex;
                return (
                  <li
                    key={uni.name}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    onClick={() => handleSelect(uni.name)}
                    className={`px-3.5 py-2.5 text-sm flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-teal-50 text-teal-900 font-semibold"
                        : isHighlighted
                        ? "bg-slate-100 text-slate-900"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span className="truncate">{uni.name}</span>
                    {uni.town && (
                      <span className="ml-2 inline-flex items-center gap-1 text-xs text-slate-500 shrink-0">
                        <MapPin className="w-3 h-3 text-teal-600" />
                        {uni.town}, {uni.district}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
