"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { Shell } from "@/components/shell";
import { Button, Notice, TextField } from "@/components/ui";
import { ApiError, api } from "@/lib/api";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      router.push(params.get("next") || "/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not log in");
    } finally {
      setPending(false);
    }
  }

  return (
    <Shell>
      <div className="mx-auto max-w-md">
        <h1 className="font-display text-4xl">Log in</h1>
        <p className="mt-2 text-sm text-muted">Use the account you registered, or the seeded admin.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-2xl border border-line bg-card p-5">
          {error ? <Notice tone="error">{error}</Notice> : null}
          <TextField
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <TextField
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Signing in…" : "Log in"}
          </Button>
          <p className="text-sm text-muted">
            New here?{" "}
            <Link href="/register" className="font-medium text-accent-deep hover:underline">
              Create an account
            </Link>
          </p>
        </form>
      </div>
    </Shell>
  );
}
