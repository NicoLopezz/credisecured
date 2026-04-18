"use client";

import { useState, type ReactNode } from "react";

export type TabItem = {
  key: string;
  label: string;
  count?: number;
  content: ReactNode;
};

export default function EmpresaTabs({ tabs }: { tabs: TabItem[] }) {
  const [active, setActive] = useState(tabs[0]?.key);
  const current = tabs.find((t) => t.key === active) ?? tabs[0];

  return (
    <div className="bg-card-bg rounded-xl border border-border-color">
      <div className="flex items-center gap-1 border-b border-border-color px-2 overflow-x-auto">
        {tabs.map((t) => {
          const isActive = t.key === active;
          return (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              className={`relative px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? "text-foreground"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <span className="flex items-center gap-2">
                {t.label}
                {t.count !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      isActive
                        ? "bg-blue-500/20 text-blue-400"
                        : "bg-background/60 text-muted"
                    }`}
                  >
                    {t.count}
                  </span>
                )}
              </span>
              {isActive && (
                <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-blue-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
      <div className="p-5">{current?.content}</div>
    </div>
  );
}
