// validation.ts
import { z } from "zod";

// 🧾 Manual Zod schemas
export const userSchema = z.object({
  email: z.string().email(),
  businessName: z.string(),
  contactPerson: z.string(),
  firebaseUid: z.string(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  defaultCurrency: z.string(),
  defaultTaxRate: z.string(),
  defaultPaymentTerms: z.number(),
});

export const clientSchema = z.object({
  userId: z.string(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
});

export const invoiceSchema = z.object({
  userId: z.string(),
  clientId: z.string(),
  invoiceNumber: z.string(),
  status: z.enum(["pending", "paid", "overdue"]).optional(),
  currency: z.string(),
  subtotal: z.string(),
  taxRate: z.string(),
  taxAmount: z.string(),
  total: z.string(),
  notes: z.string().nullable().optional(),
  invoiceDate: z
    .union([z.string(), z.date()])
    .transform((val) => (typeof val === "string" ? new Date(val) : val)),

  dueDate: z
    .union([z.string(), z.date()])
    .transform((val) => (typeof val === "string" ? new Date(val) : val)),

  paidAt: z
    .union([z.string(), z.date(), z.null()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined) return null;
      return typeof val === "string" ? new Date(val) : val;
    }),
});

export const invoiceItemSchema = z.object({
  description: z.string(),
  quantity: z.string(),
  rate: z.string(),
  amount: z.string(),
});
