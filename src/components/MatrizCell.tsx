"use client";

import { useState, useRef, useEffect } from "react";

export function MatrizCell({
  monto,
  montoFull,
  cliente,
  proveedor,
  status,
  count,
  colorClass,
}: {
  monto: string;
  montoFull: string;
  cliente: string;
  proveedor: string;
  status: string;
  count: number;
  colorClass: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-center gap-1 px-1 py-1 rounded cursor-pointer transition-colors ${colorClass}`}
      >
        <span className="font-mono text-[11px]">{monto}</span>
        <svg className="w-3 h-3 opacity-40 flex-shrink-0" viewBox="0 0 16 16" fill="currentColor">
          <path d="M2 3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H5.236l-2.65 2.65A.5.5 0 0 1 2 13.264V3z" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 bg-card-bg border border-border-color rounded-xl shadow-2xl p-3 min-w-[220px] text-left">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-semibold text-foreground">Detalle del cruce</p>
            <button onClick={() => setOpen(false)} className="text-muted hover:text-foreground text-xs">
              &times;
            </button>
          </div>
          <div className="space-y-1.5 text-[11px]">
            <div>
              <span className="text-muted">Cliente: </span>
              <span className="text-foreground font-medium">{cliente}</span>
            </div>
            <div>
              <span className="text-muted">Proveedor: </span>
              <span className="text-foreground font-medium">{proveedor}</span>
            </div>
            <div>
              <span className="text-muted">Importe: </span>
              <span className="text-foreground font-mono font-medium">{montoFull}</span>
            </div>
            <div>
              <span className="text-muted">Status: </span>
              <StatusPill status={status} />
            </div>
            {count > 1 && (
              <div>
                <span className="text-muted">Operaciones: </span>
                <span className="text-foreground">{count}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const colors: Record<string, string> = {
    Enviado: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
    Pendiente: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
    Ubicado: "bg-emerald-100 text-emerald-700 dark:bg-green-500/20 dark:text-green-400",
  };
  const c = colors[status] || "bg-gray-500/20 text-gray-600";
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${c}`}>
      {status}
    </span>
  );
}
