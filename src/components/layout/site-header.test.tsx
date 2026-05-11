import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LessonHeaderProvider } from "./lesson-header-context";
import { SiteHeader } from "./site-header";

function renderHeader() {
  render(
    <LessonHeaderProvider>
      <SiteHeader />
    </LessonHeaderProvider>
  );
}

describe("SiteHeader", () => {
  const store: Record<string, string> = {};

  beforeEach(() => {
    for (const key of Object.keys(store)) delete store[key];
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => { store[key] = value; },
      removeItem: (key: string) => { delete store[key]; },
    });
  });

  it("shows the Chinese learning entry without promotional links", () => {
    renderHeader();

    expect(screen.getByRole("link", { name: /课程/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Blog/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Compare/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Source/i })).not.toBeInTheDocument();
  });
});
