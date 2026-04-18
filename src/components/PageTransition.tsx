"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";

export default function PageTransition({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(true);
  const prevPath = useRef(pathname);

  useEffect(() => {
    if (pathname !== prevPath.current) {
      prevPath.current = pathname;
      setVisible(false);
      const id = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(id);
    }
  }, [pathname]);

  return (
    <div
      className={`transition-[opacity,transform] duration-300 ease-out ${
        visible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-1"
      }`}
    >
      {children}
    </div>
  );
}
