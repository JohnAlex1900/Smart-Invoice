import {
  type User,
  type InsertUser,
  type Client,
  type InsertClient,
  type Invoice,
  type InvoiceWithDetails,
  type InsertInvoice,
  type InvoiceItem,
  type InsertInvoiceItem,
  type ClientWithStats,
} from "@shared/schema";
import { admin } from "./firebaseAdmin"; // import Firestore
import { v4 as uuidv4 } from "uuid"; // to generate unique IDs if needed
import { getFirestore } from "firebase-admin/firestore";

const validStatuses = ["pending", "paid", "overdue"] as const;
type InvoiceStatus = (typeof validStatuses)[number];

function isValidStatus(status: string): status is InvoiceStatus {
  return validStatuses.includes(status as InvoiceStatus);
}

function toJsDate(value: any): Date | null {
  if (!value) return null;
  return typeof value.toDate === "function" ? value.toDate() : value;
}

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
  getInvoicesByUserId(
    userId: string,
    filters?: { status?: string; search?: string }
  ): Promise<InvoiceWithDetails[]>;
  getInvoice(id: string): Promise<InvoiceWithDetails | undefined>;
  createInvoice(
    invoice: InsertInvoice,
    items: InsertInvoiceItem[]
  ): Promise<InvoiceWithDetails>;
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
  getRecentInvoices(
    userId: string,
    limit: number
  ): Promise<InvoiceWithDetails[]>;
}

export class FirestoreStorage implements IStorage {
  private db;

  constructor() {
    this.db = getFirestore(); // this assigns Firestore instance
  }

  async getUser(id: string): Promise<User | undefined> {
    const doc = await this.db.collection("users").doc(id).get();
    return doc.exists ? (doc.data() as User) : undefined;
  }

  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    const querySnapshot = await this.db
      .collection("users")
      .where("firebaseUid", "==", firebaseUid)
      .limit(1)
      .get();

    if (querySnapshot.empty) {
      return undefined; // ✅ nothing found, return undefined safely
    }

    const doc = querySnapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    } as User;
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = uuidv4(); // generate unique ID if not passed
    const userData: User = {
      id,
      email: user.email,
      businessName: user.businessName,
      contactPerson: user.contactPerson,
      firebaseUid: user.firebaseUid,
      phone: user.phone ?? null,
      address: user.address ?? null,
      defaultCurrency: user.defaultCurrency ?? "",
      defaultTaxRate: user.defaultTaxRate ?? "",
      defaultPaymentTerms: user.defaultPaymentTerms ?? 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.db.collection("users").doc(id).set(userData);
    return userData;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User> {
    const updatedAt = new Date();
    await this.db
      .collection("users")
      .doc(id)
      .update({ ...updates, updatedAt });

    const updatedUser = await this.getUser(id);
    return updatedUser!;
  }

  async getClientsByUserId(userId: string): Promise<ClientWithStats[]> {
    const snapshot = await this.db
      .collection("clients")
      .where("userId", "==", userId)
      .get();

    const clients: ClientWithStats[] = [];

    for (const doc of snapshot.docs) {
      const client = doc.data() as Client;

      // Get invoices related to this client
      const invoicesSnapshot = await this.db
        .collection("invoices")
        .where("clientId", "==", client.id)
        .get();

      const invoiceCount = invoicesSnapshot.size;
      let totalAmount = 0;

      invoicesSnapshot.forEach((invDoc) => {
        const invoice = invDoc.data();
        totalAmount += Number(invoice.total || 0);
      });

      clients.push({
        ...client,
        invoiceCount,
        totalAmount: totalAmount.toFixed(2),
      });
    }

    // Sort by createdAt descending
    clients.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return clients;
  }

  async getClient(id: string): Promise<Client | undefined> {
    const doc = await this.db.collection("clients").doc(id).get();
    return doc.exists ? (doc.data() as Client) : undefined;
  }

  async createClient(client: InsertClient): Promise<Client> {
    const id = uuidv4();
    const clientData: Client = {
      id,
      name: client.name,
      email: client.email,
      userId: client.userId,
      phone: client.phone ?? null,
      address: client.address ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.db.collection("clients").doc(id).set(clientData);
    return clientData;
  }

  async updateClient(
    id: string,
    updates: Partial<InsertClient>
  ): Promise<Client> {
    const updatedAt = new Date();
    await this.db
      .collection("clients")
      .doc(id)
      .update({ ...updates, updatedAt });
    const updatedClient = await this.getClient(id);
    return updatedClient!;
  }

  async deleteClient(id: string): Promise<void> {
    await this.db.collection("clients").doc(id).delete();
  }

  //Invoice Operations

  async getInvoicesByUserId(
    userId: string,
    filters?: { status?: string; search?: string }
  ): Promise<InvoiceWithDetails[]> {
    let queryRef = this.db.collection("invoices").where("userId", "==", userId);

    if (filters?.status) {
      queryRef = queryRef.where("status", "==", filters.status);
    }

    const snapshot = await queryRef.get();
    const invoices: InvoiceWithDetails[] = [];

    for (const docSnap of snapshot.docs) {
      const invoice = docSnap.data() as Invoice;
      invoice.id = docSnap.id;

      // ✅ Safe timestamp conversion
      invoice.invoiceDate = toJsDate(invoice.invoiceDate)!;
      invoice.dueDate = toJsDate(invoice.dueDate)!;
      invoice.createdAt = toJsDate(invoice.createdAt)!;
      invoice.updatedAt = toJsDate(invoice.updatedAt)!;

      const paidAt = toJsDate(invoice.paidAt);
      invoice.paidAt = paidAt ?? null;

      const clientSnap = await this.db
        .collection("clients")
        .doc(invoice.clientId)
        .get();

      const client = clientSnap.exists
        ? { ...(clientSnap.data() as any), id: invoice.clientId }
        : null;

      invoices.push({
        ...invoice,
        client,
        items: [],
      });
    }

    return invoices;
  }

  async getInvoice(id: string): Promise<InvoiceWithDetails | undefined> {
    const invoiceDoc = await this.db.collection("invoices").doc(id).get();

    if (!invoiceDoc.exists) {
      return undefined;
    }

    const invoiceData = invoiceDoc.data();
    if (!invoiceData) return undefined;

    // ✅ Convert Firestore Timestamps to JS Dates
    invoiceData.invoiceDate = invoiceData.invoiceDate?.toDate?.() || new Date();
    invoiceData.dueDate = invoiceData.dueDate?.toDate?.() || new Date();
    invoiceData.paidAt = invoiceData.paidAt?.toDate?.() ?? null;

    // Fetch the client document
    const clientDoc = await this.db
      .collection("clients")
      .doc(invoiceData.clientId)
      .get();
    const clientData = clientDoc.exists ? clientDoc.data() : null;

    // Fetch invoice items (assuming a subcollection called 'items' under invoice)
    const itemsSnapshot = await this.db
      .collection("invoices")
      .doc(id)
      .collection("items")
      .get();
    const itemsData = itemsSnapshot.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
      invoiceId: id,
      createdAt: doc.createTime?.toDate() || new Date(), // fallback if null
    }));

    const invoice: InvoiceWithDetails = {
      id: invoiceDoc.id,
      ...(invoiceData as any),
      client: clientData
        ? {
            ...(clientData as any),
            id: invoiceData.clientId,
          }
        : null,
      items: itemsData as any, // type cast if needed
    };

    return invoice;
  }

  async createInvoice(
    insertInvoice: InsertInvoice,
    items: InsertInvoiceItem[]
  ): Promise<InvoiceWithDetails> {
    const invoiceRef = admin.firestore().collection("invoices").doc(); // Auto-generate ID
    const now = new Date();

    const invoiceData: Invoice = {
      ...insertInvoice,
      id: invoiceRef.id,
      createdAt: now,
      updatedAt: now,
      status: insertInvoice.status ?? "pending",
      currency: insertInvoice.currency ?? "KES",
      paidAt: insertInvoice.paidAt ?? null,
      notes: insertInvoice.notes ?? null,
    };

    // Set invoice document
    await invoiceRef.set(invoiceData);

    // Add items as subcollection
    const itemBatch = admin.firestore().batch();
    items.forEach((item) => {
      const itemRef = invoiceRef.collection("items").doc();
      itemBatch.set(itemRef, {
        ...item,
        invoiceId: invoiceRef.id,
      });
    });

    await itemBatch.commit();

    const client = await this.getClient(invoiceData.clientId);
    if (!client) throw new Error("Client not found");

    const fullItems: InvoiceItem[] = items.map((item) => ({
      ...item,
      id: crypto.randomUUID(), // or leave blank if Firestore assigns
      createdAt: now,
      invoiceId: invoiceRef.id,
    }));

    return {
      ...invoiceData,
      client,
      items: fullItems, // ⬅️ fix next
    };
  }

  async updateInvoice(
    id: string,
    updates: Partial<InsertInvoice>
  ): Promise<Invoice> {
    const now = new Date();

    const invoiceRef = this.db.collection("invoices").doc(id);

    // Update the document
    await invoiceRef.update({
      ...updates,
      updatedAt: now,
    });

    // Retrieve the updated invoice
    const updatedDoc = await invoiceRef.get();

    if (!updatedDoc.exists) {
      throw new Error("Invoice not found after update.");
    }

    const data = updatedDoc.data() as Invoice;

    // Ensure all required fields are present (and properly typed)
    return {
      ...data,
      notes: data.notes ?? null,
      currency: data.currency ?? "KES",
      paidAt: data.paidAt ?? null,
    };
  }

  async replaceInvoiceItems(invoiceId: string, items: InsertInvoiceItem[]) {
    const itemsRef = this.db
      .collection("invoices")
      .doc(invoiceId)
      .collection("items");

    // Delete existing items
    const existingItems = await itemsRef.listDocuments();
    const batch = this.db.batch();

    existingItems.forEach((docRef) => batch.delete(docRef));

    // Add updated items
    items.forEach((item) => {
      const docRef = itemsRef.doc(); // generate new ID
      batch.set(docRef, {
        ...item,
        invoiceId,
        createdAt: new Date(),
      });
    });

    await batch.commit();
  }

  async updateInvoiceStatus(id: string, status: string): Promise<Invoice> {
    const now = new Date();
    const invoiceRef = this.db.collection("invoices").doc(id);

    // Validate status
    const allowedStatuses = ["pending", "paid", "overdue"] as const;
    type InvoiceStatus = (typeof allowedStatuses)[number];

    if (!allowedStatuses.includes(status as InvoiceStatus)) {
      throw new Error("Invalid invoice status");
    }

    // Prepare update data
    const updateData: Partial<Invoice> = {
      status: status as InvoiceStatus, // ✅ safe cast
      updatedAt: now,
    };

    if (status === "paid") {
      updateData.paidAt = now;
    }

    // Perform the update
    await invoiceRef.update(updateData);

    // Retrieve the updated invoice
    const updatedDoc = await invoiceRef.get();

    if (!updatedDoc.exists) {
      throw new Error("Invoice not found after status update.");
    }

    const data = updatedDoc.data() as Invoice;

    return {
      ...data,
      notes: data.notes ?? null,
      currency: data.currency ?? "KES",
      paidAt: data.paidAt ?? null,
    };
  }

  async deleteInvoice(id: string): Promise<void> {
    const invoiceRef = this.db.collection("invoices").doc(id);
    const itemsRef = this.db
      .collection("invoiceItems")
      .where("invoiceId", "==", id);

    // Start a batch operation
    const batch = this.db.batch();

    // Delete the invoice document
    batch.delete(invoiceRef);

    // Fetch and delete all associated invoice items
    const itemsSnapshot = await itemsRef.get();
    itemsSnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Commit the batch
    await batch.commit();
  }

  async getDashboardMetrics(userId: string): Promise<{
    totalInvoices: number;
    prevMonthInvoices: number;
    pendingAmount: string;
    totalClients: number;
    prevMonthClients: number;
    totalRevenue: string;
    prevMonthRevenue: string;
  }> {
    const invoicesSnapshot = await this.db
      .collection("invoices")
      .where("userId", "==", userId)
      .get();

    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      0,
      23,
      59,
      59
    );

    let totalInvoices = 0;
    let prevMonthInvoices = 0;
    let pendingAmount = 0;
    let totalRevenue = 0;
    let prevMonthRevenue = 0;

    invoicesSnapshot.forEach((doc) => {
      const invoice = doc.data();
      const createdAt = invoice.createdAt?.toDate?.() || new Date(); // safe parse

      totalInvoices++;
      if (createdAt >= startOfLastMonth && createdAt <= endOfLastMonth) {
        prevMonthInvoices++;
        if (invoice.status === "paid") {
          prevMonthRevenue += parseFloat(invoice.total);
        }
      }

      if (invoice.status === "paid") {
        totalRevenue += parseFloat(invoice.total);
      } else if (invoice.status === "pending") {
        pendingAmount += parseFloat(invoice.total);
      }
    });

    const clientsSnapshot = await this.db
      .collection("clients")
      .where("userId", "==", userId)
      .get();

    let totalClients = 0;
    let prevMonthClients = 0;

    clientsSnapshot.forEach((doc) => {
      const client = doc.data();
      const createdAt = client.createdAt?.toDate?.() || new Date();
      totalClients++;
      if (createdAt >= startOfLastMonth && createdAt <= endOfLastMonth) {
        prevMonthClients++;
      }
    });

    return {
      totalInvoices,
      prevMonthInvoices,
      pendingAmount: pendingAmount.toFixed(2),
      totalClients,
      prevMonthClients,
      totalRevenue: totalRevenue.toFixed(2),
      prevMonthRevenue: prevMonthRevenue.toFixed(2),
    };
  }

  async getRecentInvoices(
    userId: string,
    limit: number
  ): Promise<InvoiceWithDetails[]> {
    const invoicesSnapshot = await this.db
      .collection("invoices")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    const invoices: InvoiceWithDetails[] = [];

    for (const doc of invoicesSnapshot.docs) {
      const invoice = doc.data();
      const clientId = invoice.clientId;

      // Fetch client data
      const clientDoc = await this.db.collection("clients").doc(clientId).get();
      const client = clientDoc.exists
        ? (clientDoc.data() as Client)
        : undefined;

      // Fetch invoice items
      const itemsSnapshot = await this.db
        .collection("invoiceItems")
        .where("invoiceId", "==", doc.id)
        .get();

      const items = itemsSnapshot.docs.map((d) => d.data() as InvoiceItem);

      if (client) {
        invoices.push({
          ...(invoice as Invoice),
          client,
          items,
        });
      }
    }

    return invoices;
  }
}

export const storage = new FirestoreStorage();
