import { Prisma } from "@prisma/client";

export const publicUserSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  referralCode: true,
  createdAt: true,
  referredBy: {
    select: {
      id: true,
      name: true,
      referralCode: true,
    },
  },
} satisfies Prisma.UserSelect;

export type PublicUserRecord = Prisma.UserGetPayload<{ select: typeof publicUserSelect }>;

export function serializeUser(user: PublicUserRecord) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    referralCode: user.referralCode,
    createdAt: user.createdAt.toISOString(),
    referredBy: user.referredBy
      ? {
          id: user.referredBy.id,
          name: user.referredBy.name,
          referralCode: user.referredBy.referralCode,
        }
      : null,
  };
}
