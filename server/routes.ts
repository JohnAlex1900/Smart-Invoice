import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertClientSchema, insertInvoiceSchema, insertInvoiceItemSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware to get user from Firebase token
  const authenticateUser = async (req: any, res: any, next: any) => {
    try {
      const firebaseUid = req.headers['x-firebase-uid'];
      if (!firebaseUid) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const user = await storage.getUserByFirebaseUid(firebaseUid as string);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      req.user = user;
      next();
    } catch (error) {
      res.status(401).json({ message: "Invalid authentication" });
    }
  };

  // User routes
  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.json(user);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/users/me", authenticateUser, async (req: any, res) => {
    res.json(req.user);
  });

  app.put("/api/users/me", authenticateUser, async (req: any, res) => {
    try {
      const updates = insertUserSchema.partial().parse(req.body);
      const user = await storage.updateUser(req.user.id, updates);
      res.json(user);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Client routes
  app.get("/api/clients", authenticateUser, async (req: any, res) => {
    try {
      const clients = await storage.getClientsByUserId(req.user.id);
      res.json(clients);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/clients", authenticateUser, async (req: any, res) => {
    try {
      const clientData = insertClientSchema.parse({
        ...req.body,
        userId: req.user.id,
      });
      const client = await storage.createClient(clientData);
      res.json(client);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/clients/:id", authenticateUser, async (req: any, res) => {
    try {
      const client = await storage.getClient(req.params.id);
      if (!client || client.userId !== req.user.id) {
        return res.status(404).json({ message: "Client not found" });
      }
      res.json(client);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/clients/:id", authenticateUser, async (req: any, res) => {
    try {
      const client = await storage.getClient(req.params.id);
      if (!client || client.userId !== req.user.id) {
        return res.status(404).json({ message: "Client not found" });
      }

      const updates = insertClientSchema.partial().parse(req.body);
      const updatedClient = await storage.updateClient(req.params.id, updates);
      res.json(updatedClient);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/clients/:id", authenticateUser, async (req: any, res) => {
    try {
      const client = await storage.getClient(req.params.id);
      if (!client || client.userId !== req.user.id) {
        return res.status(404).json({ message: "Client not found" });
      }

      await storage.deleteClient(req.params.id);
      res.json({ message: "Client deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Invoice routes
  app.get("/api/invoices", authenticateUser, async (req: any, res) => {
    try {
      const { status, search } = req.query;
      const invoices = await storage.getInvoicesByUserId(req.user.id, { status, search });
      res.json(invoices);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/invoices", authenticateUser, async (req: any, res) => {
    try {
      const { items, ...invoiceData } = req.body;
      
      console.log("Invoice data received:", invoiceData);
      console.log("Items received:", items);
      
      // Validate invoice data
      const invoice = insertInvoiceSchema.parse({
        ...invoiceData,
        userId: req.user.id,
      });

      // Validate items without invoiceId (will be added in storage layer)
      const validatedItems = items?.map((item: any) => {
        return insertInvoiceItemSchema.parse(item);
      }) || [];

      const createdInvoice = await storage.createInvoice(invoice, validatedItems);
      res.json(createdInvoice);
    } catch (error: any) {
      console.error("Invoice validation error:", error);
      if (error.issues) {
        console.error("Validation issues:", JSON.stringify(error.issues, null, 2));
      }
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/invoices/:id", authenticateUser, async (req: any, res) => {
    try {
      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice || invoice.userId !== req.user.id) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/invoices/:id", authenticateUser, async (req: any, res) => {
    try {
      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice || invoice.userId !== req.user.id) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      const updates = insertInvoiceSchema.partial().parse(req.body);
      const updatedInvoice = await storage.updateInvoice(req.params.id, updates);
      res.json(updatedInvoice);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/invoices/:id/status", authenticateUser, async (req: any, res) => {
    try {
      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice || invoice.userId !== req.user.id) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      const { status } = z.object({ status: z.string() }).parse(req.body);
      const updatedInvoice = await storage.updateInvoiceStatus(req.params.id, status);
      res.json(updatedInvoice);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/invoices/:id", authenticateUser, async (req: any, res) => {
    try {
      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice || invoice.userId !== req.user.id) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      await storage.deleteInvoice(req.params.id);
      res.json({ message: "Invoice deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Dashboard routes
  app.get("/api/dashboard/metrics", authenticateUser, async (req: any, res) => {
    try {
      const metrics = await storage.getDashboardMetrics(req.user.id);
      res.json(metrics);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/dashboard/recent-invoices", authenticateUser, async (req: any, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      const invoices = await storage.getRecentInvoices(req.user.id, limit);
      res.json(invoices);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
