"use client";

import { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { SiteHeader } from "@/components/layout/site-header";
import { LessonHeaderProvider } from "@/components/layout/lesson-header-context";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <LessonHeaderProvider>
      <SiteHeader />
      <div className="h-14" />
      {children}
      <Toaster position="bottom-right" duration={2500} />
    </LessonHeaderProvider>
  );
}
