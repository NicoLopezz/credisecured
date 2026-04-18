"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";

export default function ClearFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const count = Array.from(searchParams.entries()).filter(
    ([k, v]) => v && (k.startsWith("f_") || k === "sort" || k === "q")
  ).length;

  if (count === 0) return null;

  function handleClear() {
    startTransition(() => {
      router.replace(pathname);
    });
  }

  return (
    <button
      onClick={handleClear}
      className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-muted hover:text-foreground bg-background border border-border-color hover:border-red-400/50 rounded-lg transition-colors group"
    >
      <svg
        className="w-3.5 h-3.5 text-muted group-hover:text-red-500 transition-colors"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
      </svg>
      <span>Limpiar filtros</span>
      <span className="bg-accent/15 text-accent px-1.5 py-0.5 rounded-md text-[10px] font-semibold">
        {count}
      </span>
    </button>
  );
}
