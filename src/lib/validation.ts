import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80, "Name is too long"),
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(200, "Email is too long"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be at most 72 characters"),
  referralCode: z.preprocess(
    (value) => (value == null ? undefined : value),
    z.string().trim().max(32, "Referral code is too long").optional(),
  ),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Password is required").max(72, "Password must be at most 72 characters"),
});

export const orderSchema = z.object({
  amountCents: z
    .number({ invalid_type_error: "amountCents must be a number of cents" })
    .int("amountCents must be a whole number of cents")
    .positive("amountCents must be greater than zero")
    .max(10_000_000, "amountCents cannot exceed 10000000 ($100,000)"),
});

export const settingsSchema = z.object({
  commissionRatePercent: z.number({
    invalid_type_error: "commissionRatePercent must be a number",
  }),
});

export function firstZodMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid input";
}
