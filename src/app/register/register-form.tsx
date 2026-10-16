"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Shell } from "@/components/shell";
import { Button, Notice, TextField } from "@/components/ui";
import { ApiError, api } from "@/lib/api";

type CodeStatus = "empty" | "checking" | "valid" | "invalid";

export function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState(params.get("ref") ?? "");
  const [lookup, setLookup] = useState<{ code: string; status: Exclude<CodeStatus, "empty" | "checking">; name: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const trimmedCode = referralCode.trim();
  const codeStatus: CodeStatus = !trimmedCode ? "empty" : lookup?.code === trimmedCode ? lookup.status : "checking";
  const referrerName = codeStatus === "valid" ? lookup?.name ?? null : null;

  useEffect(() => {
    if (!trimmedCode) return;
    const handle = window.setTimeout(() => {
      fetch(`/api/referrals/lookup?code=${encodeURIComponent(trimmedCode)}`)
        .then((response) => response.json())
        .then((data: { valid?: boolean; referrer?: { name: string } }) => {
          if (data.valid && data.referrer) {
            setLookup({ code: trimmedCode, status: "valid", name: data.referrer.name });
          } else {
            setLookup({ code: trimmedCode, status: "invalid", name: null });
          }
        })
        .catch(() => {
          setLookup({ code: trimmedCode, status: "invalid", name: null });
        });
    }, 250);

    return () => window.clearTimeout(handle);
  }, [trimmedCode]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (codeStatus === "invalid") {
      setError("That referral code was not found. Clear it or use a valid invite.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await api("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name,
          email,
          password,
          referralCode: referralCode.trim() || undefined,
        }),
      });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create the account");
    } finally {
      setPending(false);
    }
  }

  return (
    <Shell>
      <div className="mx-auto max-w-md">
        <h1 className="font-display text-4xl">Create an account</h1>
        <p className="mt-2 text-sm text-muted">You will get your own invite link as soon as you join.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-2xl border border-line bg-card p-5">
          {error ? <Notice tone="error">{error}</Notice> : null}
          {codeStatus === "valid" && referrerName ? (
            <Notice tone="info">You are joining through {referrerName}. Only they earn commission on your orders.</Notice>
          ) : null}
          {codeStatus === "invalid" ? <Notice tone="error">That invite code does not match an account.</Notice> : null}
          <TextField label="Name" name="name" autoComplete="name" required value={name} onChange={(event) => setName(event.target.value)} />
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
            autoComplete="new-password"
            required
            minLength={8}
            hint="At least 8 characters."
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <TextField
            label="Referral code"
            name="referralCode"
            autoComplete="off"
            hint="Optional, unless you opened someone's invite link."
            value={referralCode}
            onChange={(event) => setReferralCode(event.target.value)}
          />
          <Button type="submit" disabled={pending || codeStatus === "checking" || codeStatus === "invalid"} className="w-full">
            {pending ? "Creating account…" : "Create account"}
          </Button>
          <p className="text-sm text-muted">
            Already registered?{" "}
            <Link href="/login" className="font-medium text-accent-deep hover:underline">
              Log in
            </Link>
          </p>
        </form>
      </div>
    </Shell>
  );
}
