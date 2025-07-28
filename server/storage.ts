import { 
  users, 
  clients, 
  invoices, 
  invoiceItems, 
  type User, 
  type InsertUser, 
  type Client, 
  type InsertClient, 
  type Invoice, 
  type InvoiceWithDetails, 
  type InsertInvoice, 
  type InvoiceItem, 
  type InsertInvoiceItem,
  type ClientWithStats 
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, count } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User>;

  // Client methods
  getClientsByUserId(userId: string): Promise<ClientWithStats[]>;
  getClient(id: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, updates: Partial<InsertClient>): Promise<Client>;
  deleteClient(id: string): Promise<void>;

  // Invoice methods
  getInvoicesByUserId(userId: string, filters?: { status?: string; search?: string }): Promise<InvoiceWithDetails[]>;
  getInvoice(id: string): Promise<InvoiceWithDetails | undefined>;
  createInvoice(invoice: InsertInvoice, items: InsertInvoiceItem[]): Promise<InvoiceWithDetails>;
  updateInvoice(id: string, updates: Partial<InsertInvoice>): Promise<Invoice>;
  updateInvoiceStatus(id: string, status: string): Promise<Invoice>;
  deleteInvoice(id: string): Promise<void>;

  // Dashboard metrics
  getDashboardMetrics(userId: string): Promise<{
    totalInvoices: number;
    pendingAmount: string;
    totalClients: number;
    totalRevenue: string;
  }>;

  // Recent activity
  getRecentInvoices(userId: string, limit: number): Promise<InvoiceWithDetails[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.firebaseUid, firebaseUid));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        updatedAt: new Date(),
      })
      .returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getClientsByUserId(userId: string): Promise<ClientWithStats[]> {
    const result = await db
      .select({
        id: clients.id,
        userId: clients.userId,
        name: clients.name,
        email: clients.email,
        phone: clients.phone,
        address: clients.address,
        createdAt: clients.createdAt,
        updatedAt: clients.updatedAt,
        invoiceCount: count(invoices.id),
        totalAmount: sql<string>`COALESCE(SUM(${invoices.total}), 0)`,
      })
      .from(clients)
      .leftJoin(invoices, eq(clients.id, invoices.clientId))
      .where(eq(clients.userId, userId))
      .groupBy(clients.id)
      .orderBy(desc(clients.createdAt));

    return result;
  }

  async getClient(id: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client || undefined;
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const [client] = await db
      .insert(clients)
      .values({
        ...insertClient,
        updatedAt: new Date(),
      })
      .returning();
    return client;
  }

  async updateClient(id: string, updates: Partial<InsertClient>): Promise<Client> {
    const [client] = await db
      .update(clients)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(clients.id, id))
      .returning();
    return client;
  }

  async deleteClient(id: string): Promise<void> {
    await db.delete(clients).where(eq(clients.id, id));
  }

  async getInvoicesByUserId(userId: string, filters?: { status?: string; search?: string }): Promise<InvoiceWithDetails[]> {
    let query = db
      .select()
      .from(invoices)
      .leftJoin(clients, eq(invoices.clientId, clients.id))
      .leftJoin(invoiceItems, eq(invoices.id, invoiceItems.invoiceId))
      .where(eq(invoices.userId, userId));

    if (filters?.status && filters.status !== 'all') {
      const baseQuery = db
        .select()
        .from(invoices)
        .leftJoin(clients, eq(invoices.clientId, clients.id))
        .leftJoin(invoiceItems, eq(invoices.id, invoiceItems.invoiceId))
        .where(and(eq(invoices.userId, userId), eq(invoices.status, filters.status)));
      
      const results = await baseQuery.orderBy(desc(invoices.createdAt));
      
      // Group results by invoice
      const invoiceMap = new Map<string, InvoiceWithDetails>();
      
      for (const row of results) {
        const invoice = row.invoices;
        const client = row.clients;
        const item = row.invoice_items;

        if (!invoiceMap.has(invoice.id)) {
          invoiceMap.set(invoice.id, {
            ...invoice,
            client: client!,
            items: [],
          });
        }

        if (item) {
          invoiceMap.get(invoice.id)!.items.push(item);
        }
      }

      return Array.from(invoiceMap.values());
    }

    const results = await query.orderBy(desc(invoices.createdAt));

    // Group results by invoice
    const invoiceMap = new Map<string, InvoiceWithDetails>();
    
    for (const row of results) {
      const invoice = row.invoices;
      const client = row.clients;
      const item = row.invoice_items;

      if (!invoiceMap.has(invoice.id)) {
        invoiceMap.set(invoice.id, {
          ...invoice,
          client: client!,
          items: [],
        });
      }

      if (item) {
        invoiceMap.get(invoice.id)!.items.push(item);
      }
    }

    return Array.from(invoiceMap.values());
  }

  async getInvoice(id: string): Promise<InvoiceWithDetails | undefined> {
    const results = await db
      .select()
      .from(invoices)
      .leftJoin(clients, eq(invoices.clientId, clients.id))
      .leftJoin(invoiceItems, eq(invoices.id, invoiceItems.invoiceId))
      .where(eq(invoices.id, id));

    if (results.length === 0) return undefined;

    const invoice = results[0].invoices;
    const client = results[0].clients!;
    const items = results.map(r => r.invoice_items).filter(Boolean) as InvoiceItem[];

    return {
      ...invoice,
      client,
      items,
    };
  }

  async createInvoice(insertInvoice: InsertInvoice, items: InsertInvoiceItem[]): Promise<InvoiceWithDetails> {
    const [invoice] = await db
      .insert(invoices)
      .values({
        ...insertInvoice,
        updatedAt: new Date(),
      })
      .returning();

    // Insert invoice items
    if (items.length > 0) {
      await db.insert(invoiceItems).values(
        items.map(item => ({
          ...item,
          invoiceId: invoice.id,
        }))
      );
    }

    // Return the complete invoice with details
    const result = await this.getInvoice(invoice.id);
    return result!;
  }

  async updateInvoice(id: string, updates: Partial<InsertInvoice>): Promise<Invoice> {
    const [invoice] = await db
      .update(invoices)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(invoices.id, id))
      .returning();
    return invoice;
  }

  async updateInvoiceStatus(id: string, status: string): Promise<Invoice> {
    const updateData: any = { status, updatedAt: new Date() };
    if (status === 'paid') {
      updateData.paidAt = new Date();
    }

    const [invoice] = await db
      .update(invoices)
      .set(updateData)
      .where(eq(invoices.id, id))
      .returning();
    return invoice;
  }

  async deleteInvoice(id: string): Promise<void> {
    await db.delete(invoices).where(eq(invoices.id, id));
  }

  async getDashboardMetrics(userId: string): Promise<{
    totalInvoices: number;
    pendingAmount: string;
    totalClients: number;
    totalRevenue: string;
  }> {
    const [invoiceMetrics] = await db
      .select({
        totalInvoices: count(invoices.id),
        pendingAmount: sql<string>`COALESCE(SUM(CASE WHEN ${invoices.status} = 'pending' THEN ${invoices.total} ELSE 0 END), 0)`,
        totalRevenue: sql<string>`COALESCE(SUM(CASE WHEN ${invoices.status} = 'paid' THEN ${invoices.total} ELSE 0 END), 0)`,
      })
      .from(invoices)
      .where(eq(invoices.userId, userId));

    const [clientMetrics] = await db
      .select({
        totalClients: count(clients.id),
      })
      .from(clients)
      .where(eq(clients.userId, userId));

    return {
      totalInvoices: invoiceMetrics.totalInvoices,
      pendingAmount: invoiceMetrics.pendingAmount,
      totalClients: clientMetrics.totalClients,
      totalRevenue: invoiceMetrics.totalRevenue,
    };
  }

  async getRecentInvoices(userId: string, limit: number): Promise<InvoiceWithDetails[]> {
    const results = await db
      .select()
      .from(invoices)
      .leftJoin(clients, eq(invoices.clientId, clients.id))
      .leftJoin(invoiceItems, eq(invoices.id, invoiceItems.invoiceId))
      .where(eq(invoices.userId, userId))
      .orderBy(desc(invoices.createdAt))
      .limit(limit * 10); // Get more to account for grouping

    // Group results by invoice
    const invoiceMap = new Map<string, InvoiceWithDetails>();
    
    for (const row of results) {
      const invoice = row.invoices;
      const client = row.clients;
      const item = row.invoice_items;

      if (!invoiceMap.has(invoice.id) && invoiceMap.size < limit) {
        invoiceMap.set(invoice.id, {
          ...invoice,
          client: client!,
          items: [],
        });
      }

      if (item && invoiceMap.has(invoice.id)) {
        invoiceMap.get(invoice.id)!.items.push(item);
      }
    }

    return Array.from(invoiceMap.values()).slice(0, limit);
  }
}

export const storage = new DatabaseStorage();
