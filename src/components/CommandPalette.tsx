"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Hit = {
  entityType: string;
  entityId: number;
  empresaId: number | null;
  title: string;
  subtitle: string | null;
  url: string;
  score: number;
  matchKind?: string | null;
  matchRaw?: string | null;
  empresaRazonSocial?: string | null;
  empresaEsCliente?: boolean;
  empresaEsProveedor?: boolean;
};

const KIND_LABEL: Record<string, string> = {
  CUIT: "CUIT",
  CBU: "CBU",
  PHONE: "Teléfono",
  DOC_NO: "N° documento",
  AMOUNT: "Importe",
  OTHER: "Número",
};

const TYPE_META: Record<
  string,
  { label: string; color: string; iconPath: string }
> = {
  EMPRESA: {
    label: "Empresas",
    color: "bg-blue-500/15 text-blue-500 dark:text-blue-400",
    iconPath:
      "M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z",
  },
  CONTACTO: {
    label: "Contactos",
    color: "bg-emerald-500/15 text-emerald-500 dark:text-emerald-400",
    iconPath:
      "M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z",
  },
  BANCO: {
    label: "Cuentas bancarias",
    color: "bg-amber-500/15 text-amber-500 dark:text-amber-400",
    iconPath:
      "M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75Z",
  },
  OPERACION: {
    label: "Operaciones",
    color: "bg-cyan-500/15 text-cyan-500 dark:text-cyan-400",
    iconPath:
      "M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5",
  },
  DOCUMENTO: {
    label: "Documentos",
    color: "bg-purple-500/15 text-purple-500 dark:text-purple-400",
    iconPath:
      "M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z",
  },
  NOTA: {
    label: "Notas",
    color: "bg-pink-500/15 text-pink-500 dark:text-pink-400",
    iconPath:
      "M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5",
  },
};

function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q || q.length < 2) return <>{text}</>;
  // case-insensitive + ignora acentos
  const norm = (s: string) =>
    s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const needle = norm(q);
  const hay = norm(text);
  const parts: React.ReactNode[] = [];
  let i = 0;
  while (i < text.length) {
    const idx = hay.indexOf(needle, i);
    if (idx === -1) {
      parts.push(text.slice(i));
      break;
    }
    if (idx > i) parts.push(text.slice(i, idx));
    parts.push(
      <mark
        key={idx}
        className="bg-yellow-300/50 text-foreground rounded-sm px-0.5 dark:bg-yellow-400/30"
      >
        {text.slice(idx, idx + needle.length)}
      </mark>
    );
    i = idx + needle.length;
  }
  return <>{parts}</>;
}

function EntityIcon({ type, className = "w-5 h-5" }: { type: string; className?: string }) {
  const meta = TYPE_META[type];
  if (!meta) return null;
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d={meta.iconPath} />
    </svg>
  );
}

function RoleTag({
  esCliente,
  esProveedor,
}: {
  esCliente?: boolean;
  esProveedor?: boolean;
}) {
  if (esCliente && esProveedor) {
    return (
      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-500 dark:text-violet-400 uppercase tracking-wide">
        Cli/Prov
      </span>
    );
  }
  if (esCliente) {
    return (
      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-500 dark:text-blue-400 uppercase tracking-wide">
        Cliente
      </span>
    );
  }
  if (esProveedor) {
    return (
      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-500 dark:text-purple-400 uppercase tracking-wide">
        Proveedor
      </span>
    );
  }
  return null;
}

function ResultLine({ hit, q }: { hit: Hit; q: string }) {
  const H = (t: string) => <Highlight text={t} query={q} />;
  const empresa = hit.empresaRazonSocial;
  const role = (
    <RoleTag
      esCliente={hit.empresaEsCliente}
      esProveedor={hit.empresaEsProveedor}
    />
  );

  switch (hit.entityType) {
    case "EMPRESA":
      return (
        <>
          <div className="flex items-center gap-2 min-w-0">
            <p className="text-sm text-foreground truncate font-medium">
              {H(hit.title)}
            </p>
            {role}
          </div>
          {hit.matchKind === "CUIT" && hit.matchRaw ? (
            <p className="text-xs text-muted truncate">
              <span className="text-foreground/60">CUIT:</span>{" "}
              <span className="font-mono">{hit.matchRaw}</span>
            </p>
          ) : (
            hit.subtitle && (
              <p className="text-xs text-muted truncate">{hit.subtitle}</p>
            )
          )}
        </>
      );
    case "CONTACTO": {
      const [rol] = (hit.subtitle ?? "").split("·").map((s) => s.trim());
      return (
        <>
          <div className="flex items-center gap-2 min-w-0">
            <p className="text-sm text-foreground truncate font-medium">
              {H(hit.title)}
            </p>
            {role}
          </div>
          <p className="text-xs text-muted truncate">
            {rol && <span>{H(rol)}</span>}
            {empresa && (
              <>
                {rol && <span className="mx-1">·</span>}
                <span>Contacto de {H(empresa)}</span>
              </>
            )}
            {hit.matchKind === "PHONE" && hit.matchRaw && (
              <>
                <span className="mx-1">·</span>
                <span className="font-mono">{H(hit.matchRaw)}</span>
              </>
            )}
          </p>
        </>
      );
    }
    case "BANCO": {
      const banco = hit.title.split("—")[0].trim();
      return (
        <>
          <div className="flex items-center gap-2 min-w-0">
            <p className="text-sm text-foreground truncate font-medium">
              {H(banco)}
            </p>
            {role}
          </div>
          <p className="text-xs text-muted truncate">
            {empresa && <span>Cuenta de {H(empresa)}</span>}
            {hit.matchKind === "CBU" && hit.matchRaw && (
              <>
                {empresa && <span className="mx-1">·</span>}
                <span className="font-mono">CBU {H(hit.matchRaw)}</span>
              </>
            )}
          </p>
        </>
      );
    }
    case "DOCUMENTO": {
      const [tipo] = (hit.subtitle ?? "").split("·").map((s) => s.trim());
      return (
        <>
          <div className="flex items-center gap-2 min-w-0">
            <p className="text-sm text-foreground truncate font-medium">
              {H(hit.title)}
            </p>
            {role}
          </div>
          <p className="text-xs text-muted truncate">
            {tipo && <span>{tipo}</span>}
            {empresa && (
              <>
                {tipo && <span className="mx-1">·</span>}
                <span>Documento de {H(empresa)}</span>
              </>
            )}
          </p>
        </>
      );
    }
    case "NOTA":
      return (
        <>
          <div className="flex items-center gap-2 min-w-0">
            <p className="text-sm text-foreground truncate font-medium">
              Nota en {empresa ? H(empresa) : "Empresa"}
            </p>
            {role}
          </div>
          <p className="text-xs text-muted truncate">
            {H(hit.title.split("·")[0].trim())}
            {hit.subtitle && (
              <>
                <span className="mx-1">·</span>
                {H(hit.subtitle)}
              </>
            )}
          </p>
        </>
      );
    case "OPERACION":
      return (
        <>
          <div className="flex items-center gap-2 min-w-0">
            <p className="text-sm text-foreground truncate font-medium">
              {H(hit.title)}
            </p>
            {role}
          </div>
          <p className="text-xs text-muted truncate">
            Operación{empresa ? ` · ` : ""}
            {empresa && H(empresa)}
            {hit.subtitle && (
              <>
                <span className="mx-1">·</span>
                <span className="font-mono">{H(hit.subtitle)}</span>
              </>
            )}
          </p>
        </>
      );
    default:
      return (
        <>
          <p className="text-sm text-foreground truncate">{hit.title}</p>
          {hit.subtitle && (
            <p className="text-xs text-muted truncate">{hit.subtitle}</p>
          )}
        </>
      );
  }
}
const TYPE_ORDER = ["EMPRESA", "CONTACTO", "BANCO", "OPERACION", "DOCUMENTO", "NOTA"];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [q, setQ] = useState("");
  const [grouped, setGrouped] = useState<Record<string, Hit[]>>({});
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Mount/unmount con animación (doble RAF para forzar transición desde el estado inicial)
  useEffect(() => {
    if (open) {
      setMounted(true);
      const r1 = requestAnimationFrame(() => {
        const r2 = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(r2);
      });
      return () => cancelAnimationFrame(r1);
    } else {
      setVisible(false);
      const t = setTimeout(() => setMounted(false), 260);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setSelected(0);
      setActiveTab("ALL");
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (q.trim().length < 2) {
      setGrouped({});
      return;
    }
    setLoading(true);
    const id = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data = await r.json();
        setGrouped(data.grouped ?? {});
        setSelected(0);
        setActiveTab("ALL");
      } finally {
        setLoading(false);
      }
    }, 150);
    return () => clearTimeout(id);
  }, [q, open]);

  const visibleHits: Hit[] = useMemo(() => {
    if (activeTab === "ALL") return TYPE_ORDER.flatMap((t) => grouped[t] ?? []);
    return grouped[activeTab] ?? [];
  }, [grouped, activeTab]);

  const total = TYPE_ORDER.reduce((s, t) => s + (grouped[t]?.length ?? 0), 0);

  function navigate(hit: Hit) {
    router.push(hit.url);
    setOpen(false);
    setQ("");
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, visibleHits.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter") {
      const hit = visibleHits[selected];
      if (hit) navigate(hit);
    } else if (e.key === "Tab" || e.key === "ArrowRight" || e.key === "ArrowLeft") {
      const available = ["ALL", ...TYPE_ORDER.filter((t) => grouped[t]?.length)];
      if (available.length <= 1) return;
      e.preventDefault();
      const idx = available.indexOf(activeTab);
      const direction =
        e.key === "ArrowLeft" || (e.key === "Tab" && e.shiftKey) ? -1 : 1;
      const next = available[(idx + direction + available.length) % available.length];
      setActiveTab(next);
      setSelected(0);
    }
  }

  if (!mounted) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh]"
      onClick={() => setOpen(false)}
      style={{
        backgroundColor: visible ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0)",
        backdropFilter: visible ? "blur(6px)" : "blur(0px)",
        WebkitBackdropFilter: visible ? "blur(6px)" : "blur(0px)",
        transition:
          "background-color 260ms cubic-bezier(0.22, 1, 0.36, 1), backdrop-filter 260ms cubic-bezier(0.22, 1, 0.36, 1)",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <div
        className="w-full max-w-2xl mx-4 bg-card-bg rounded-2xl border border-border-color shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{
          opacity: visible ? 1 : 0,
          transform: visible
            ? "scale(1) translateY(0)"
            : "scale(0.97) translateY(-8px)",
          transition:
            "opacity 220ms cubic-bezier(0.22, 1, 0.36, 1), transform 280ms cubic-bezier(0.22, 1, 0.36, 1)",
          willChange: "opacity, transform",
        }}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border-color">
          <svg className="w-5 h-5 text-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Buscar empresas, contactos, cuentas, documentos…"
            className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted text-base"
          />
          {loading && <span className="text-xs text-muted animate-pulse">…</span>}
          <kbd className="text-[10px] text-muted border border-border-color rounded px-1.5 py-0.5 font-mono">
            ESC
          </kbd>
        </div>

        {/* Tabs por tipo */}
        {total > 0 && (
          <div className="flex items-center gap-1 px-2 border-b border-border-color overflow-x-auto">
            <TabButton
              label="Todos"
              count={total}
              active={activeTab === "ALL"}
              onClick={() => {
                setActiveTab("ALL");
                setSelected(0);
              }}
            />
            {TYPE_ORDER.map((t) => {
              const items = grouped[t];
              if (!items || items.length === 0) return null;
              return (
                <TabButton
                  key={t}
                  label={TYPE_META[t].label}
                  count={items.length}
                  active={activeTab === t}
                  onClick={() => {
                    setActiveTab(t);
                    setSelected(0);
                  }}
                />
              );
            })}
          </div>
        )}

        {/* Resultados */}
        <div className="max-h-[50vh] overflow-y-auto">
          {q.trim().length < 2 ? (
            <div className="p-8 text-center text-muted text-sm">
              Escribí al menos 2 caracteres para buscar
            </div>
          ) : visibleHits.length === 0 && !loading ? (
            <div className="p-8 text-center text-muted text-sm">
              Sin resultados para "{q}"
            </div>
          ) : (
            <div className="py-1">
              {visibleHits.map((hit, idx) => {
                const meta = TYPE_META[hit.entityType];
                const isActive = idx === selected;
                return (
                  <button
                    key={`${hit.entityType}-${hit.entityId}`}
                    onClick={() => navigate(hit)}
                    onMouseEnter={() => setSelected(idx)}
                    className={`w-full text-left px-4 py-2.5 flex items-center gap-3 border-l-2 transition-colors ${
                      isActive
                        ? "bg-blue-500/10 border-blue-500"
                        : "border-transparent hover:bg-card-bg-hover"
                    }`}
                  >
                    <span
                      className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${meta.color}`}
                    >
                      <EntityIcon type={hit.entityType} className="w-4 h-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <ResultLine hit={hit} q={q} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-2 border-t border-border-color text-[10px] text-muted">
          <div className="flex items-center gap-3">
            <span><kbd className="border border-border-color rounded px-1 font-mono">↑↓</kbd> navegar</span>
            <span><kbd className="border border-border-color rounded px-1 font-mono">←→</kbd> cambiar tipo</span>
            <span><kbd className="border border-border-color rounded px-1 font-mono">↵</kbd> abrir</span>
          </div>
          {visibleHits.length > 0 && (
            <span>
              {visibleHits.length} {activeTab === "ALL" ? "resultado(s)" : TYPE_META[activeTab].label.toLowerCase()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
        active ? "text-foreground" : "text-muted hover:text-foreground"
      }`}
    >
      <span className="flex items-center gap-1.5">
        {label}
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded-full ${
            active ? "bg-blue-500/20 text-blue-400" : "bg-background/60 text-muted"
          }`}
        >
          {count}
        </span>
      </span>
      {active && (
        <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-blue-500 rounded-full" />
      )}
    </button>
  );
}
