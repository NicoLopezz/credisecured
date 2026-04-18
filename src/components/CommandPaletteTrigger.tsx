"use client";

import { useEffect, useState } from "react";

export default function CommandPaletteTrigger() {
  const [isMac, setIsMac] = useState(true);
  useEffect(() => {
    setIsMac(navigator.platform.toLowerCase().includes("mac"));
  }, []);

  function open() {
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true })
    );
  }

  return (
    <button
      onClick={open}
      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card-bg border border-border-color text-muted hover:text-foreground hover:border-foreground/20 transition-colors text-sm"
      title="Buscar (⌘K)"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
      </svg>
      <span className="hidden md:inline">Buscar</span>
      <kbd className="text-[10px] border border-border-color rounded px-1.5 py-0.5 font-mono">
        {isMac ? "⌘" : "Ctrl"}K
      </kbd>
    </button>
  );
}
