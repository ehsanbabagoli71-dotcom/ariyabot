import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { insertUserSchema, insertTicketSchema, insertSubscriptionSchema, insertProductSchema, insertWhatsappSettingsSchema, insertSentMessageSchema, insertReceivedMessageSchema, insertAiTokenSettingsSchema, insertUserSubscriptionSchema, type User } from "@shared/schema";
import { z } from "zod";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// JWT secret
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Multer configuration for file uploads
const storage_config = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads"));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage_config,
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

// Admin or Level 1 user middleware for WhatsApp access
const requireAdminOrLevel1 = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== "admin" && req.user?.role !== "user_level_1") {
    return res.status(403).json({ message: "دسترسی مدیر یا کاربر سطح ۱ مورد نیاز است" });
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

      // Create 7-day free trial subscription for new users
      try {
        // First, ensure we have a trial subscription plan
        let trialSubscription = (await storage.getAllSubscriptions()).find(sub => 
          sub.name.includes('رایگان') || sub.name.includes('آزمایشی') || 
          (sub.priceBeforeDiscount === '0' || !sub.priceBeforeDiscount)
        );

        // If no trial subscription exists, create one
        if (!trialSubscription) {
          trialSubscription = await storage.createSubscription({
            name: "اشتراک آزمایشی رایگان",
            description: "اشتراک رایگان 7 روزه برای کاربران جدید",
            duration: "monthly",
            priceBeforeDiscount: "0",
            priceAfterDiscount: null,
            features: [
              "دسترسی محدود به امکانات",
              "پشتیبانی پایه",
              "7 روز استفاده رایگان"
            ],
            userLevel: "user",
            isActive: true,
            image: null,
          });
        }

        // Create user subscription for 7-day trial
        await storage.createUserSubscription({
          userId: user.id,
          subscriptionId: trialSubscription.id,
          remainingDays: 7,
          startDate: new Date(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          status: "active",
          isTrialPeriod: true,
        });
      } catch (trialError) {
        console.error("خطا در ایجاد اشتراک آزمایشی:", trialError);
        // Don't fail user registration if trial subscription creation fails
      }

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
      console.error("خطا در ایجاد اشتراک:", error);
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
      console.error("خطا در بروزرسانی اشتراک:", error);
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

  // AI Token routes
  app.get("/api/ai-token", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const settings = await storage.getAiTokenSettings();
      res.json(settings || {});
    } catch (error) {
      res.status(500).json({ message: "خطا در دریافت توکن هوش مصنوعی" });
    }
  });

  app.post("/api/ai-token", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const validatedData = insertAiTokenSettingsSchema.parse(req.body);
      const settings = await storage.updateAiTokenSettings(validatedData);
      
      // بازخوانی سرویس Gemini با توکن جدید
      const { geminiService } = await import("./gemini-service");
      await geminiService.reinitialize();
      
      res.json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "داده های ورودی نامعتبر است", errors: error.errors });
      }
      res.status(500).json({ message: "خطا در ذخیره توکن هوش مصنوعی" });
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
      let imageData = null;
      
      // اگر فایل آپلود شده باشد، آن را به base64 تبدیل می‌کنیم
      if ((req as any).file) {
        const fs = await import('fs');
        const fileBuffer = fs.readFileSync((req as any).file.path);
        const base64 = fileBuffer.toString('base64');
        const mimeType = (req as any).file.mimetype;
        imageData = `data:${mimeType};base64,${base64}`;
        
        // حذف فایل موقت
        fs.unlinkSync((req as any).file.path);
      }
      
      const validatedData = insertProductSchema.parse({
        ...req.body,
        userId: req.user!.id,
        image: imageData,
        priceBeforeDiscount: parseFloat(req.body.priceBeforeDiscount),
        priceAfterDiscount: req.body.priceAfterDiscount ? parseFloat(req.body.priceAfterDiscount) : null,
        quantity: parseInt(req.body.quantity),
      });
      
      const product = await storage.createProduct(validatedData);
      res.json(product);
    } catch (error) {
      console.error("خطا در ایجاد محصول:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "داده های ورودی نامعتبر است", errors: error.errors });
      }
      res.status(500).json({ message: "خطا در ایجاد محصول" });
    }
  });

  app.put("/api/products/:id", authenticateToken, upload.single("productImage"), async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      let updates = { ...req.body };
      
      // اگر فایل جدید آپلود شده باشد، آن را به base64 تبدیل می‌کنیم
      if ((req as any).file) {
        const fs = await import('fs');
        const fileBuffer = fs.readFileSync((req as any).file.path);
        const base64 = fileBuffer.toString('base64');
        const mimeType = (req as any).file.mimetype;
        updates.image = `data:${mimeType};base64,${base64}`;
        
        // حذف فایل موقت
        fs.unlinkSync((req as any).file.path);
      }
      
      // Ensure user can only update their own products
      const product = await storage.getProduct(id);
      if (!product || (product.userId !== req.user!.id && req.user!.role !== "admin")) {
        return res.status(404).json({ message: "محصول یافت نشد" });
      }

      const updatedProduct = await storage.updateProduct(id, updates);
      res.json(updatedProduct);
    } catch (error) {
      console.error("خطا در بروزرسانی محصول:", error);
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

  // WhatsApp settings routes (Admin and Level 1 users)
  app.get("/api/whatsapp-settings", authenticateToken, requireAdminOrLevel1, async (req, res) => {
    try {
      const settings = await storage.getWhatsappSettings();
      res.json(settings || {});
    } catch (error) {
      res.status(500).json({ message: "خطا در دریافت تنظیمات واتس اپ" });
    }
  });

  app.put("/api/whatsapp-settings", authenticateToken, requireAdminOrLevel1, async (req, res) => {
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

  // Message routes (Admin and Level 1 users)
  app.get("/api/messages/sent", authenticateToken, requireAdminOrLevel1, async (req: AuthRequest, res) => {
    try {
      const messages = await storage.getSentMessagesByUser(req.user!.id);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "خطا در دریافت پیام‌های ارسالی" });
    }
  });

  app.get("/api/messages/received", authenticateToken, requireAdminOrLevel1, async (req: AuthRequest, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 7; // پیش‌فرض 7 پیام در هر صفحه
      
      const result = await storage.getReceivedMessagesByUserPaginated(req.user!.id, page, limit);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "خطا در دریافت پیام‌های دریافتی" });
    }
  });

  app.post("/api/messages/sent", authenticateToken, requireAdminOrLevel1, async (req: AuthRequest, res) => {
    try {
      const validatedData = insertSentMessageSchema.parse({
        ...req.body,
        userId: req.user!.id,
      });
      
      const message = await storage.createSentMessage(validatedData);
      res.json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "داده های ورودی نامعتبر است", errors: error.errors });
      }
      res.status(500).json({ message: "خطا در ثبت پیام ارسالی" });
    }
  });

  app.post("/api/messages/received", authenticateToken, requireAdminOrLevel1, async (req: AuthRequest, res) => {
    try {
      const validatedData = insertReceivedMessageSchema.parse({
        ...req.body,
        userId: req.user!.id,
      });
      
      const message = await storage.createReceivedMessage(validatedData);
      res.json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "داده های ورودی نامعتبر است", errors: error.errors });
      }
      res.status(500).json({ message: "خطا در ثبت پیام دریافتی" });
    }
  });

  app.put("/api/messages/received/:id/read", authenticateToken, requireAdminOrLevel1, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const message = await storage.updateReceivedMessageStatus(id, "خوانده شده");
      
      if (!message) {
        return res.status(404).json({ message: "پیام یافت نشد" });
      }

      res.json(message);
    } catch (error) {
      res.status(500).json({ message: "خطا در بروزرسانی وضعیت پیام" });
    }
  });

  // User Subscription routes
  // Get user's current subscription
  app.get("/api/user-subscriptions/me", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userSubscription = await storage.getUserSubscription(req.user!.id);
      res.json(userSubscription);
    } catch (error) {
      res.status(500).json({ message: "خطا در دریافت اشتراک کاربر" });
    }
  });

  // Get all user subscriptions (Admin only)
  app.get("/api/user-subscriptions", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const userSubscriptions = await storage.getAllUserSubscriptions();
      res.json(userSubscriptions);
    } catch (error) {
      res.status(500).json({ message: "خطا در دریافت اشتراک‌های کاربران" });
    }
  });

  // Create user subscription
  app.post("/api/user-subscriptions", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const validatedData = insertUserSubscriptionSchema.parse(req.body);
      const userSubscription = await storage.createUserSubscription(validatedData);
      res.json(userSubscription);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "داده های ورودی نامعتبر است", errors: error.errors });
      }
      res.status(500).json({ message: "خطا در ایجاد اشتراک کاربر" });
    }
  });

  // Update user subscription
  app.put("/api/user-subscriptions/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const userSubscription = await storage.updateUserSubscription(id, updates);
      if (!userSubscription) {
        return res.status(404).json({ message: "اشتراک کاربر یافت نشد" });
      }

      res.json(userSubscription);
    } catch (error) {
      res.status(500).json({ message: "خطا در بروزرسانی اشتراک کاربر" });
    }
  });

  // Update remaining days (for daily reduction)
  app.put("/api/user-subscriptions/:id/remaining-days", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { remainingDays } = req.body;
      
      if (typeof remainingDays !== 'number') {
        return res.status(400).json({ message: "تعداد روزهای باقیمانده باید عدد باشد" });
      }
      
      const userSubscription = await storage.updateRemainingDays(id, remainingDays);
      if (!userSubscription) {
        return res.status(404).json({ message: "اشتراک کاربر یافت نشد" });
      }

      res.json(userSubscription);
    } catch (error) {
      res.status(500).json({ message: "خطا در بروزرسانی روزهای باقیمانده" });
    }
  });

  // Daily subscription reduction endpoint (for cron job)
  app.post("/api/user-subscriptions/daily-reduction", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const activeSubscriptions = await storage.getActiveUserSubscriptions();
      const updatedSubscriptions = [];
      
      for (const subscription of activeSubscriptions) {
        if (subscription.remainingDays > 0) {
          const newRemainingDays = subscription.remainingDays - 1;
          const updated = await storage.updateRemainingDays(subscription.id, newRemainingDays);
          if (updated) {
            updatedSubscriptions.push(updated);
          }
        }
      }
      
      res.json({
        message: `${updatedSubscriptions.length} اشتراک بروزرسانی شد`,
        updatedSubscriptions
      });
    } catch (error) {
      console.error("خطا در کاهش روزانه اشتراک‌ها:", error);
      res.status(500).json({ message: "خطا در کاهش روزانه اشتراک‌ها" });
    }
  });

  // Get active subscriptions
  app.get("/api/user-subscriptions/active", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const activeSubscriptions = await storage.getActiveUserSubscriptions();
      res.json(activeSubscriptions);
    } catch (error) {
      res.status(500).json({ message: "خطا در دریافت اشتراک‌های فعال" });
    }
  });

  // Get expired subscriptions  
  app.get("/api/user-subscriptions/expired", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const expiredSubscriptions = await storage.getExpiredUserSubscriptions();
      res.json(expiredSubscriptions);
    } catch (error) {
      res.status(500).json({ message: "خطا در دریافت اشتراک‌های منقضی" });
    }
  });

  // Subscribe to plan endpoint (for users)
  app.post("/api/user-subscriptions/subscribe", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { subscriptionId } = req.body;
      
      if (!subscriptionId) {
        return res.status(400).json({ message: "شناسه اشتراک مورد نیاز است" });
      }
      
      // Check if subscription exists
      const subscription = await storage.getSubscription(subscriptionId);
      if (!subscription) {
        return res.status(404).json({ message: "اشتراک یافت نشد" });
      }
      
      if (!subscription.isActive) {
        return res.status(400).json({ message: "این اشتراک فعال نیست" });
      }
      
      // Check if user already has an active subscription
      const existingSubscription = await storage.getUserSubscription(req.user!.id);
      if (existingSubscription && existingSubscription.remainingDays > 0) {
        return res.status(400).json({ message: "شما اشتراک فعال دارید" });
      }
      
      // Calculate duration in days
      const durationInDays = subscription.duration === 'monthly' ? 30 : 365;
      
      // Create new user subscription
      const userSubscription = await storage.createUserSubscription({
        userId: req.user!.id,
        subscriptionId: subscriptionId,
        remainingDays: durationInDays,
        startDate: new Date(),
        endDate: new Date(Date.now() + durationInDays * 24 * 60 * 60 * 1000),
        status: "active",
      });
      
      res.json(userSubscription);
    } catch (error) {
      console.error("خطا در ثبت اشتراک:", error);
      res.status(500).json({ message: "خطا در ثبت اشتراک" });
    }
  });

  // Serve uploaded files
  app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

  const httpServer = createServer(app);
  return httpServer;
}
