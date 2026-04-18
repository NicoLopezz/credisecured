"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";

export default function FilterSelect({
  paramName,
  options,
  placeholder,
}: {
  paramName: string;
  options: { value: string; label: string }[];
  placeholder: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const current = searchParams.get(paramName) || "";

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(paramName, value);
    } else {
      params.delete(paramName);
    }
    params.delete("page");
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <select
      value={current}
      onChange={(e) => handleChange(e.target.value)}
      className="bg-background border border-border-color rounded-lg px-4 py-2 text-sm text-foreground focus:outline-none focus:border-accent"
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
