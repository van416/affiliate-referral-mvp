"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { Shell } from "@/components/shell";
import { Button, Card, Notice, TextField } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { formatMoney, formatRate, formatWhen } from "@/lib/format";
import type { AdminCommissionRow, AdminUserRow, SettingsResponse } from "@/lib/types";

export function AdminClient() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUserRow[] | null>(null);
  const [commissions, setCommissions] = useState<AdminCommissionRow[] | null>(null);
  const [totalCents, setTotalCents] = useState(0);
  const [percent, setPercent] = useState("");
  const [savedRate, setSavedRate] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const applyAdminData = useCallback(
    (referralData: { users: AdminUserRow[] }, commissionData: { commissions: AdminCommissionRow[]; totalCents: number }, settings: SettingsResponse) => {
      setUsers(referralData.users);
      setCommissions(commissionData.commissions);
      setTotalCents(commissionData.totalCents);
      setPercent(String(settings.commissionRatePercent));
      setSavedRate(settings.commissionRateBps);
      setError(null);
      setForbidden(false);
    },
    [],
  );

  const load = useCallback(async () => {
    const [referralData, commissionData, settings] = await Promise.all([
      api<{ users: AdminUserRow[] }>("/api/admin/referrals"),
      api<{ commissions: AdminCommissionRow[]; totalCents: number }>("/api/admin/commissions"),
      api<SettingsResponse>("/api/admin/settings"),
    ]);
    applyAdminData(referralData, commissionData, settings);
  }, [applyAdminData]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api<{ users: AdminUserRow[] }>("/api/admin/referrals"),
      api<{ commissions: AdminCommissionRow[]; totalCents: number }>("/api/admin/commissions"),
      api<SettingsResponse>("/api/admin/settings"),
    ])
      .then(([referralData, commissionData, settings]) => {
        if (!cancelled) applyAdminData(referralData, commissionData, settings);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login?next=/admin");
          return;
        }
        if (err instanceof ApiError && err.status === 403) {
          setForbidden(true);
          return;
        }
        setError(err instanceof Error ? err.message : "Could not load admin data");
      });
    return () => {
      cancelled = true;
    };
  }, [applyAdminData, router]);

  async function saveRate(event: FormEvent) {
    event.preventDefault();
    const commissionRatePercent = Number(percent);
    if (!Number.isFinite(commissionRatePercent)) {
      setFormError("Enter a commission rate from 0 to 100.");
      return;
    }
    setPending(true);
    setFormError(null);
    setMessage(null);
    try {
      const settings = await api<SettingsResponse>("/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify({ commissionRatePercent }),
      });
      setMessage(`Saved. New orders use ${formatRate(settings.commissionRateBps)}. Existing commissions stay as they were.`);
      await load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Could not save the rate");
    } finally {
      setPending(false);
    }
  }

  if (forbidden) {
    return (
      <Shell>
        <Card>
          <h1 className="font-display text-3xl">Admin only</h1>
          <p className="mt-2 text-sm text-muted">This account can use the affiliate dashboard, not the admin tools.</p>
          <Link href="/dashboard" className="mt-4 inline-flex text-sm font-medium text-accent-deep hover:underline">
            Back to dashboard
          </Link>
        </Card>
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell>
        <Notice tone="error">{error}</Notice>
      </Shell>
    );
  }

  if (!users || !commissions) {
    return (
      <Shell>
        <p className="text-sm text-muted">Loading admin…</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="font-display text-4xl">Admin</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Referral relationships, every commission, and the rate applied to future orders. This app pays one level only:
        an order credits the buyer&apos;s direct referrer.
      </p>

      <Card className="mt-6" >
        <div id="rate">
          <h2 className="font-display text-2xl">Commission rate</h2>
          <p className="mt-2 text-sm text-muted">
            Current rate: {savedRate == null ? "…" : formatRate(savedRate)}. Stored in basis points. 10% is 1000 bps.
          </p>
          <form onSubmit={saveRate} className="mt-4 flex flex-wrap items-end gap-3">
            <div className="w-48">
              <TextField
                label="Percent"
                name="commissionRatePercent"
                inputMode="decimal"
                value={percent}
                onChange={(event) => setPercent(event.target.value)}
              />
            </div>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save rate"}
            </Button>
          </form>
          <div className="mt-3 space-y-2">
            {message ? <Notice tone="ok">{message}</Notice> : null}
            {formError ? <Notice tone="error">{formError}</Notice> : null}
          </div>
        </div>
      </Card>

      <Card className="mt-4">
        <div id="relationships">
          <h2 className="font-display text-2xl">Referral relationships</h2>
          <p className="mt-2 text-sm text-muted">Each user has at most one referrer. Direct invites are counted in the last column.</p>
          <ul className="mt-3 space-y-2 md:hidden">
            {users.map((user) => (
              <li key={user.id} className="rounded-xl border border-line px-3 py-3 text-sm">
                <p className="font-medium">
                  {user.name} {user.role === "ADMIN" ? <span className="text-xs text-accent-deep">Admin</span> : null}
                </p>
                <p className="text-muted">{user.email}</p>
                <p className="mt-1">Code {user.referralCode}</p>
                <p>{user.referredBy ? `Referred by ${user.referredBy.name}` : "No referrer"}</p>
                <p className="text-muted">
                  {user.referralCount} direct {user.referralCount === 1 ? "invite" : "invites"} · {formatWhen(user.createdAt)}
                </p>
              </li>
            ))}
          </ul>
          <div className="mt-3 hidden overflow-x-auto md:block">
            <table className="w-full min-w-[48rem] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted">
                <tr className="border-b border-line">
                  <th className="py-2 pr-3 font-medium">User</th>
                  <th className="py-2 pr-3 font-medium">Code</th>
                  <th className="py-2 pr-3 font-medium">Referred by</th>
                  <th className="py-2 pr-3 font-medium">Direct invites</th>
                  <th className="py-2 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-line/80 last:border-0">
                    <td className="py-3 pr-3">
                      <span className="block font-medium">
                        {user.name} {user.role === "ADMIN" ? <span className="text-xs text-accent-deep">Admin</span> : null}
                      </span>
                      <span className="text-muted">{user.email}</span>
                    </td>
                    <td className="py-3 pr-3 font-mono text-xs">{user.referralCode}</td>
                    <td className="py-3 pr-3">
                      {user.referredBy ? (
                        <>
                          <span className="block">{user.referredBy.name}</span>
                          <span className="text-muted">{user.referredBy.email}</span>
                        </>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="py-3 pr-3">{user.referralCount}</td>
                    <td className="py-3">{formatWhen(user.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      <Card className="mt-4">
        <div id="commissions">
          <h2 className="font-display text-2xl">Commissions</h2>
          <p className="mt-2 text-sm text-muted">Total credited: {formatMoney(totalCents)}</p>
          {commissions.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No commissions yet.</p>
          ) : (
            <>
              <ul className="mt-3 space-y-2 md:hidden">
                {commissions.map((commission) => (
                  <li key={commission.id} className="rounded-xl border border-line px-3 py-3 text-sm">
                    <p className="font-medium">
                      {commission.affiliate.name} earned {formatMoney(commission.amountCents)}
                    </p>
                    <p className="text-muted">From {commission.buyer.name}</p>
                    <p className="mt-1">
                      {formatMoney(commission.order.amountCents)} order · {formatRate(commission.rateBps)}
                    </p>
                    <p className="text-muted">{formatWhen(commission.createdAt)}</p>
                  </li>
                ))}
              </ul>
              <div className="mt-3 hidden overflow-x-auto md:block">
              <table className="w-full min-w-[48rem] text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-muted">
                  <tr className="border-b border-line">
                    <th className="py-2 pr-3 font-medium">When</th>
                    <th className="py-2 pr-3 font-medium">Affiliate</th>
                    <th className="py-2 pr-3 font-medium">Buyer</th>
                    <th className="py-2 pr-3 font-medium">Order</th>
                    <th className="py-2 pr-3 font-medium">Rate</th>
                    <th className="py-2 font-medium">Commission</th>
                  </tr>
                </thead>
                <tbody>
                  {commissions.map((commission) => (
                    <tr key={commission.id} className="border-b border-line/80 last:border-0">
                      <td className="py-3 pr-3">{formatWhen(commission.createdAt)}</td>
                      <td className="py-3 pr-3">
                        <span className="block">{commission.affiliate.name}</span>
                        <span className="text-muted">{commission.affiliate.email}</span>
                      </td>
                      <td className="py-3 pr-3">
                        <span className="block">{commission.buyer.name}</span>
                        <span className="text-muted">{commission.buyer.email}</span>
                      </td>
                      <td className="py-3 pr-3">{formatMoney(commission.order.amountCents)}</td>
                      <td className="py-3 pr-3">{formatRate(commission.rateBps)}</td>
                      <td className="py-3 font-medium">{formatMoney(commission.amountCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </>
          )}
        </div>
      </Card>
    </Shell>
  );
}
