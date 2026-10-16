import { HomeActions } from "@/components/home-actions";
import { Shell } from "@/components/shell";

const steps = [
  {
    title: "Share your code",
    body: "Every account gets one invite link. Send it to someone who does not have an account yet.",
  },
  {
    title: "They join through it",
    body: "Registration stores a single referrer. That binding does not change, and it does not create a downline.",
  },
  {
    title: "Their order pays you",
    body: "A simulated purchase credits commission only to the person who invited the buyer.",
  },
];

export default function HomePage() {
  return (
    <Shell>
      <section className="max-w-3xl">
        <p className="text-sm font-medium tracking-wide text-accent-deep">Single-level commissions</p>
        <h1 className="mt-3 font-display text-5xl leading-tight tracking-tight text-ink sm:text-6xl">
          The invite that pays once.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted">
          FirstLink binds a new account to the person who invited them. When that account places an order, only the
          direct referrer earns a commission. The people they invite later do not pay anyone further up the chain.
        </p>
        <div className="mt-8">
          <HomeActions />
        </div>
      </section>

      <section className="mt-14 grid gap-4 md:grid-cols-3">
        {steps.map((step, index) => (
          <article key={step.title} className="rounded-2xl border border-line bg-card p-5">
            <p className="font-display text-3xl text-accent">{index + 1}</p>
            <h2 className="mt-2 font-display text-2xl">{step.title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{step.body}</p>
          </article>
        ))}
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-2xl border border-line bg-card p-5">
          <h2 className="font-display text-2xl">How a dollar moves</h2>
          <p className="mt-2 text-sm text-muted">Default rate is 10%. Ada invited Ben. Ben invited Cho.</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[28rem] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted">
                <tr className="border-b border-line">
                  <th className="py-2 pr-3 font-medium">Order</th>
                  <th className="py-2 pr-3 font-medium">Ada</th>
                  <th className="py-2 font-medium">Ben</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-line/80">
                  <td className="py-3 pr-3">Ben buys $100</td>
                  <td className="py-3 pr-3 font-medium text-accent-deep">+$10</td>
                  <td className="py-3 text-muted">$0</td>
                </tr>
                <tr>
                  <td className="py-3 pr-3">Cho buys $100</td>
                  <td className="py-3 pr-3 text-muted">$0</td>
                  <td className="py-3 font-medium text-accent-deep">+$10</td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>
        <article className="rounded-2xl border border-line bg-accent-deep p-5 text-white">
          <h2 className="font-display text-2xl">What this demo is</h2>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-white/85">
            <li>Email and password accounts, with an admin seed user.</li>
            <li>A simulated order API. No card network and no payouts.</li>
            <li>One global commission rate, snapshotted onto each commission.</li>
          </ul>
        </article>
      </section>
    </Shell>
  );
}
