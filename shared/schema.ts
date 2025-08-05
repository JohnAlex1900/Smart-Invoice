import { z } from "zod";

// 🧾 User model
export interface User {
  id: string;
  email: string;
  businessName: string;
  contactPerson: string;
  firebaseUid: string;
  phone: string | null;
  address: string | null;
  defaultCurrency: string;
  defaultTaxRate: string;
  defaultPaymentTerms: number;
  createdAt: Date;
  updatedAt: Date;
}

// 🧾 Client model
export interface Client {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// 🧾 Invoice model
export interface Invoice {
  id: string;
  userId: string;
  clientId: string;
  invoiceNumber: string;
  status: "pending" | "paid" | "overdue";
  currency: string;
  subtotal: string;
  taxRate: string;
  taxAmount: string;
  total: string;
  notes: string | null;
  invoiceDate: Date;
  dueDate: Date;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// 🧾 InvoiceItem model
export interface InvoiceItem {
  id: string;
  invoiceId: string;
  description: string;
  quantity: string;
  rate: string;
  amount: string;
  createdAt: Date;
}

// 🔁 Firestore insert types (omit auto-generated fields)
export type InsertUser = Omit<User, "id" | "createdAt" | "updatedAt">;
export type InsertClient = Omit<Client, "id" | "createdAt" | "updatedAt">;
export type InsertInvoice = Omit<Invoice, "id" | "createdAt" | "updatedAt">;
export type InsertInvoiceItem = Omit<
  InvoiceItem,
  "id" | "createdAt" | "invoiceId"
>;

// 🔗 Extended relation types
export type InvoiceWithDetails = Invoice & {
  client: Client;
  items: InvoiceItem[];
};

export type ClientWithStats = Client & {
  invoiceCount: number;
  totalAmount: string;
};
