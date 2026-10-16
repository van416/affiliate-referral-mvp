"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { PublicUser } from "@/lib/types";

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<PublicUser | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    api<{ user: PublicUser }>("/api/me")
      .then((data) => {
        if (!cancelled) setUser(data.user);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  const linkClass = (href: string) =>
    `rounded-md px-2 py-1 ${pathname === href ? "bg-accent-soft text-accent-deep" : "hover:bg-black/5"}`;

  return (
    <header className="border-b border-line/80 bg-card/80 backdrop-blur">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-10 focus:rounded focus:bg-white focus:px-3 focus:py-2">
        Skip to content
      </a>
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-3">
        <Link href="/" className="flex items-center gap-2 font-display text-xl tracking-tight">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-sans font-semibold text-white">
            FL
          </span>
          FirstLink
        </Link>
        <nav className="flex flex-wrap items-center gap-1 text-sm">
          {user ? (
            <>
              <Link href="/dashboard" className={linkClass("/dashboard")}>
                Dashboard
              </Link>
              {user.role === "ADMIN" ? (
                <Link href="/admin" className={linkClass("/admin")}>
                  Admin
                </Link>
              ) : null}
              <span className="px-2 text-muted">{user.name}</span>
              <button type="button" onClick={() => void logout()} className="rounded-md px-2 py-1 hover:bg-black/5">
                Log out
              </button>
            </>
          ) : user === null ? (
            <>
              <Link href="/login" className={linkClass("/login")}>
                Log in
              </Link>
              <Link href="/register" className="rounded-lg bg-accent px-3 py-1.5 text-white hover:bg-accent-deep">
                Create account
              </Link>
            </>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
