"use client";

import * as Tooltip from "@radix-ui/react-tooltip";

export default function InfoTip({ text }: { text: string }) {
  return (
    <Tooltip.Provider delayDuration={200}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            type="button"
            className="ml-1 text-muted/40 hover:text-accent transition-colors duration-150 cursor-help inline-flex"
            aria-label="Info"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <circle cx="12" cy="12" r="10" />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 16v-4m0-4h.01"
              />
            </svg>
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            sideOffset={5}
            className="z-[9999] px-3 py-2 rounded-lg bg-foreground text-background text-xs whitespace-normal max-w-[280px] leading-relaxed shadow-xl animate-in fade-in-0 zoom-in-95"
          >
            {text}
            <Tooltip.Arrow className="fill-foreground" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
