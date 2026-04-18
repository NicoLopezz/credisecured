"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

export default function SearchInput({
  placeholder = "Buscar...",
  paramName = "q",
}: {
  placeholder?: string;
  paramName?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get(paramName) || "");
  const [, startTransition] = useTransition();
  const debounceRef = useRef<NodeJS.Timeout>(undefined);

  useEffect(() => {
    setValue(searchParams.get(paramName) || "");
  }, [searchParams, paramName]);

  function handleChange(newValue: string) {
    setValue(newValue);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (newValue) {
        params.set(paramName, newValue);
      } else {
        params.delete(paramName);
      }
      params.delete("page");
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`);
      });
    }, 300);
  }

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => handleChange(e.target.value)}
      placeholder={placeholder}
      className="flex-1 min-w-[200px] bg-background border border-border-color rounded-lg px-4 py-2 text-sm text-foreground placeholder-muted focus:outline-none focus:border-accent"
    />
  );
}
