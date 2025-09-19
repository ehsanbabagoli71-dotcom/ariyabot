import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { insertUserSchema, insertSubUserSchema, insertTicketSchema, insertSubscriptionSchema, insertProductSchema, insertWhatsappSettingsSchema, insertSentMessageSchema, insertReceivedMessageSchema, insertAiTokenSettingsSchema, insertUserSubscriptionSchema, insertCategorySchema, updateCategoryOrderSchema, ticketReplySchema, type User } from "@shared/schema";
import { z } from "zod";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// JWT secret initialization
import crypto from 'crypto';

let jwtSecret: string;
if (process.env.JWT_SECRET) {
  jwtSecret = process.env.JWT_SECRET;
} else {
  if (process.env.NODE_ENV === 'production') {
    console.error("🛑 JWT_SECRET environment variable is required in production!");
    console.error("💡 Set JWT_SECRET to a random 32+ character string");
    process.exit(1);
  } else {
    console.warn("🔧 DEV MODE: Using temporary random JWT secret - set JWT_SECRET env var");
    jwtSecret = crypto.randomBytes(32).toString('hex');
  }
}

// Multer configuration for file uploads
const storage_config = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(process.cwd(), "uploads");
    // اطمینان از وجود فولدر uploads
    const fs = require('fs');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
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
    const decoded = jwt.verify(token, jwtSecret) as { userId: string };
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

// Middleware for category operations - allows admin and user_level_1
const requireAdminOrUserLevel1 = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== "admin" && req.user?.role !== "user_level_1") {
    return res.status(403).json({ message: "دسترسی مدیر یا کاربر سطح ۱ مورد نیاز است" });
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

// Helper functions for conversation thread management
interface ConversationMessage {
  id: string;
  message: string;
  createdAt: string;
  isAdmin: boolean;
  userName: string;
}

const parseConversationThread = (adminReply: string | null): ConversationMessage[] => {
  if (!adminReply) return [];
  
  try {
    // Try to parse as JSON array (new format)
    const parsed = JSON.parse(adminReply);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    // If it's not an array, treat as legacy single response
    return [{
      id: `legacy_${Date.now()}`,
      message: adminReply,
      createdAt: new Date().toISOString(),
      isAdmin: true,
      userName: 'پشتیبانی'
    }];
  } catch {
    // If parsing fails, treat as legacy single response
    return [{
      id: `legacy_${Date.now()}`,
      message: adminReply,
      createdAt: new Date().toISOString(),
      isAdmin: true,
      userName: 'پشتیبانی'
    }];
  }
};

const addMessageToThread = (
  existingThread: ConversationMessage[], 
  message: string,
  isAdmin: boolean,
  userName: string
): ConversationMessage[] => {
  const newMessage: ConversationMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    message: message.trim(),
    createdAt: new Date().toISOString(),
    isAdmin,
    userName
  };
  
  return [...existingThread, newMessage];
};

const serializeConversationThread = (thread: ConversationMessage[]): string => {
  return JSON.stringify(thread);
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
      
      // Check if user already exists (if email is provided)
      if (validatedData.email) {
        const existingUser = await storage.getUserByEmail(validatedData.email);
        if (existingUser) {
          return res.status(400).json({ message: "کاربری با این ایمیل قبلاً ثبت نام کرده است" });
        }
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(validatedData.password!, 10);
      
      const user = await storage.createUser({
        ...validatedData,
        password: hashedPassword,
      });

      // Create 7-day free trial subscription for new users
      try {
        // Find the default free subscription plan
        let trialSubscription = (await storage.getAllSubscriptions()).find(sub => 
          sub.isDefault === true
        );

        // If no default subscription exists, this should not happen
        // The system should have created a default subscription during initialization
        if (!trialSubscription) {
          console.warn("⚠️ Default subscription not found - this should not happen");
          console.warn("Continuing without creating subscription for user:", user.id);
        } else {
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
          console.log("✅ Created 7-day trial subscription for registered user:", user.id);
        }
      } catch (trialError) {
        console.error("خطا در ایجاد اشتراک آزمایشی:", trialError);
        // Don't fail user registration if trial subscription creation fails
      }

      // Generate JWT
      const token = jwt.sign({ userId: user.id }, jwtSecret, { expiresIn: "7d" });

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

  // Helper function to normalize Persian/Arabic digits to ASCII
  const normalizeDigits = (text: string): string => {
    return text
      .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString()) // Persian digits
      .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString()) // Arabic digits
      .trim();
  };

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      // Normalize identifier and password to handle Persian/Arabic digits
      const normalizedIdentifier = normalizeDigits(email || '');
      const normalizedPassword = normalizeDigits(password || '');
      
      const user = await storage.getUserByEmailOrUsername(normalizedIdentifier);
      if (!user || !user.password) {
        return res.status(401).json({ message: "نام کاربری/ایمیل یا رمز عبور اشتباه است" });
      }

      const isValidPassword = await bcrypt.compare(normalizedPassword, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "نام کاربری/ایمیل یا رمز عبور اشتباه است" });
      }

      const token = jwt.sign({ userId: user.id }, jwtSecret, { expiresIn: "7d" });

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
  app.get("/api/users", authenticateToken, async (req: AuthRequest, res) => {
    try {
      // Get users visible to current user based on their role
      const users = await storage.getUsersVisibleToUser(req.user!.id, req.user!.role);
      
      // Get subscription data for each user
      const usersWithSubscriptions = await Promise.all(
        users.map(async (user) => {
          try {
            // Get user's active subscription
            const userSubscription = await storage.getUserSubscription(user.id);
            
            let subscriptionInfo = null;
            if (userSubscription) {
              // Get subscription details
              const subscription = await storage.getSubscription(userSubscription.subscriptionId);
              subscriptionInfo = {
                name: subscription?.name || 'نامشخص',
                remainingDays: userSubscription.remainingDays,
                status: userSubscription.status,
                isTrialPeriod: userSubscription.isTrialPeriod
              };
            }
            
            return {
              ...user,
              password: undefined,
              subscription: subscriptionInfo
            };
          } catch (error) {
            // If there's an error getting subscription data, return user without subscription
            return {
              ...user,
              password: undefined,
              subscription: null
            };
          }
        })
      );
      
      res.json(usersWithSubscriptions);
    } catch (error) {
      res.status(500).json({ message: "خطا در دریافت کاربران" });
    }
  });

  app.post("/api/users", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      
      // Check if user already exists (if email is provided)
      if (validatedData.email) {
        const existingEmailUser = await storage.getUserByEmail(validatedData.email);
        if (existingEmailUser) {
          return res.status(400).json({ message: "کاربری با این ایمیل قبلاً ثبت نام کرده است" });
        }
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

      // Create 7-day free trial subscription for new users created by admin
      try {
        // Find the default free subscription plan
        let trialSubscription = (await storage.getAllSubscriptions()).find(sub => 
          sub.isDefault === true
        );

        // If no default subscription exists, this should not happen
        // The system should have created a default subscription during initialization
        if (!trialSubscription) {
          console.warn("⚠️ Default subscription not found - this should not happen");
          console.warn("Continuing without creating subscription for user:", user.id);
        } else {
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
          console.log("✅ Created 7-day trial subscription for admin-created user:", user.id);
        }
      } catch (trialError) {
        console.error("خطا در ایجاد اشتراک آزمایشی:", trialError);
        // Don't fail user creation if trial subscription creation fails
      }

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
      
      // Check if user exists
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "کاربر یافت نشد" });
      }

      // First delete user subscriptions (to avoid foreign key constraint)
      // Get ALL user subscriptions for this specific user
      const userSubscriptions = await storage.getUserSubscriptionsByUserId(id);
      for (const subscription of userSubscriptions) {
        await storage.deleteUserSubscription(subscription.id);
      }

      // Delete user tickets (if any)
      const userTickets = await storage.getTicketsByUser(id);
      for (const ticket of userTickets) {
        await storage.deleteTicket(ticket.id);
      }

      // Delete user products (if any)
      const userProducts = await storage.getProductsByUser(id);
      for (const product of userProducts) {
        await storage.deleteProduct(product.id, id, user.role);
      }

      // Finally delete the user
      const success = await storage.deleteUser(id);
      
      if (!success) {
        return res.status(500).json({ message: "خطا در حذف کاربر" });
      }

      res.json({ message: "کاربر و تمام اطلاعات مربوطه با موفقیت حذف شد" });
    } catch (error) {
      console.error("خطا در حذف کاربر:", error);
      res.status(500).json({ message: "خطا در حذف کاربر" });
    }
  });

  // Sub-user management routes (For user_level_1 to manage their sub-users)
  app.get("/api/sub-users", authenticateToken, async (req: AuthRequest, res) => {
    try {
      // Only level 1 users can manage sub-users
      if (req.user?.role !== "user_level_1") {
        return res.status(403).json({ message: "فقط کاربران سطح ۱ می‌توانند زیرمجموعه‌ها را مدیریت کنند" });
      }

      const subUsers = await storage.getSubUsers(req.user.id);
      
      // Get subscription data for each sub-user
      const subUsersWithSubscriptions = await Promise.all(
        subUsers.map(async (user) => {
          try {
            const userSubscription = await storage.getUserSubscription(user.id);
            let subscriptionInfo = null;
            if (userSubscription) {
              const subscription = await storage.getSubscription(userSubscription.subscriptionId);
              subscriptionInfo = {
                name: subscription?.name || 'نامشخص',
                remainingDays: userSubscription.remainingDays,
                status: userSubscription.status,
                isTrialPeriod: userSubscription.isTrialPeriod
              };
            }
            
            return {
              ...user,
              password: undefined,
              subscription: subscriptionInfo
            };
          } catch (error) {
            return {
              ...user,
              password: undefined,
              subscription: null
            };
          }
        })
      );
      
      res.json(subUsersWithSubscriptions);
    } catch (error) {
      res.status(500).json({ message: "خطا در دریافت زیرمجموعه‌ها" });
    }
  });

  app.post("/api/sub-users", authenticateToken, async (req: AuthRequest, res) => {
    try {
      // Only level 1 users can create sub-users
      if (req.user?.role !== "user_level_1") {
        return res.status(403).json({ message: "فقط کاربران سطح ۱ می‌توانند زیرمجموعه ایجاد کنند" });
      }

      const validatedData = insertSubUserSchema.parse(req.body);
      
      // Generate username from phone number using the specified algorithm
      // Algorithm: Remove "98" prefix from phone number, then add "0" at the beginning
      const generateUsernameFromPhone = (phone: string): string => {
        if (!phone) throw new Error("شماره تلفن الزامی است");
        
        // Remove all spaces and non-digit characters, then normalize Persian/Arabic digits to English
        let cleanPhone = phone
          .replace(/\s+/g, '') // Remove spaces
          .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString()) // Persian digits
          .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString()) // Arabic digits
          .replace(/[^0-9]/g, ''); // Remove all non-digit characters
        
        // Handle different phone number formats
        if (cleanPhone.startsWith('+98')) {
          cleanPhone = cleanPhone.slice(3);
        } else if (cleanPhone.startsWith('0098')) {
          cleanPhone = cleanPhone.slice(4);
        } else if (cleanPhone.startsWith('98') && cleanPhone.length > 10) {
          cleanPhone = cleanPhone.slice(2);
        } else if (cleanPhone.startsWith('0')) {
          // Already in local format (0912...), keep as is
          return cleanPhone;
        }
        
        // Add "0" at the beginning for international numbers converted to local format
        return '0' + cleanPhone;
      };

      const generatedUsername = generateUsernameFromPhone(validatedData.phone);
      
      // Force role to be user_level_2 and set parent
      const subUserData = {
        ...validatedData,
        username: generatedUsername, // Use generated username instead of manual input
        role: "user_level_2",
        parentUserId: req.user.id,
      };
      
      // Check if user already exists (only if email is provided)
      if (subUserData.email) {
        const existingEmailUser = await storage.getUserByEmail(subUserData.email);
        if (existingEmailUser) {
          return res.status(400).json({ message: "کاربری با این ایمیل قبلاً ثبت نام کرده است" });
        }
      }

      const existingUsernameUser = await storage.getUserByUsername(subUserData.username);
      if (existingUsernameUser) {
        return res.status(400).json({ message: "کاربری با این شماره تلفن قبلاً ثبت نام کرده است" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(subUserData.password!, 10);
      
      // Ensure email is set to null if not provided
      const finalSubUserData = {
        ...subUserData,
        email: subUserData.email || `temp_${Date.now()}@level2.local`,
        password: hashedPassword,
      };
      
      const subUser = await storage.createUser(finalSubUserData);

      // Create 7-day free trial subscription for new sub-user
      try {
        let trialSubscription = (await storage.getAllSubscriptions()).find(sub => 
          sub.isDefault === true
        );

        if (trialSubscription) {
          await storage.createUserSubscription({
            userId: subUser.id,
            subscriptionId: trialSubscription.id,
            remainingDays: 7,
            startDate: new Date(),
            endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            status: "active",
            isTrialPeriod: true,
          });
        }
      } catch (trialError) {
        console.error("خطا در ایجاد اشتراک آزمایشی برای زیرمجموعه:", trialError);
      }

      res.json({ ...subUser, password: undefined });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "داده های ورودی نامعتبر است", errors: error.errors });
      }
      res.status(500).json({ message: "خطا در ایجاد زیرمجموعه" });
    }
  });

  app.put("/api/sub-users/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      // Only level 1 users can update their sub-users
      if (req.user?.role !== "user_level_1") {
        return res.status(403).json({ message: "فقط کاربران سطح ۱ می‌توانند زیرمجموعه‌ها را ویرایش کنند" });
      }

      const { id } = req.params;
      const updates = req.body;
      
      // Check if the sub-user belongs to this level 1 user
      const existingSubUser = await storage.getUser(id);
      if (!existingSubUser || existingSubUser.parentUserId !== req.user.id) {
        return res.status(404).json({ message: "زیرمجموعه یافت نشد یا متعلق به شما نیست" });
      }
      
      // Don't allow changing role or parentUserId
      const { role, parentUserId, ...allowedUpdates } = updates;
      
      const user = await storage.updateUser(id, allowedUpdates);
      if (!user) {
        return res.status(404).json({ message: "زیرمجموعه یافت نشد" });
      }

      res.json({ ...user, password: undefined });
    } catch (error) {
      res.status(500).json({ message: "خطا در بروزرسانی زیرمجموعه" });
    }
  });

  app.delete("/api/sub-users/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      // Only level 1 users can delete their sub-users
      if (req.user?.role !== "user_level_1") {
        return res.status(403).json({ message: "فقط کاربران سطح ۱ می‌توانند زیرمجموعه‌ها را حذف کنند" });
      }

      const { id } = req.params;
      
      // Check if the sub-user belongs to this level 1 user
      const existingSubUser = await storage.getUser(id);
      if (!existingSubUser || existingSubUser.parentUserId !== req.user.id) {
        return res.status(404).json({ message: "زیرمجموعه یافت نشد یا متعلق به شما نیست" });
      }

      // Delete user subscriptions
      const userSubscriptions = await storage.getUserSubscriptionsByUserId(id);
      for (const subscription of userSubscriptions) {
        await storage.deleteUserSubscription(subscription.id);
      }

      // Delete user tickets
      const userTickets = await storage.getTicketsByUser(id);
      for (const ticket of userTickets) {
        await storage.deleteTicket(ticket.id);
      }

      // Delete user products
      const userProducts = await storage.getProductsByUser(id);
      for (const product of userProducts) {
        await storage.deleteProduct(product.id, id, existingSubUser.role);
      }

      // Finally delete the sub-user
      const success = await storage.deleteUser(id);
      
      if (!success) {
        return res.status(500).json({ message: "خطا در حذف زیرمجموعه" });
      }

      res.json({ message: "زیرمجموعه و تمام اطلاعات مربوطه با موفقیت حذف شد" });
    } catch (error) {
      console.error("خطا در حذف زیرمجموعه:", error);
      res.status(500).json({ message: "خطا در حذف زیرمجموعه" });
    }
  });

  // Reset password endpoint for sub-users
  app.post("/api/sub-users/:id/reset-password", authenticateToken, async (req: AuthRequest, res) => {
    try {
      // Only level 1 users can reset password for their sub-users
      if (req.user?.role !== "user_level_1") {
        return res.status(403).json({ message: "فقط کاربران سطح ۱ می‌توانند رمز عبور زیرمجموعه‌ها را بازنشانی کنند" });
      }

      const { id } = req.params;
      
      // Check if the sub-user belongs to this level 1 user
      const existingSubUser = await storage.getUser(id);
      if (!existingSubUser || existingSubUser.parentUserId !== req.user.id) {
        return res.status(404).json({ message: "زیرمجموعه یافت نشد یا متعلق به شما نیست" });
      }

      // Generate 7-digit random password (numbers only)
      const generateRandomPassword = () => {
        let password = '';
        for (let i = 0; i < 7; i++) {
          password += Math.floor(Math.random() * 10).toString();
        }
        return password;
      };

      const newPassword = generateRandomPassword();
      
      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      // Update user password
      const updatedUser = await storage.updateUserPassword(id, hashedPassword);
      if (!updatedUser) {
        return res.status(500).json({ message: "خطا در بازنشانی رمز عبور" });
      }

      // Send password via WhatsApp if user has phone number
      let sentViaWhatsApp = false;
      let whatsappMessage = "";
      
      try {
        const { whatsAppSender } = await import('./whatsapp-sender');
        if (existingSubUser.phone) {
          const message = `🔐 رمز عبور جدید شما:\n\n${newPassword}\n\nلطفاً این رمز عبور را در مکان امنی نگهداری کنید و پس از ورود اول آن را تغییر دهید.`;
          sentViaWhatsApp = await whatsAppSender.sendMessage(existingSubUser.phone, message, req.user.id);
          whatsappMessage = sentViaWhatsApp ? "رمز عبور از طریق واتس‌اپ ارسال شد" : "ارسال واتس‌اپ ناموفق بود";
        } else {
          whatsappMessage = "شماره تلفن کاربر موجود نیست";
        }
      } catch (whatsappError) {
        console.warn("خطا در ارسال رمز عبور از طریق واتس‌اپ:", whatsappError);
        whatsappMessage = "خطا در ارسال واتس‌اپ";
      }

      res.json({ 
        userId: id, 
        message: sentViaWhatsApp ? "رمز عبور جدید تولید و از طریق واتس‌اپ ارسال شد" : `رمز عبور جدید تولید شد - ${whatsappMessage}`,
        sentViaWhatsApp,
        whatsappStatus: whatsappMessage
      });
    } catch (error) {
      console.error("خطا در بازنشانی رمز عبور:", error);
      res.status(500).json({ message: "خطا در بازنشانی رمز عبور" });
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
      
      // Validate request body using Zod schema
      const validatedData = ticketReplySchema.parse({
        message: req.body.adminReply || req.body.message
      });
      const { message } = validatedData;
      
      // Get current ticket
      const ticket = await storage.getTicket(id);
      if (!ticket) {
        return res.status(404).json({ message: "تیکت یافت نشد" });
      }
      
      // Parse existing conversation thread
      const existingThread = parseConversationThread(ticket.adminReply);
      
      // Add new admin message to conversation thread
      const updatedThread = addMessageToThread(existingThread, message, true, 'پشتیبانی');
      
      // Serialize conversation thread back to JSON
      const serializedThread = serializeConversationThread(updatedThread);
      
      // Update ticket with new conversation thread
      const updatedTicket = await storage.updateTicket(id, {
        adminReply: serializedThread,
        adminReplyAt: new Date(),
        status: "read",
        lastResponseAt: new Date(),
      });
      
      if (!updatedTicket) {
        return res.status(404).json({ message: "تیکت یافت نشد" });
      }

      res.json(updatedTicket);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "داده های ورودی نامعتبر است", errors: error.errors });
      }
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

  // User-specific tickets with details
  app.get("/api/my-tickets", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const tickets = await storage.getTicketsByUser(req.user!.id);
      
      // For each ticket, parse the conversation thread
      const ticketsWithResponses = tickets.map(ticket => ({
        ...ticket,
        responses: parseConversationThread(ticket.adminReply)
      }));
      
      res.json(ticketsWithResponses);
    } catch (error) {
      res.status(500).json({ message: "خطا در دریافت تیکت‌ها" });
    }
  });

  // User reply to ticket (POST version for users)
  app.post("/api/tickets/:id/reply", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      
      // Validate request body using Zod schema
      const validatedData = ticketReplySchema.parse(req.body);
      const { message } = validatedData;
      
      // Check if ticket belongs to user or user is admin
      const ticket = await storage.getTicket(id);
      if (!ticket) {
        return res.status(404).json({ message: "تیکت یافت نشد" });
      }
      
      if (req.user!.role !== "admin" && ticket.userId !== req.user!.id) {
        return res.status(403).json({ message: "دسترسی به این تیکت ندارید" });
      }
      
      // Parse existing conversation thread
      const existingThread = parseConversationThread(ticket.adminReply);
      
      // Determine user name and admin status
      const isAdmin = req.user!.role === "admin";
      const userName = isAdmin ? 'پشتیبانی' : `${req.user!.firstName} ${req.user!.lastName}`;
      
      // Add new message to conversation thread
      const updatedThread = addMessageToThread(existingThread, message, isAdmin, userName);
      
      // Serialize conversation thread back to JSON
      const serializedThread = serializeConversationThread(updatedThread);
      
      // Update ticket with new conversation thread
      const updatedTicket = await storage.updateTicket(id, {
        adminReply: serializedThread,
        adminReplyAt: new Date(),
        status: "read",
        lastResponseAt: new Date(),
      });
      
      res.json(updatedTicket);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "داده های ورودی نامعتبر است", errors: error.errors });
      }
      res.status(500).json({ message: "خطا در ارسال پاسخ" });
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
      
      // Note: insertSubscriptionSchema already omits isDefault, so this check is not needed
      // but we keep it for safety
      
      // Force isDefault to false for all user-created subscriptions
      const safeData = { ...validatedData, isDefault: false };
      
      const subscription = await storage.createSubscription(safeData);
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
      
      // Get current subscription to check if it's the default free subscription
      const currentSubscription = await storage.getSubscription(id);
      if (!currentSubscription) {
        return res.status(404).json({ message: "اشتراک یافت نشد" });
      }
      
      // Prevent ANY modifications to default subscription (complete immutability)
      if (currentSubscription.isDefault) {
        return res.status(400).json({ 
          message: "امکان تغییر اشتراک پیش فرض رایگان وجود ندارد" 
        });
      } else {
        // Prevent setting isDefault=true on non-default subscriptions
        if (updates.isDefault === true) {
          return res.status(400).json({ 
            message: "تنها یک اشتراک پیش فرض می تواند وجود داشته باشد" 
          });
        }
      }
      
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
      
      // Get subscription details first to check if it's the default free subscription
      const subscription = await storage.getSubscription(id);
      if (!subscription) {
        return res.status(404).json({ message: "اشتراک یافت نشد" });
      }
      
      // Prevent deletion of default subscription
      if (subscription.isDefault) {
        return res.status(400).json({ 
          message: "امکان حذف اشتراک پیش فرض رایگان وجود ندارد" 
        });
      }
      
      const success = await storage.deleteSubscription(id);
      
      if (!success) {
        return res.status(404).json({ message: "اشتراک یافت نشد" });
      }

      res.json({ message: "اشتراک با موفقیت حذف شد" });
    } catch (error) {
      console.error("Error deleting subscription:", error);
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
      const products = await storage.getAllProducts(req.user!.id, req.user!.role);
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "خطا در دریافت محصولات" });
    }
  });

  app.post("/api/products", authenticateToken, upload.single("productImage"), async (req: AuthRequest, res) => {
    try {
      let imageData = null;
      
      // اگر فایل آپلود شده باشد، مسیر آن را ذخیره می‌کنیم
      if ((req as any).file) {
        // مسیر فایل آپلود شده را ذخیره می‌کنیم
        imageData = `/uploads/${(req as any).file.filename}`;
      }
      
      // Validate categoryId if provided
      if (req.body.categoryId) {
        console.log(`🔍 DEBUG CREATE: Checking category ${req.body.categoryId} for user ${req.user!.id} with role ${req.user!.role}`);
        const category = await storage.getCategory(req.body.categoryId, req.user!.id, req.user!.role);
        console.log(`🔍 DEBUG CREATE: Found category:`, category);
        if (!category || !category.isActive) {
          console.log(`❌ DEBUG CREATE: Category validation failed - category: ${!!category}, isActive: ${category?.isActive}`);
          return res.status(400).json({ message: "دسته‌بندی انتخاب شده معتبر نیست" });
        }
        console.log(`✅ DEBUG CREATE: Category validation passed`);
      }

      const validatedData = insertProductSchema.parse({
        ...req.body,
        userId: req.user!.id,
        image: imageData,
        categoryId: req.body.categoryId || null,
        priceBeforeDiscount: req.body.priceBeforeDiscount,
        priceAfterDiscount: req.body.priceAfterDiscount || null,
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
      // user_level_2 cannot modify products, only view them
      if (req.user!.role === 'user_level_2') {
        return res.status(403).json({ message: "شما اجازه تغییر محصولات را ندارید" });
      }
      
      const { id } = req.params;
      let updates = { ...req.body };
      
      // Validate categoryId if provided
      if (req.body.categoryId) {
        const category = await storage.getCategory(req.body.categoryId, req.user!.id, req.user!.role);
        if (!category || !category.isActive) {
          return res.status(400).json({ message: "دسته‌بندی انتخاب شده معتبر نیست" });
        }
      }
      
      // اگر فایل جدید آپلود شده باشد، مسیر آن را ذخیره می‌کنیم
      if ((req as any).file) {
        // مسیر فایل آپلود شده را ذخیره می‌کنیم
        updates.image = `/uploads/${(req as any).file.filename}`;
      }
      
      const updatedProduct = await storage.updateProduct(id, updates, req.user!.id, req.user!.role);
      if (!updatedProduct) {
        return res.status(404).json({ message: "محصول یافت نشد" });
      }
      res.json(updatedProduct);
    } catch (error) {
      console.error("خطا در بروزرسانی محصول:", error);
      res.status(500).json({ message: "خطا در بروزرسانی محصول" });
    }
  });

  app.delete("/api/products/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      // user_level_2 cannot modify products, only view them
      if (req.user!.role === 'user_level_2') {
        return res.status(403).json({ message: "شما اجازه حذف محصولات را ندارید" });
      }
      
      const { id } = req.params;
      
      const success = await storage.deleteProduct(id, req.user!.id, req.user!.role);
      if (!success) {
        return res.status(404).json({ message: "محصول یافت نشد" });
      }
      res.json({ message: "محصول با موفقیت حذف شد" });
    } catch (error) {
      res.status(500).json({ message: "خطا در حذف محصول" });
    }
  });

  // WhatsApp settings routes (Admin and Level 1 users)
  app.get("/api/whatsapp-settings", authenticateToken, requireAdminOrLevel1, async (req: AuthRequest, res) => {
    try {
      const user = req.user!;
      
      // For level 1 users, return their individual token if they have one
      if (user.role === 'user_level_1') {
        res.json({
          token: user.whatsappToken || '',
          isEnabled: !!user.whatsappToken,
          notifications: [],
          aiName: "من هوش مصنوعی هستم",
          isPersonal: true
        });
      } else {
        // For admin, return global settings
        const settings = await storage.getWhatsappSettings();
        res.json({
          ...settings,
          aiName: settings?.aiName || "من هوش مصنوعی هستم",
          isPersonal: false
        });
      }
    } catch (error) {
      res.status(500).json({ message: "خطا در دریافت تنظیمات واتس اپ" });
    }
  });

  app.put("/api/whatsapp-settings", authenticateToken, requireAdminOrLevel1, async (req: AuthRequest, res) => {
    try {
      const user = req.user!;
      
      // For level 1 users, update their personal token
      if (user.role === 'user_level_1') {
        const { token } = req.body;
        const updatedUser = await storage.updateUser(user.id, { 
          whatsappToken: token || null 
        });
        
        if (!updatedUser) {
          return res.status(404).json({ message: "کاربر یافت نشد" });
        }
        
        res.json({
          token: updatedUser.whatsappToken || '',
          isEnabled: !!updatedUser.whatsappToken,
          notifications: [],
          aiName: "من هوش مصنوعی هستم",
          isPersonal: true
        });
      } else {
        // For admin, update global settings
        const validatedData = insertWhatsappSettingsSchema.parse(req.body);
        const settings = await storage.updateWhatsappSettings(validatedData);
        res.json({
          ...settings,
          isPersonal: false
        });
      }
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

  // Categories API
  // Get all categories
  app.get("/api/categories", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const categories = await storage.getAllCategories(req.user!.id, req.user!.role);
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "خطا در دریافت دسته‌بندی‌ها" });
    }
  });

  // Get category tree
  app.get("/api/categories/tree", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const tree = await storage.getCategoryTree(req.user!.id, req.user!.role);
      res.json(tree);
    } catch (error) {
      res.status(500).json({ message: "خطا در دریافت ساختار درختی دسته‌بندی‌ها" });
    }
  });

  // Get categories by parent
  app.get("/api/categories/by-parent/:parentId?", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const parentId = req.params.parentId === 'null' ? null : req.params.parentId;
      const categories = await storage.getCategoriesByParent(parentId, req.user!.id, req.user!.role);
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "خطا در دریافت زیر دسته‌بندی‌ها" });
    }
  });

  // Create category
  app.post("/api/categories", authenticateToken, requireAdminOrUserLevel1, async (req: AuthRequest, res) => {
    try {
      const categoryData = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(categoryData, req.user!.id);
      res.json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "داده‌های ورودی نامعتبر است", errors: error.errors });
      }
      res.status(500).json({ message: "خطا در ایجاد دسته‌بندی" });
    }
  });

  // Get single category (UUID constrained)
  app.get("/api/categories/:id([0-9a-fA-F-]{36})", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const category = await storage.getCategory(req.params.id, req.user!.id, req.user!.role);
      if (!category) {
        return res.status(404).json({ message: "دسته‌بندی یافت نشد" });
      }
      res.json(category);
    } catch (error) {
      res.status(500).json({ message: "خطا در دریافت دسته‌بندی" });
    }
  });

  // Update category (UUID constrained)
  app.put("/api/categories/:id([0-9a-fA-F-]{36})", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const updates = req.body;
      // Server-side control: prevent modification of createdBy
      delete updates.createdBy;
      const category = await storage.updateCategory(req.params.id, updates, req.user!.id, req.user!.role);
      if (!category) {
        return res.status(404).json({ message: "دسته‌بندی یافت نشد" });
      }
      res.json(category);
    } catch (error) {
      res.status(500).json({ message: "خطا در بروزرسانی دسته‌بندی" });
    }
  });

  // Reorder categories (must be before :id routes)
  app.put("/api/categories/reorder", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const updates = z.array(updateCategoryOrderSchema).parse(req.body);
      
      // Map client format to storage format
      const mappedUpdates = updates.map(update => ({
        id: update.categoryId,
        order: update.newOrder,
        parentId: update.newParentId || null
      }));
      
      const success = await storage.reorderCategories(mappedUpdates);
      if (!success) {
        return res.status(400).json({ message: "خطا در تغییر ترتیب دسته‌بندی‌ها" });
      }
      
      res.json({ message: "ترتیب دسته‌بندی‌ها با موفقیت بروزرسانی شد" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "داده‌های ورودی نامعتبر است", errors: error.errors });
      }
      res.status(500).json({ message: "خطا در تغییر ترتیب دسته‌بندی‌ها" });
    }
  });

  // Delete category (UUID constrained)
  app.delete("/api/categories/:id([0-9a-fA-F-]{36})", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const success = await storage.deleteCategory(req.params.id, req.user!.id, req.user!.role);
      if (!success) {
        return res.status(404).json({ message: "دسته‌بندی یافت نشد" });
      }
      res.json({ message: "دسته‌بندی با موفقیت حذف شد" });
    } catch (error) {
      res.status(500).json({ message: "خطا در حذف دسته‌بندی" });
    }
  });

  // Welcome message routes
  app.get("/api/welcome-message", authenticateToken, requireAdminOrLevel1, async (req: AuthRequest, res) => {
    try {
      const user = req.user!;
      
      // پیام پیش‌فرض اگر کاربر پیام سفارشی نداشته باشد
      const defaultMessage = `سلام {firstName}! 🌟

به سیستم ما خوش آمدید. شما با موفقیت ثبت نام شدید.

🎁 اشتراک رایگان 7 روزه به حساب شما اضافه شد.

برای کمک و راهنمایی، می‌توانید هر زمان پیام بدهید.`;

      res.json({ message: user.welcomeMessage || defaultMessage });
    } catch (error) {
      res.status(500).json({ message: "خطا در دریافت پیام خوش آمدگویی" });
    }
  });

  app.post("/api/welcome-message", authenticateToken, requireAdminOrLevel1, async (req: AuthRequest, res) => {
    try {
      const { message } = req.body;
      
      if (typeof message !== "string") {
        return res.status(400).json({ message: "پیام باید متنی باشد" });
      }

      const user = req.user!;
      await storage.updateUser(user.id, { welcomeMessage: message });
      
      res.json({ message: "پیام خوش آمدگویی با موفقیت ذخیره شد" });
    } catch (error) {
      res.status(500).json({ message: "خطا در ذخیره پیام خوش آمدگویی" });
    }
  });

  // Serve uploaded files
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  const httpServer = createServer(app);
  return httpServer;
}
