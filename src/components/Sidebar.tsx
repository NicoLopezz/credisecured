"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: ChartIcon },
  { href: "/empresas", label: "Empresas", icon: BuildingIcon },
  { href: "/operaciones", label: "Pedidos", icon: OperacionIcon },
  { href: "/pedidos", label: "Pedido Cliente", icon: PedidoIcon },
  { href: "/cupos", label: "Cupo Proveedor", icon: CupoIcon },
  { href: "/matriz", label: "Matriz", icon: MatrizIcon },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const lockRef = useRef(false);

  function handleMouseEnter() {
    if (!lockRef.current) setExpanded(true);
  }

  function handleMouseLeave() {
    setExpanded(false);
    lockRef.current = false;
  }

  function handleNavClick() {
    setExpanded(false);
    lockRef.current = true;
  }

  return (
    <aside
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`fixed left-4 top-4 bottom-4 bg-sidebar-bg/95 backdrop-blur-sm border border-border-color rounded-2xl flex flex-col z-50 transition-[width] duration-300 ease-in-out overflow-hidden shadow-lg shadow-black/20 ${
        expanded ? "w-60" : "w-[56px]"
      }`}
    >
      {/* Brand */}
      <div className="px-[11px] py-4 border-b border-border-color min-h-[56px] flex items-center">
        <Link
          href="/dashboard"
          onClick={handleNavClick}
          className="flex items-center gap-3 cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
            <svg
              className="w-[18px] h-[18px] text-accent"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5"
              />
            </svg>
          </div>
          <div
            className={`transition-opacity duration-200 whitespace-nowrap ${
              expanded ? "opacity-100" : "opacity-0"
            }`}
          >
            <h1 className="text-sm font-bold text-foreground tracking-tight">
              Licitaciones-X
            </h1>
            <p className="text-[10px] text-muted leading-none mt-0.5">
              Marketplace de Factoring
            </p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-0.5">
        <p
          className={`px-2.5 mb-2 text-[10px] font-semibold text-muted/60 uppercase tracking-widest transition-opacity duration-200 whitespace-nowrap h-3 ${
            expanded ? "opacity-100" : "opacity-0"
          }`}
        >
          Menu
        </p>
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              onClick={handleNavClick}
              className={`flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors duration-150 cursor-pointer ${
                isActive
                  ? "bg-accent/15 text-accent border border-accent/20"
                  : "text-muted hover:bg-sidebar-hover hover:text-foreground border border-transparent"
              }`}
            >
              <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
              <span
                className={`transition-opacity duration-200 whitespace-nowrap ${
                  expanded ? "opacity-100" : "opacity-0"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-2 py-2.5 border-t border-border-color">
        <div className="flex items-center justify-center">
          <span
            className={`text-[10px] text-muted/50 transition-opacity duration-200 whitespace-nowrap ${
              expanded ? "opacity-100" : "opacity-0"
            }`}
          >
            v0.1.0
          </span>
        </div>
      </div>
    </aside>
  );
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
    </svg>
  );
}

function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
    </svg>
  );
}

function CupoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function PedidoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  );
}

function OperacionIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
  );
}

function MatrizIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0 1 12 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M10.875 12h-1.5m1.5 0c.621 0 1.125.504 1.125 1.125M12 12h7.5m-7.5 0c0 .621-.504 1.125-1.125 1.125M21.375 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5A1.125 1.125 0 0 0 12 15m8.625-3.75c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125" />
    </svg>
  );
}
