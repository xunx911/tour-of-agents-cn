"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Toaster } from "@/components/ui/sonner";
import { SiteHeader } from "@/components/layout/site-header";
import { LessonHeaderProvider } from "@/components/layout/lesson-header-context";

export function Providers({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isFreshDemo = pathname?.startsWith("/fresh");

  return (
    <LessonHeaderProvider>
      {isFreshDemo ? null : <SiteHeader />}
      {isFreshDemo ? null : <div className="h-14" />}
      {children}
      <Toaster position="bottom-right" duration={2500} />
    </LessonHeaderProvider>
  );
}
