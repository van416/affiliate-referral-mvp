const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const percent = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

const when = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatMoney(cents: number): string {
  return money.format(cents / 100);
}

export function formatRate(rateBps: number): string {
  return `${percent.format(rateBps / 100)}%`;
}

export function formatWhen(iso: string): string {
  return when.format(new Date(iso));
}

export function dollarsToCents(input: string): number | null {
  const value = input.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents) || cents <= 0 || cents > 10_000_000) return null;
  return cents;
}
