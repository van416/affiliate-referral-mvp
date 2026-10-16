"use client";

import type { ReactNode } from "react";
import { Header } from "./header";

export function Shell({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <main id="main" className="mx-auto w-full max-w-5xl px-5 pb-20 pt-8">
        {children}
      </main>
    </>
  );
}
