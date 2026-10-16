"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { Shell } from "@/components/shell";
import { Button, Card, Notice, TextField } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { dollarsToCents, formatMoney, formatRate, formatWhen } from "@/lib/format";
import type { DashboardResponse, OrderResponse } from "@/lib/types";

export function DashboardClient() {
  const router = useRouter();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState("100.00");
  const [orderMessage, setOrderMessage] = useState<string | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const next = await api<DashboardResponse>("/api/dashboard");
      setData(next);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/login");
        return;
      }
      setError(err instanceof Error ? err.message : "Could not load the dashboard");
    }
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    api<DashboardResponse>("/api/dashboard")
      .then((next) => {
        if (cancelled) return;
        setData(next);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
          return;
        }
        setError(err instanceof Error ? err.message : "Could not load the dashboard");
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function copyLink() {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.referralLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      const field = document.getElementById("referral-link");
      if (field instanceof HTMLInputElement) field.select();
      setOrderError("Could not copy automatically. The invite link is selected so you can copy it.");
    }
  }

  async function placeOrder(event: FormEvent) {
    event.preventDefault();
    const amountCents = dollarsToCents(amount);
    if (amountCents == null) {
      setOrderError("Enter an amount from $0.01 to $100,000.00, with at most two decimal places.");
      setOrderMessage(null);
      return;
    }
    setPending(true);
    setOrderError(null);
    setOrderMessage(null);
    try {
      const result = await api<OrderResponse>("/api/orders", {
        method: "POST",
        body: JSON.stringify({ amountCents }),
      });
      if (result.commission) {
        setOrderMessage(
          `Order placed. ${formatMoney(result.commission.amountCents)} was credited to ${result.commission.affiliate.name}.`,
        );
      } else {
        setOrderMessage("Order placed. You have no referrer, so nobody earned a commission.");
      }
      await load();
    } catch (err) {
      setOrderError(err instanceof ApiError ? err.message : "Could not place the order");
    } finally {
      setPending(false);
    }
  }

  if (error) {
    return (
      <Shell>
        <Notice tone="error">{error}</Notice>
      </Shell>
    );
  }

  if (!data) {
    return (
      <Shell>
        <p className="text-sm text-muted">Loading your dashboard…</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl">Your invite</h1>
          <p className="mt-2 text-sm text-muted">
            Commission rate on new orders is {formatRate(data.commissionRateBps)}. Older commissions keep the rate they
            were created with.
          </p>
        </div>
      </div>

      <Card className="mt-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-muted">Invite link</p>
            <p className="mt-1 font-display text-3xl tracking-tight">{data.user.referralCode}</p>
          </div>
          <Button type="button" variant="secondary" onClick={() => void copyLink()}>
            {copied ? "Copied" : "Copy link"}
          </Button>
        </div>
        <label className="mt-4 block text-sm">
          <span className="sr-only">Referral link</span>
          <input id="referral-link" readOnly value={data.referralLink} className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm" />
        </label>
        {data.user.referredBy ? (
          <p className="mt-3 text-sm text-muted">
            You joined through {data.user.referredBy.name} ({data.user.referredBy.referralCode}). Orders you place pay
            them, not you.
          </p>
        ) : (
          <p className="mt-3 text-sm text-muted">Nobody referred you. Orders you place do not create a commission.</p>
        )}
      </Card>

      <section className="mt-4 grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-muted">People you invited</p>
          <p className="mt-1 font-display text-3xl">{data.stats.referralCount}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Commission earned</p>
          <p className="mt-1 font-display text-3xl">{formatMoney(data.stats.commissionTotalCents)}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Sales from your invites</p>
          <p className="mt-1 font-display text-3xl">{formatMoney(data.stats.referredSalesCents)}</p>
        </Card>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-display text-2xl">Place a simulated order</h2>
          <p className="mt-2 text-sm text-muted">
            This purchase belongs to you. Commission goes to the person who invited you. To earn commission yourself,
            someone you invited needs to place the order.
          </p>
          <form onSubmit={placeOrder} className="mt-4 space-y-3">
            {orderMessage ? <Notice tone="ok">{orderMessage}</Notice> : null}
            {orderError ? <Notice tone="error">{orderError}</Notice> : null}
            <TextField
              label="Order amount (USD)"
              name="amount"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
            <Button type="submit" disabled={pending}>
              {pending ? "Placing order…" : "Place order"}
            </Button>
          </form>
        </Card>

        <Card>
          <h2 className="font-display text-2xl">People you invited</h2>
          {data.referrals.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No one has registered with your link yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line text-sm">
              {data.referrals.map((referral) => (
                <li key={referral.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <span>
                    <span className="block font-medium">{referral.name}</span>
                    <span className="text-muted">{referral.email}</span>
                  </span>
                  <span className="text-muted">{formatWhen(referral.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mt-4">
        <h2 className="font-display text-2xl">Commissions</h2>
        {data.commissions.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No commissions yet. They appear when someone you invited places an order.</p>
        ) : (
          <>
            <ul className="mt-3 space-y-2 md:hidden">
              {data.commissions.map((commission) => (
                <li key={commission.id} className="rounded-xl border border-line px-3 py-3 text-sm">
                  <p className="font-medium">{commission.buyer.name}</p>
                  <p className="text-muted">{commission.buyer.email}</p>
                  <p className="mt-1">
                    {formatMoney(commission.order.amountCents)} order · {formatRate(commission.rateBps)} ·{" "}
                    {formatMoney(commission.amountCents)}
                  </p>
                  <p className="text-muted">{formatWhen(commission.createdAt)}</p>
                </li>
              ))}
            </ul>
            <div className="mt-3 hidden overflow-x-auto md:block">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted">
                <tr className="border-b border-line">
                  <th className="py-2 pr-3 font-medium">When</th>
                  <th className="py-2 pr-3 font-medium">Buyer</th>
                  <th className="py-2 pr-3 font-medium">Order</th>
                  <th className="py-2 pr-3 font-medium">Rate</th>
                  <th className="py-2 font-medium">Commission</th>
                </tr>
              </thead>
              <tbody>
                {data.commissions.map((commission) => (
                  <tr key={commission.id} className="border-b border-line/80 last:border-0">
                    <td className="py-3 pr-3">{formatWhen(commission.createdAt)}</td>
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
      </Card>

      <Card className="mt-4">
        <h2 className="font-display text-2xl">Your orders</h2>
        {data.orders.length === 0 ? (
          <p className="mt-3 text-sm text-muted">You have not placed a simulated order yet.</p>
        ) : (
          <>
            <ul className="mt-3 space-y-2 md:hidden">
              {data.orders.map((order) => (
                <li key={order.id} className="rounded-xl border border-line px-3 py-3 text-sm">
                  <p className="font-medium">{formatMoney(order.amountCents)}</p>
                  <p className="text-muted">{formatWhen(order.createdAt)}</p>
                  <p className="mt-1">
                    {order.commission
                      ? `Credited ${formatMoney(order.commission.amountCents)} to ${order.commission.affiliate.name}`
                      : "No referrer"}
                  </p>
                </li>
              ))}
            </ul>
            <div className="mt-3 hidden overflow-x-auto md:block">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted">
                <tr className="border-b border-line">
                  <th className="py-2 pr-3 font-medium">When</th>
                  <th className="py-2 pr-3 font-medium">Amount</th>
                  <th className="py-2 font-medium">Credited to</th>
                </tr>
              </thead>
              <tbody>
                {data.orders.map((order) => (
                  <tr key={order.id} className="border-b border-line/80 last:border-0">
                    <td className="py-3 pr-3">{formatWhen(order.createdAt)}</td>
                    <td className="py-3 pr-3">{formatMoney(order.amountCents)}</td>
                    <td className="py-3">
                      {order.commission
                        ? `${order.commission.affiliate.name} · ${formatMoney(order.commission.amountCents)}`
                        : "No referrer"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </>
        )}
      </Card>
    </Shell>
  );
}
