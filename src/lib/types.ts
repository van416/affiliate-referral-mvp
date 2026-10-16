export type Role = "USER" | "ADMIN";

export type PublicUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  referralCode: string;
  createdAt: string;
  referredBy: {
    id: string;
    name: string;
    referralCode: string;
  } | null;
};

export type DashboardResponse = {
  user: PublicUser;
  referralLink: string;
  commissionRateBps: number;
  stats: {
    referralCount: number;
    commissionCount: number;
    commissionTotalCents: number;
    referredSalesCents: number;
  };
  referrals: Array<{
    id: string;
    name: string;
    email: string;
    referralCode: string;
    createdAt: string;
  }>;
  commissions: Array<{
    id: string;
    amountCents: number;
    rateBps: number;
    createdAt: string;
    order: { id: string; amountCents: number; createdAt: string };
    buyer: { id: string; name: string; email: string };
  }>;
  orders: Array<{
    id: string;
    amountCents: number;
    createdAt: string;
    commission: null | {
      amountCents: number;
      rateBps: number;
      affiliate: { name: string; referralCode: string };
    };
  }>;
};

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  role: Role;
  referralCode: string;
  createdAt: string;
  referralCount: number;
  referredBy: { id: string; name: string; email: string; referralCode: string } | null;
};

export type AdminCommissionRow = {
  id: string;
  amountCents: number;
  rateBps: number;
  createdAt: string;
  order: { id: string; amountCents: number; createdAt: string };
  affiliate: { id: string; name: string; email: string; referralCode: string };
  buyer: { id: string; name: string; email: string };
};

export type SettingsResponse = {
  commissionRateBps: number;
  commissionRatePercent: number;
};

export type OrderResponse = {
  order: { id: string; amountCents: number; createdAt: string };
  commission: null | {
    id: string;
    amountCents: number;
    rateBps: number;
    affiliate: { id: string; name: string; referralCode: string };
  };
};
