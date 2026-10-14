"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

export default function CustomerProfilePage() {
  const router = useRouter();

  React.useEffect(() => {
    router.replace("/customer/login");
  }, [router]);

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3">
      <span className="text-xs text-slate-500 font-semibold">Redirecting to guest travel access...</span>
    </div>
  );
}
