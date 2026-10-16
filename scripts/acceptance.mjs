const base = process.env.BASE_URL || "http://localhost:3000";
const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
const adminPassword = process.env.ADMIN_PASSWORD || "admin123456";

function check(condition, message) {
  if (!condition) throw new Error(message);
  console.log(`✓ ${message}`);
}

class CookieJar {
  constructor() {
    this.map = new Map();
  }

  absorb(response) {
    const getter = response.headers.getSetCookie;
    const list = typeof getter === "function" ? getter.call(response.headers) : [];
    if (list.length === 0) {
      const single = response.headers.get("set-cookie");
      if (single) list.push(single);
    }
    for (const cookie of list) {
      const [pair, ...attrs] = cookie.split(";");
      const eq = pair.indexOf("=");
      const name = pair.slice(0, eq).trim();
      const value = pair.slice(eq + 1).trim();
      const expired = attrs.some((attr) => attr.trim().toLowerCase().startsWith("max-age=0"));
      if (!value || expired) this.map.delete(name);
      else this.map.set(name, value);
    }
  }

  header() {
    return [...this.map.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
  }
}

async function api(jar, path, { method = "GET", body } = {}) {
  const headers = {};
  if (body !== undefined) headers["content-type"] = "application/json";
  if (jar.header()) headers.cookie = jar.header();
  const response = await fetch(base + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  jar.absorb(response);
  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  return { status: response.status, data };
}

async function waitForHealth() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${base}/api/health`);
      if (response.ok) return;
    } catch {
      // Server is still booting.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Server at ${base} did not become healthy`);
}

async function restoreRate() {
  const admin = new CookieJar();
  const login = await api(admin, "/api/auth/login", {
    method: "POST",
    body: { email: adminEmail, password: adminPassword },
  });
  if (login.status === 200) {
    await api(admin, "/api/admin/settings", {
      method: "PUT",
      body: { commissionRatePercent: 10 },
    });
  }
}

async function main() {
  await waitForHealth();
  const stamp = Date.now();
  const password = "password123";
  const aliceEmail = `alice.${stamp}@example.com`;
  const bobEmail = `bob.${stamp}@example.com`;
  const caraEmail = `cara.${stamp}@example.com`;

  const anon = new CookieJar();
  const unauthOrder = await api(anon, "/api/orders", { method: "POST", body: { amountCents: 1000 } });
  check(unauthOrder.status === 401, "orders require a session");

  const alice = new CookieJar();
  const aliceRegister = await api(alice, "/api/auth/register", {
    method: "POST",
    body: { name: "Alice", email: aliceEmail, password },
  });
  check(aliceRegister.status === 201, "Alice can register");
  check(aliceRegister.data.user.referredBy === null, "Alice has no referrer");
  const aliceCode = aliceRegister.data.user.referralCode;
  check(typeof aliceCode === "string" && aliceCode.length > 0, "Alice receives a referral code");

  const lookup = await api(anon, `/api/referrals/lookup?code=${aliceCode}`);
  check(lookup.status === 200 && lookup.data.valid === true, "Alice's code can be looked up");
  check(lookup.data.referrer.email === undefined, "lookup does not leak the referrer email");

  const badCode = await api(new CookieJar(), "/api/auth/register", {
    method: "POST",
    body: { name: "Nope", email: `nope.${stamp}@example.com`, password, referralCode: "NOT-A-CODE" },
  });
  check(badCode.status === 400, "unknown referral codes are rejected");

  const duplicate = await api(new CookieJar(), "/api/auth/register", {
    method: "POST",
    body: { name: "Alice Again", email: aliceEmail, password },
  });
  check(duplicate.status === 409, "duplicate emails are rejected");

  const bob = new CookieJar();
  const bobRegister = await api(bob, "/api/auth/register", {
    method: "POST",
    body: { name: "Bob", email: bobEmail, password, referralCode: aliceCode.toLowerCase() },
  });
  check(bobRegister.status === 201, "Bob can register with Alice's code");
  check(bobRegister.data.user.referredBy.referralCode === aliceCode, "Bob is bound to Alice");
  const bobCode = bobRegister.data.user.referralCode;

  const aliceForbidden = await api(alice, "/api/admin/referrals");
  check(aliceForbidden.status === 403, "affiliates cannot open admin data");

  const badOrder = await api(bob, "/api/orders", { method: "POST", body: { amountCents: 0 } });
  check(badOrder.status === 400, "zero-amount orders are rejected");

  const bobOrder = await api(bob, "/api/orders", { method: "POST", body: { amountCents: 10_000 } });
  check(bobOrder.status === 201, "Bob can place a simulated order");
  check(bobOrder.data.commission.amountCents === 1_000, "default 10% of $100 is $10");
  check(bobOrder.data.commission.affiliate.referralCode === aliceCode, "the commission affiliate is Alice");

  const aliceDash = await api(alice, "/api/dashboard");
  check(aliceDash.status === 200, "Alice can load the dashboard");
  check(aliceDash.data.stats.commissionTotalCents === 1_000, "Alice's total is $10");
  check(aliceDash.data.stats.referralCount === 1, "Alice has one direct referral");
  check(aliceDash.data.commissions.length === 1, "Alice sees one commission");
  check(aliceDash.data.referralLink.includes(`/register?ref=${aliceCode}`), "dashboard includes Alice's invite link");

  const bobDash = await api(bob, "/api/dashboard");
  check(bobDash.data.stats.commissionTotalCents === 0, "Bob earned nothing from his own order");

  const cara = new CookieJar();
  const caraRegister = await api(cara, "/api/auth/register", {
    method: "POST",
    body: { name: "Cara", email: caraEmail, password, referralCode: bobCode },
  });
  check(caraRegister.status === 201, "Cara can register with Bob's code");
  const caraOrder = await api(cara, "/api/orders", { method: "POST", body: { amountCents: 10_000 } });
  check(caraOrder.data.commission.amountCents === 1_000, "Cara's order pays Bob $10");
  check(caraOrder.data.commission.affiliate.referralCode === bobCode, "Cara's commission affiliate is Bob");

  const aliceAfter = await api(alice, "/api/dashboard");
  check(aliceAfter.data.stats.commissionTotalCents === 1_000, "Alice does not earn from Cara's order");
  check(aliceAfter.data.stats.referralCount === 1, "Cara is not Alice's direct referral");
  const bobAfter = await api(bob, "/api/dashboard");
  check(bobAfter.data.stats.commissionTotalCents === 1_000, "Bob earned the single-level commission");

  const loggedOut = new CookieJar();
  const adminBlocked = await api(loggedOut, "/api/admin/settings");
  check(adminBlocked.status === 401, "admin routes require a session");

  const admin = new CookieJar();
  const badLogin = await api(admin, "/api/auth/login", {
    method: "POST",
    body: { email: adminEmail, password: "wrong-password" },
  });
  check(badLogin.status === 401, "bad admin passwords are rejected");

  const adminLogin = await api(admin, "/api/auth/login", {
    method: "POST",
    body: { email: adminEmail, password: adminPassword },
  });
  check(adminLogin.status === 200 && adminLogin.data.user.role === "ADMIN", "seeded admin can log in");

  const relations = await api(admin, "/api/admin/referrals");
  const byEmail = new Map(relations.data.users.map((user) => [user.email, user]));
  check(byEmail.get(bobEmail)?.referredBy?.email === aliceEmail, "admin sees Bob referred by Alice");
  check(byEmail.get(caraEmail)?.referredBy?.email === bobEmail, "admin sees Cara referred by Bob");
  check(byEmail.get(aliceEmail)?.referralCount === 1, "admin counts Alice's direct invites");

  const commissionList = await api(admin, "/api/admin/commissions");
  const relevant = commissionList.data.commissions.filter((row) =>
    [aliceEmail, bobEmail].includes(row.affiliate.email) && [bobEmail, caraEmail].includes(row.buyer.email),
  );
  check(relevant.length === 2, "admin lists both commissions in this chain");

  const rateUpdate = await api(admin, "/api/admin/settings", {
    method: "PUT",
    body: { commissionRatePercent: 20 },
  });
  check(rateUpdate.status === 200 && rateUpdate.data.commissionRateBps === 2_000, "admin can set the rate to 20%");

  const secondOrder = await api(cara, "/api/orders", { method: "POST", body: { amountCents: 2_500 } });
  check(secondOrder.data.commission.amountCents === 500, "the new order uses 20%");
  check(secondOrder.data.commission.rateBps === 2_000, "the new commission snapshots 2000 bps");

  const bobFinal = await api(bob, "/api/dashboard");
  check(bobFinal.data.stats.commissionTotalCents === 1_500, "Bob's total includes the new rate");
  const aliceFinal = await api(alice, "/api/dashboard");
  check(aliceFinal.data.stats.commissionTotalCents === 1_000, "Alice's earlier commission is unchanged");

  const logout = await api(admin, "/api/auth/logout", { method: "POST" });
  check(logout.status === 200, "admin can log out");
  const afterLogout = await api(admin, "/api/me");
  check(afterLogout.status === 401, "the session cookie is cleared");

  console.log("Acceptance checks passed.");
}

try {
  await main();
} catch (error) {
  console.error(`FAIL: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
} finally {
  await restoreRate().catch(() => {});
}
