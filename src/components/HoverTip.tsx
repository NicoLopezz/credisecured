"use client";

import * as Tooltip from "@radix-ui/react-tooltip";

export default function HoverTip({
  text,
  size = "sm",
}: {
  text: string;
  size?: "sm" | "xs";
}) {
  const iconSize = size === "xs" ? "w-2.5 h-2.5" : "w-3 h-3";

  return (
    <Tooltip.Provider delayDuration={200}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <span className="cursor-help inline-flex">
            <svg
              className={`${iconSize} text-muted/50 hover:text-accent transition-colors`}
              viewBox="0 0 16 16"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14zm.75-10.25a.75.75 0 0 0-1.5 0v.01a.75.75 0 0 0 1.5 0V4.75zM8 7a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 7z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            sideOffset={5}
            className="z-[9999] px-3 py-2 rounded-lg bg-foreground text-background text-[10px] whitespace-normal max-w-[250px] leading-relaxed shadow-xl animate-in fade-in-0 zoom-in-95"
          >
            {text}
            <Tooltip.Arrow className="fill-foreground" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
