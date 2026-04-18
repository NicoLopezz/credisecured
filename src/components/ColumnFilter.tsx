"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useRef, useEffect, useTransition, useCallback } from "react";
import { createPortal } from "react-dom";

export default function ColumnFilter({
  column,
  label,
  table,
  type = "values",
  staticOptions,
}: {
  column: string;
  label: string;
  table?: string;
  type?: "values" | "select";
  staticOptions?: { value: string; label: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const filterKey = `f_${column}`;
  const sortKey = "sort";
  const dirKey = "dir";
  const currentFilter = searchParams.get(filterKey) || "";
  const currentSort = searchParams.get(sortKey) || "";
  const currentDir = searchParams.get(dirKey) || "asc";
  const isActive = currentFilter !== "" || currentSort === column;

  const currentSelected = currentFilter ? currentFilter.split("||") : [];

  const [allValues, setAllValues] = useState<string[]>([]);
  const [filteredValues, setFilteredValues] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set(currentSelected));
  const [loading, setLoading] = useState(false);

  // Position dropdown below button and reposition on scroll/resize
  const updatePos = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const dropH = dropRef.current?.offsetHeight || 400;
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const top = spaceBelow >= dropH ? rect.bottom + 4 : rect.top - dropH - 4;
    setPos({
      top: Math.max(8, top),
      left: Math.max(8, Math.min(rect.left, window.innerWidth - 272)),
    });
  }, []);

  useEffect(() => {
    if (open) updatePos();
  }, [open, updatePos]);

  useEffect(() => {
    if (!open) return;
    function onScrollOrResize() { updatePos(); }
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open, updatePos]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropRef.current &&
        !dropRef.current.contains(e.target as Node) &&
        btnRef.current &&
        !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const fetchValues = useCallback(async () => {
    if (!table || type !== "values") return;
    setLoading(true);
    try {
      const res = await fetch(`/api/column-values?table=${table}&column=${column}`);
      const data = await res.json();
      setAllValues(data.values || []);
      setFilteredValues(data.values || []);
    } catch {
      setAllValues([]);
      setFilteredValues([]);
    }
    setLoading(false);
  }, [table, column, type]);

  useEffect(() => {
    if (open && type === "values") {
      fetchValues();
      setSelected(new Set(currentSelected));
      setSearch("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!search) {
      setFilteredValues(allValues);
    } else {
      const s = search.toLowerCase();
      setFilteredValues(allValues.filter((v) => v.toLowerCase().includes(s)));
    }
  }, [search, allValues]);

  function applyUrl(params: URLSearchParams) {
    params.delete("page");
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  }

  function handleSort(dir: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(sortKey, column);
    params.set(dirKey, dir);
    applyUrl(params);
    setOpen(false);
  }

  function handleClearAll() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(filterKey);
    if (currentSort === column) {
      params.delete(sortKey);
      params.delete(dirKey);
    }
    applyUrl(params);
    setOpen(false);
  }

  function handleApplyValues() {
    const params = new URLSearchParams(searchParams.toString());
    if (selected.size > 0 && selected.size < allValues.length) {
      params.set(filterKey, Array.from(selected).join("||"));
    } else {
      params.delete(filterKey);
    }
    applyUrl(params);
    setOpen(false);
  }

  function toggleValue(val: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(val)) next.delete(val);
      else next.add(val);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(filteredValues));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function handleSelectOption(val: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (val && currentFilter !== val) {
      params.set(filterKey, val);
    } else {
      params.delete(filterKey);
    }
    applyUrl(params);
    setOpen(false);
  }

  const [textFilter, setTextFilter] = useState(currentFilter);
  useEffect(() => {
    if (open) setTextFilter(currentFilter);
  }, [open, currentFilter]);

  function handleTextApply() {
    const params = new URLSearchParams(searchParams.toString());
    if (textFilter) {
      params.set(filterKey, textFilter);
    } else {
      params.delete(filterKey);
    }
    applyUrl(params);
    setOpen(false);
  }

  const dropdown = open
    ? createPortal(
        <div
          ref={dropRef}
          className="fixed w-64 bg-card-bg border border-border-color rounded-xl shadow-2xl z-[9999] overflow-hidden"
          style={{ top: pos.top, left: pos.left }}
        >
          {/* Sort */}
          <div className="p-2 border-b border-border-color">
            <p className="text-[10px] text-muted uppercase tracking-wider mb-1 px-2">
              Ordenar
            </p>
            <button
              onClick={() => handleSort("asc")}
              className={`w-full text-left px-3 py-1.5 text-xs rounded-lg flex items-center gap-2 transition-colors ${
                currentSort === column && currentDir === "asc"
                  ? "bg-accent/15 text-accent"
                  : "text-foreground hover:bg-sidebar-hover"
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h14.25M3 9h9.75M3 13.5h5.25m5.25-.75L17.25 9m0 0L21 12.75M17.25 9v12" />
              </svg>
              De la A a la Z
            </button>
            <button
              onClick={() => handleSort("desc")}
              className={`w-full text-left px-3 py-1.5 text-xs rounded-lg flex items-center gap-2 transition-colors ${
                currentSort === column && currentDir === "desc"
                  ? "bg-accent/15 text-accent"
                  : "text-foreground hover:bg-sidebar-hover"
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h14.25M3 9h9.75M3 13.5h9.75m4.5-4.5v12m0 0-3.75-3.75M17.25 21 21 17.25" />
              </svg>
              De la Z a la A
            </button>
          </div>

          {/* Filter */}
          <div className="p-2 border-b border-border-color">
            <p className="text-[10px] text-muted uppercase tracking-wider mb-1 px-2">
              Filtrar por valores
            </p>

            {type === "select" && staticOptions ? (
              <div className="space-y-0.5 max-h-48 overflow-y-auto">
                {staticOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleSelectOption(opt.value)}
                    className={`w-full text-left px-3 py-1.5 text-xs rounded-lg transition-colors flex items-center gap-2 ${
                      currentFilter === opt.value
                        ? "bg-accent/15 text-accent"
                        : "text-foreground hover:bg-sidebar-hover"
                    }`}
                  >
                    {currentFilter === opt.value && (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    )}
                    {opt.label}
                  </button>
                ))}
              </div>
            ) : type === "values" && table ? (
              <>
                <div className="px-1 mb-2">
                  <div className="relative">
                    <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                    </svg>
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Buscar..."
                      className="w-full bg-background border border-border-color rounded-lg pl-8 pr-3 py-1.5 text-xs text-foreground placeholder-muted focus:outline-none focus:border-accent"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between px-2 mb-1">
                  <button onClick={selectAll} className="text-[10px] text-accent hover:underline">
                    Seleccionar todos ({filteredValues.length})
                  </button>
                  <button onClick={clearSelection} className="text-[10px] text-muted hover:text-foreground">
                    Borrar
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-0.5 px-1">
                  {loading ? (
                    <p className="text-xs text-muted text-center py-4">Cargando...</p>
                  ) : filteredValues.length === 0 ? (
                    <p className="text-xs text-muted text-center py-4">Sin resultados</p>
                  ) : (
                    filteredValues.map((val) => (
                      <label
                        key={val}
                        className={`flex items-center gap-2 px-2 py-1 rounded-lg text-xs cursor-pointer transition-colors hover:bg-sidebar-hover ${
                          selected.has(val) ? "text-foreground" : "text-muted"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected.has(val)}
                          onChange={() => toggleValue(val)}
                          className="w-3.5 h-3.5 rounded border-border-color accent-accent"
                        />
                        <span className="truncate">{val}</span>
                      </label>
                    ))
                  )}
                </div>
              </>
            ) : (
              <div className="flex gap-1 px-1">
                <input
                  type="text"
                  value={textFilter}
                  onChange={(e) => setTextFilter(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleTextApply()}
                  placeholder="Contiene..."
                  className="flex-1 bg-background border border-border-color rounded-lg px-2 py-1.5 text-xs text-foreground placeholder-muted focus:outline-none focus:border-accent"
                  autoFocus
                />
                <button
                  onClick={handleTextApply}
                  className="px-2 py-1.5 bg-accent text-white rounded-lg text-xs hover:bg-accent-hover transition-colors"
                >
                  Ok
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-2 flex items-center gap-2">
            {type === "values" && table ? (
              <>
                <button
                  onClick={() => setOpen(false)}
                  className="flex-1 px-3 py-1.5 text-xs text-muted hover:text-foreground border border-border-color rounded-lg transition-colors text-center"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleApplyValues}
                  className="flex-1 px-3 py-1.5 text-xs bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors text-center"
                >
                  Aceptar
                </button>
              </>
            ) : isActive ? (
              <button
                onClick={handleClearAll}
                className="w-full text-center px-2 py-1.5 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                Limpiar filtro
              </button>
            ) : null}
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      <span>{label}</span>
      <button
        ref={btnRef}
        onClick={() => setOpen(!open)}
        className={`p-0.5 rounded transition-colors ${
          isActive ? "text-accent bg-accent/15" : "text-muted/40 hover:text-muted"
        }`}
      >
        {isActive ? (
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3.792 3.678A48.32 48.32 0 0 1 12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.792-1.096Z" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />
          </svg>
        )}
      </button>
      {dropdown}
    </span>
  );
}
