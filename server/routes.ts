import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { insertUserSchema, insertTicketSchema, insertSubscriptionSchema, insertProductSchema, insertWhatsappSettingsSchema, type User } from "@shared/schema";
import { z } from "zod";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// JWT secret
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Multer configuration for file uploads
const upload = multer({
  dest: path.join(__dirname, "../uploads"),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req: any, file: any, cb: any) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("نوع فایل مجاز نیست"));
    }
  },
});

// Auth middleware  
interface AuthRequest extends Request {
  user?: User;
}

const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "توکن احراز هویت مورد نیاز است" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = await storage.getUser(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: "کاربر یافت نشد" });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ message: "توکن نامعتبر است" });
  }
};

// Admin middleware
const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "دسترسی مدیر مورد نیاز است" });
  }
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      // Generate username from email if not provided
      const userData = {
        ...req.body,
        username: req.body.username || req.body.email.split('@')[0] + Math.random().toString(36).substr(2, 4)
      };
      
      const validatedData = insertUserSchema.parse(userData);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: "کاربری با این ایمیل قبلاً ثبت نام کرده است" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(validatedData.password!, 10);
      
      const user = await storage.createUser({
        ...validatedData,
        password: hashedPassword,
      });

      // Generate JWT
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });

      res.json({ 
        user: { ...user, password: undefined },
        token 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "داده های ورودی نامعتبر است", errors: error.errors });
      }
      res.status(500).json({ message: "خطا در ثبت نام کاربر" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      const user = await storage.getUserByEmailOrUsername(email);
      if (!user || !user.password) {
        return res.status(401).json({ message: "نام کاربری/ایمیل یا رمز عبور اشتباه است" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "نام کاربری/ایمیل یا رمز عبور اشتباه است" });
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });

      res.json({ 
        user: { ...user, password: undefined },
        token 
      });
    } catch (error) {
      res.status(500).json({ message: "خطا در ورود کاربر" });
    }
  });

  app.get("/api/auth/me", authenticateToken, async (req: AuthRequest, res) => {
    res.json({ user: { ...req.user!, password: undefined } });
  });

  // User management routes (Admin only)
  app.get("/api/users", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users.map(user => ({ ...user, password: undefined })));
    } catch (error) {
      res.status(500).json({ message: "خطا در دریافت کاربران" });
    }
  });

  app.post("/api/users", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingEmailUser = await storage.getUserByEmail(validatedData.email);
      if (existingEmailUser) {
        return res.status(400).json({ message: "کاربری با این ایمیل قبلاً ثبت نام کرده است" });
      }

      const existingUsernameUser = await storage.getUserByUsername(validatedData.username!);
      if (existingUsernameUser) {
        return res.status(400).json({ message: "کاربری با این نام کاربری قبلاً ثبت نام کرده است" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(validatedData.password!, 10);
      
      const user = await storage.createUser({
        ...validatedData,
        password: hashedPassword,
      });

      res.json({ ...user, password: undefined });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "داده های ورودی نامعتبر است", errors: error.errors });
      }
      res.status(500).json({ message: "خطا در ایجاد کاربر" });
    }
  });

  app.put("/api/users/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const user = await storage.updateUser(id, updates);
      if (!user) {
        return res.status(404).json({ message: "کاربر یافت نشد" });
      }

      res.json({ ...user, password: undefined });
    } catch (error) {
      res.status(500).json({ message: "خطا در بروزرسانی کاربر" });
    }
  });

  app.delete("/api/users/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteUser(id);
      
      if (!success) {
        return res.status(404).json({ message: "کاربر یافت نشد" });
      }

      res.json({ message: "کاربر با موفقیت حذف شد" });
    } catch (error) {
      res.status(500).json({ message: "خطا در حذف کاربر" });
    }
  });

  // Profile routes
  app.put("/api/profile", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { firstName, lastName } = req.body;
      const user = await storage.updateUser(req.user!.id, { firstName, lastName });
      
      res.json({ ...user!, password: undefined });
    } catch (error) {
      res.status(500).json({ message: "خطا در بروزرسانی پروفایل" });
    }
  });

  app.post("/api/profile/picture", authenticateToken, upload.single("profilePicture"), async (req: AuthRequest, res) => {
    try {
      if (!(req as any).file) {
        return res.status(400).json({ message: "فایل تصویر مورد نیاز است" });
      }

      const profilePicture = `/uploads/${(req as any).file.filename}`;
      const user = await storage.updateUser(req.user!.id, { profilePicture });
      
      res.json({ ...user!, password: undefined });
    } catch (error) {
      res.status(500).json({ message: "خطا در آپلود تصویر پروفایل" });
    }
  });

  // Ticket routes
  app.get("/api/tickets", authenticateToken, async (req: AuthRequest, res) => {
    try {
      let tickets;
      if (req.user!.role === "admin") {
        tickets = await storage.getAllTickets();
      } else {
        tickets = await storage.getTicketsByUser(req.user!.id);
      }
      res.json(tickets);
    } catch (error) {
      res.status(500).json({ message: "خطا در دریافت تیکت ها" });
    }
  });

  app.post("/api/tickets", authenticateToken, upload.array("attachments", 5), async (req: AuthRequest, res) => {
    try {
      const validatedData = insertTicketSchema.parse({
        ...req.body,
        userId: req.user!.id,
        attachments: (req as any).files ? ((req as any).files as any[]).map((file: any) => `/uploads/${file.filename}`) : [],
      });
      
      const ticket = await storage.createTicket(validatedData);
      res.json(ticket);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "داده های ورودی نامعتبر است", errors: error.errors });
      }
      res.status(500).json({ message: "خطا در ایجاد تیکت" });
    }
  });

  app.put("/api/tickets/:id/reply", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { adminReply } = req.body;
      
      const ticket = await storage.updateTicket(id, {
        adminReply,
        adminReplyAt: new Date(),
        status: "read",
        lastResponseAt: new Date(),
      });
      
      if (!ticket) {
        return res.status(404).json({ message: "تیکت یافت نشد" });
      }

      res.json(ticket);
    } catch (error) {
      res.status(500).json({ message: "خطا در پاسخ به تیکت" });
    }
  });

  app.delete("/api/tickets/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteTicket(id);
      
      if (!success) {
        return res.status(404).json({ message: "تیکت یافت نشد" });
      }

      res.json({ message: "تیکت با موفقیت حذف شد" });
    } catch (error) {
      res.status(500).json({ message: "خطا در حذف تیکت" });
    }
  });

  // Subscription routes (Admin only)
  app.get("/api/subscriptions", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const subscriptions = await storage.getAllSubscriptions();
      res.json(subscriptions);
    } catch (error) {
      res.status(500).json({ message: "خطا در دریافت اشتراک ها" });
    }
  });

  app.post("/api/subscriptions", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const validatedData = insertSubscriptionSchema.parse(req.body);
      const subscription = await storage.createSubscription(validatedData);
      res.json(subscription);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "داده های ورودی نامعتبر است", errors: error.errors });
      }
      res.status(500).json({ message: "خطا در ایجاد اشتراک" });
    }
  });

  app.put("/api/subscriptions/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const subscription = await storage.updateSubscription(id, updates);
      if (!subscription) {
        return res.status(404).json({ message: "اشتراک یافت نشد" });
      }

      res.json(subscription);
    } catch (error) {
      res.status(500).json({ message: "خطا در بروزرسانی اشتراک" });
    }
  });

  app.delete("/api/subscriptions/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteSubscription(id);
      
      if (!success) {
        return res.status(404).json({ message: "اشتراک یافت نشد" });
      }

      res.json({ message: "اشتراک با موفقیت حذف شد" });
    } catch (error) {
      res.status(500).json({ message: "خطا در حذف اشتراک" });
    }
  });

  // Product routes
  app.get("/api/products", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const products = await storage.getProductsByUser(req.user!.id);
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "خطا در دریافت محصولات" });
    }
  });

  app.post("/api/products", authenticateToken, upload.single("productImage"), async (req: AuthRequest, res) => {
    try {
      const validatedData = insertProductSchema.parse({
        ...req.body,
        userId: req.user!.id,
        image: (req as any).file ? `/uploads/${(req as any).file.filename}` : null,
        priceBeforeDiscount: parseFloat(req.body.priceBeforeDiscount),
        priceAfterDiscount: req.body.priceAfterDiscount ? parseFloat(req.body.priceAfterDiscount) : null,
        quantity: parseInt(req.body.quantity),
      });
      
      const product = await storage.createProduct(validatedData);
      res.json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "داده های ورودی نامعتبر است", errors: error.errors });
      }
      res.status(500).json({ message: "خطا در ایجاد محصول" });
    }
  });

  app.put("/api/products/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      // Ensure user can only update their own products
      const product = await storage.getProduct(id);
      if (!product || (product.userId !== req.user!.id && req.user!.role !== "admin")) {
        return res.status(404).json({ message: "محصول یافت نشد" });
      }

      const updatedProduct = await storage.updateProduct(id, updates);
      res.json(updatedProduct);
    } catch (error) {
      res.status(500).json({ message: "خطا در بروزرسانی محصول" });
    }
  });

  app.delete("/api/products/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      
      // Ensure user can only delete their own products
      const product = await storage.getProduct(id);
      if (!product || (product.userId !== req.user!.id && req.user!.role !== "admin")) {
        return res.status(404).json({ message: "محصول یافت نشد" });
      }

      const success = await storage.deleteProduct(id);
      res.json({ message: "محصول با موفقیت حذف شد" });
    } catch (error) {
      res.status(500).json({ message: "خطا در حذف محصول" });
    }
  });

  // WhatsApp settings routes (Admin only)
  app.get("/api/whatsapp-settings", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const settings = await storage.getWhatsappSettings();
      res.json(settings || {});
    } catch (error) {
      res.status(500).json({ message: "خطا در دریافت تنظیمات واتس اپ" });
    }
  });

  app.put("/api/whatsapp-settings", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const validatedData = insertWhatsappSettingsSchema.parse(req.body);
      const settings = await storage.updateWhatsappSettings(validatedData);
      res.json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "داده های ورودی نامعتبر است", errors: error.errors });
      }
      res.status(500).json({ message: "خطا در بروزرسانی تنظیمات واتس اپ" });
    }
  });

  // Serve uploaded files
  app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

  const httpServer = createServer(app);
  return httpServer;
}
