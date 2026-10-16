"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { PublicUser } from "@/lib/types";
import { primaryLinkClass, secondaryLinkClass } from "./ui";

export function HomeActions() {
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
  }, []);

  if (user) {
    return (
      <div className="flex flex-wrap gap-3">
        <Link href="/dashboard" className={primaryLinkClass}>
          Open dashboard
        </Link>
        {user.role === "ADMIN" ? (
          <Link href="/admin" className={secondaryLinkClass}>
            Admin
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Link href="/register" className={primaryLinkClass}>
        Create an account
      </Link>
      <Link href="/login" className={secondaryLinkClass}>
        Log in
      </Link>
    </div>
  );
}
