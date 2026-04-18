"use client";

import Link from "next/link";
import { useRef, useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";

const COLORS = [
  "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  "bg-amber-500/20 text-amber-400 border-amber-500/30",
  "bg-purple-500/20 text-purple-400 border-purple-500/30",
  "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  "bg-pink-500/20 text-pink-400 border-pink-500/30",
  "bg-orange-500/20 text-orange-400 border-orange-500/30",
  "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function hashColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return COLORS[Math.abs(h) % COLORS.length];
}

// Mock contact data - generates consistent fake data based on name hash
function getMockContact(name: string, empresaId?: number): ContactInfo {
  const nameLower = name.toLowerCase().replace(/\s+/g, ".");
  const firstPart = nameLower.split(".")[0];
  return {
    nombre: name,
    email: `${nameLower}@empresa.com`,
    telefono: `+54 11 ${String(Math.abs(hashNum(name))).slice(0, 4)}-${String(Math.abs(hashNum(name + "x"))).slice(0, 4)}`,
    whatsapp: `+54 9 11 ${String(Math.abs(hashNum(name + "w"))).slice(0, 4)}-${String(Math.abs(hashNum(firstPart))).slice(0, 4)}`,
    empresaId,
  };
}

function hashNum(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

export type ContactInfo = {
  nombre: string;
  email?: string | null;
  telefono?: string | null;
  whatsapp?: string | null;
  empresaId?: number;
};

function TooltipPortal({
  info,
  color,
  initials,
  anchorRef,
}: {
  info: ContactInfo;
  color: string;
  initials: string;
  anchorRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  const update = useCallback(() => {
    const anchor = anchorRef.current;
    const tip = tipRef.current;
    if (!anchor || !tip) return;
    const r = anchor.getBoundingClientRect();
    const tw = tip.offsetWidth;
    let left = r.left + r.width / 2 - tw / 2;
    // clamp horizontal
    if (left < 8) left = 8;
    if (left + tw > window.innerWidth - 8) left = window.innerWidth - 8 - tw;
    // position above
    let top = r.top - tip.offsetHeight - 8;
    if (top < 8) top = r.bottom + 8; // flip below if no room
    setPos({ top, left });
  }, [anchorRef]);

  useEffect(() => {
    update();
    // reposition on scroll/resize
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [update]);

  return createPortal(
    <div
      ref={tipRef}
      style={{
        position: "fixed",
        zIndex: 9999,
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        opacity: pos ? 1 : 0,
        transform: pos ? "scale(1)" : "scale(0.95)",
        transition: "opacity 200ms ease-out, transform 200ms ease-out",
        pointerEvents: "auto",
      }}
      onMouseLeave={(e) => {
        // Allow moving mouse from tooltip back to avatar
        const related = e.relatedTarget as Node | null;
        if (anchorRef.current?.contains(related)) return;
      }}
    >
      <div className="bg-card-bg border border-border-color rounded-xl shadow-2xl overflow-hidden min-w-[220px]">
        {/* Header with avatar + name */}
        <div className="px-4 pt-3.5 pb-3 flex items-center gap-2.5">
          <div className={`w-8 h-8 ${color} border rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0`}>
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-foreground font-semibold text-xs truncate">{info.nombre}</p>
            {info.email && (
              <p className="text-[10px] text-muted truncate">{info.email}</p>
            )}
          </div>
        </div>

        {/* Contact details */}
        <div className="px-4 pb-3 space-y-2">
          {info.telefono && (
            <div className="flex items-center gap-2.5 text-[11px]">
              <div className="w-5 h-5 rounded-md bg-background flex items-center justify-center flex-shrink-0">
                <svg className="w-3 h-3 text-muted" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                </svg>
              </div>
              <span className="text-foreground">{info.telefono}</span>
            </div>
          )}
          {info.whatsapp && (
            <div className="flex items-center gap-2.5 text-[11px]">
              <div className="w-5 h-5 rounded-md bg-background flex items-center justify-center flex-shrink-0">
                <svg className="w-3 h-3 text-muted" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
                </svg>
              </div>
              <span className="text-foreground">{info.whatsapp}</span>
            </div>
          )}
        </div>

        {/* Footer: Ver perfil */}
        {info.empresaId && (
          <Link
            href={`/empresas/${info.empresaId}`}
            className="flex items-center justify-between px-4 py-2.5 bg-background/50 border-t border-border-color text-[11px] text-accent hover:text-accent-hover hover:bg-background transition-colors cursor-pointer"
          >
            <span className="font-medium">Ver perfil</span>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        )}
      </div>
    </div>,
    document.body
  );
}

export default function ContactAvatar({
  name,
  contact,
  size = "sm",
}: {
  name: string | null;
  contact?: ContactInfo | null;
  size?: "sm" | "xs";
}) {
  const [hovered, setHovered] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);
  const hideTimeout = useRef<ReturnType<typeof setTimeout>>(null);

  if (!name) return <span className="text-muted">—</span>;

  const initials = getInitials(name);
  const color = hashColor(name);
  const sz = size === "xs" ? "w-5 h-5 text-[8px]" : "w-6 h-6 text-[9px]";

  // Use real contact data, fall back to mock
  const info: ContactInfo =
    contact && (contact.email || contact.telefono)
      ? contact
      : getMockContact(name, contact?.empresaId);

  const show = () => {
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    setHovered(true);
  };

  const hide = () => {
    hideTimeout.current = setTimeout(() => setHovered(false), 150);
  };

  return (
    <div
      ref={avatarRef}
      className="relative inline-flex items-center"
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      <div
        className={`${sz} ${color} border rounded-full flex items-center justify-center font-bold cursor-default flex-shrink-0 transition-all duration-150 ${hovered ? "scale-110 shadow-lg" : ""}`}
      >
        {initials}
      </div>

      {hovered && (
        <TooltipPortal
          info={info}
          color={color}
          initials={initials}
          anchorRef={avatarRef}
        />
      )}
    </div>
  );
}
