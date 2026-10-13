"use client";

import { usePathname } from "next/navigation";
import * as React from "react";

export function ScrollReset() {
  const pathname = usePathname();

  React.useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant",
    });
  }, [pathname]);

  return null;
}
