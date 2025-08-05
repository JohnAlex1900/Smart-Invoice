import type { Express } from "express";
import { Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  InsertUser,
  InsertClient,
  InsertInvoice,
  InsertInvoiceItem,
} from "@shared/schema";
import {
  userSchema,
  clientSchema,
  invoiceItemSchema,
  invoiceSchema,
} from "./validation.ts";
import { z } from "zod";
import { auth } from "./firebaseAdmin";
import "./express.d.ts";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware to get user from Firebase token
  const authenticateUser = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res
          .status(401)
          .json({ message: "Authentication required (no token)" });
      }

      const idToken = authHeader.split(" ")[1];

      // 🔐 Verify Firebase ID Token
      const decodedToken = await auth.verifyIdToken(idToken);
      const firebaseUid = decodedToken.uid;

      if (!firebaseUid) {
        return res.status(401).json({ message: "Invalid token" });
      }

      console.log("Decoded UID:", firebaseUid);
      console.log("Looking up user in Firestore...");

      // 🔍 Lookup user in your app DB
      const user = await storage.getUserByFirebaseUid(firebaseUid);
      if (!user) {
        console.warn("User not found in Firestore for UID:", firebaseUid);
        return res.status(401).json({ message: "User not found" });
      }

      req.user = user;
      next();
    } catch (error: any) {
      console.error("Authentication failed:", error);
      return res.status(401).json({ message: "Invalid authentication" });
    }
  };

  // User routes
  app.post("/api/users", async (req, res) => {
    try {
      const user = userSchema.parse(req.body);
      const cleanedUser = {
        ...user,
        phone: user.phone ?? null,
        address: user.address ?? null,
      };
      const createdUser = await storage.createUser(cleanedUser);

      res.json(createdUser);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/users/me", authenticateUser, async (req: any, res) => {
    res.json(req.user);
  });

  app.put("/api/users/me", authenticateUser, async (req: any, res) => {
    try {
      const updates = userSchema.partial().parse(req.body);
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
      const bodyWithUser = {
        ...req.body,
        userId: req.user.id,
      };

      const client = clientSchema.parse(bodyWithUser);

      const cleanedClient = {
        ...client,
        phone: client.phone ?? null,
        address: client.address ?? null,
      };

      const createdClient = await storage.createClient(cleanedClient);

      res.json(createdClient);
    } catch (error: any) {
      console.error("POST /api/clients error:", error);
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

      const updates = clientSchema.partial().parse(req.body);
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
      const invoices = await storage.getInvoicesByUserId(req.user.id, {
        status,
        search,
      });
      res.json(invoices);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/invoices", authenticateUser, async (req: any, res) => {
    try {
      const { invoice: invoiceData, items } = req.body;

      if (!invoiceData || !items) {
        return res.status(400).json({
          message: "Missing invoice or items data.",
        });
      }

      // Add userId to invoice data
      const invoiceWithUser = {
        ...invoiceData,
        userId: req.user.id,
      };

      // Parse and validate invoice structure
      const rawInvoice = invoiceSchema.parse(invoiceWithUser);

      const invoice = {
        ...rawInvoice,
        status: invoiceData.status ?? "pending",
        notes: invoiceData.notes ?? null,
        paidAt: invoiceData.paidAt ?? null,
      };

      // Validate items
      const validatedItems = items.map((item: any) =>
        invoiceItemSchema.parse(item)
      );

      // Save to Firestore
      const createdInvoice = await storage.createInvoice(
        invoice,
        validatedItems
      );

      res.json(createdInvoice);
    } catch (error: any) {
      console.error("Invoice creation failed:", error);
      if (error.issues) {
        console.error(
          "Validation issues:",
          JSON.stringify(error.issues, null, 2)
        );
      }
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/invoices/:id", authenticateUser, async (req: any, res) => {
    try {
      const invoice = await storage.getInvoice(req.params.id);

      // ✅ Add this debug log
      console.log("Fetched invoice.userId:", invoice?.userId);
      console.log("Authenticated req.user.id:", req.user.id);

      if (!invoice || invoice.userId !== req.user.id) {
        console.warn("Invoice access denied or not found.");
        return res.status(404).json({ message: "Invoice not found" });
      }

      res.json(invoice);
    } catch (error: any) {
      console.error("Error in fetching invoice:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/invoices/:id", authenticateUser, async (req: any, res) => {
    try {
      const { id } = req.params;
      const invoice = await storage.getInvoice(id);

      if (!invoice || invoice.userId !== req.user.id) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      const updates = invoiceSchema.partial().parse(req.body.invoice);
      const cleanedUpdates = {
        ...updates,
        ...(updates.invoiceDate && {
          invoiceDate: new Date(updates.invoiceDate),
        }),
        ...(updates.dueDate && {
          dueDate: new Date(updates.dueDate),
        }),
        ...(updates.paidAt !== undefined && {
          paidAt: updates.paidAt === null ? null : new Date(updates.paidAt),
        }),
      };

      // 🔁 Update invoice document
      const updatedInvoice = await storage.updateInvoice(id, cleanedUpdates);

      // 🔁 Replace items if provided
      if (req.body.items && Array.isArray(req.body.items)) {
        await storage.replaceInvoiceItems(id, req.body.items);
      }

      res.json(updatedInvoice);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get(
    "/api/dashboard/recent-invoices",
    authenticateUser,
    async (req: any, res) => {
      try {
        const limit = parseInt(req.query.limit as string) || 5;
        const invoices = await storage.getRecentInvoices(req.user.id, limit);
        res.json(invoices);
      } catch (error: any) {
        res.status(500).json({ message: error.message });
      }
    }
  );

  app.get("/api/dashboard/metrics", authenticateUser, async (req: any, res) => {
    try {
      const metrics = await storage.getDashboardMetrics(req.user.id);
      res.json(metrics);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
