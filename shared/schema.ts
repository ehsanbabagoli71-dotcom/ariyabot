import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, decimal, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").unique(),
  phone: text("phone").notNull(),
  whatsappNumber: text("whatsapp_number"), // WhatsApp number for automatic registration
  whatsappToken: text("whatsapp_token"), // Individual WhatsApp token for level 1 users
  password: text("password"),
  googleId: text("google_id"),
  role: text("role").notNull().default("user_level_1"), // admin, user_level_1, user_level_2
  parentUserId: varchar("parent_user_id"), // For hierarchical user management - will add reference later
  profilePicture: text("profile_picture"),
  isWhatsappRegistered: boolean("is_whatsapp_registered").notNull().default(false), // Track if user was auto-registered via WhatsApp
  welcomeMessage: text("welcome_message"), // Custom welcome message for WhatsApp auto-registration
  createdAt: timestamp("created_at").defaultNow(),
});

export const tickets = pgTable("tickets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  subject: text("subject").notNull(),
  category: text("category").notNull(),
  priority: text("priority").notNull().default("medium"),
  message: text("message").notNull(),
  status: text("status").notNull().default("unread"), // unread, read, closed
  attachments: text("attachments").array(),
  adminReply: text("admin_reply"),
  adminReplyAt: timestamp("admin_reply_at"),
  lastResponseAt: timestamp("last_response_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  image: text("image"),
  userLevel: text("user_level").notNull(), // user_level_1, user_level_2
  priceBeforeDiscount: decimal("price_before_discount", { precision: 10, scale: 2 }),
  priceAfterDiscount: decimal("price_after_discount", { precision: 10, scale: 2 }),
  duration: text("duration").notNull().default("monthly"), // monthly, yearly
  features: text("features").array().default([]),
  isActive: boolean("is_active").notNull().default(true),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  categoryId: varchar("category_id").references(() => categories.id),
  image: text("image"),
  quantity: integer("quantity").notNull().default(0),
  priceBeforeDiscount: decimal("price_before_discount", { precision: 10, scale: 2 }).notNull(),
  priceAfterDiscount: decimal("price_after_discount", { precision: 10, scale: 2 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const whatsappSettings = pgTable("whatsapp_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  token: text("token"),
  isEnabled: boolean("is_enabled").notNull().default(true),
  notifications: text("notifications").array().default([]),
  aiName: text("ai_name").notNull().default("من هوش مصنوعی هستم"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const sentMessages = pgTable("sent_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  recipient: text("recipient").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("sent"), // sent, delivered, failed
  timestamp: timestamp("timestamp").defaultNow(),
});

export const receivedMessages = pgTable("received_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  whatsiPlusId: text("whatsiplus_id").notNull(), // شناسه اصلی از WhatsiPlus
  sender: text("sender").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("خوانده نشده"), // خوانده نشده, خوانده شده
  originalDate: text("original_date"), // تاریخ اصلی از WhatsiPlus
  timestamp: timestamp("timestamp").defaultNow(),
}, (table) => ({
  // Composite unique constraint on whatsiplus_id and user_id
  whatsiUserUnique: unique("received_messages_whatsi_user_unique").on(table.whatsiPlusId, table.userId),
}));

export const aiTokenSettings = pgTable("ai_token_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  token: text("token").notNull(),
  provider: text("provider").notNull().default("openai"), // openai, claude, etc
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const userSubscriptions = pgTable("user_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  subscriptionId: varchar("subscription_id").notNull().references(() => subscriptions.id),
  status: text("status").notNull().default("active"), // active, inactive, expired
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date").notNull(),
  remainingDays: integer("remaining_days").notNull().default(0),
  isTrialPeriod: boolean("is_trial_period").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  parentId: varchar("parent_id"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  order: integer("order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const carts = pgTable("carts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  itemCount: integer("item_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const cartItems = pgTable("cart_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cartId: varchar("cart_id").notNull().references(() => carts.id),
  productId: varchar("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

// Schema for level 2 users where email and username are optional (username auto-generated from phone)
export const insertSubUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  email: true, // Remove email from required fields
  username: true, // Remove username from required fields - auto-generated from phone
}).extend({
  email: z.string().email("ایمیل معتبر وارد کنید").optional(), // Make email optional
});

export const insertTicketSchema = createInsertSchema(tickets).omit({
  id: true,
  createdAt: true,
  lastResponseAt: true,
  adminReply: true,
  adminReplyAt: true,
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
  isDefault: true, // Prevent clients from setting isDefault
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
}).extend({
  priceBeforeDiscount: z.union([z.string(), z.number()]).transform(val => String(val)),
  priceAfterDiscount: z.union([z.string(), z.number(), z.null()]).transform(val => val === null ? null : String(val)),
});

export const insertWhatsappSettingsSchema = createInsertSchema(whatsappSettings).omit({
  id: true,
  updatedAt: true,
});

export const insertSentMessageSchema = createInsertSchema(sentMessages).omit({
  id: true,
  timestamp: true,
});

export const insertReceivedMessageSchema = createInsertSchema(receivedMessages).omit({
  id: true,
  timestamp: true,
});

export const insertAiTokenSettingsSchema = createInsertSchema(aiTokenSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSubscriptionSchema = createInsertSchema(userSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdBy: true, // Server controls this field
  createdAt: true,
  updatedAt: true,
});

export const insertCartSchema = createInsertSchema(carts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCartItemSchema = createInsertSchema(cartItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  unitPrice: z.union([z.string(), z.number()]).transform(val => String(val)),
  totalPrice: z.union([z.string(), z.number()]).transform(val => String(val)),
});

export const updateCategoryOrderSchema = z.object({
  categoryId: z.string().uuid(),
  newOrder: z.number().int().min(0),
  newParentId: z.string().uuid().nullable().optional(),
});

// Ticket reply validation schema
export const ticketReplySchema = z.object({
  message: z.string().min(1, "پیام نمی‌تواند خالی باشد").max(1000, "پیام نمی‌تواند بیش از 1000 کاراکتر باشد"),
});

// Reset password validation schema
export const resetPasswordSchema = z.object({
  password: z.string().min(6, "رمز عبور باید حداقل ۶ کاراکتر باشد"),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Ticket = typeof tickets.$inferSelect;
export type InsertTicket = z.infer<typeof insertTicketSchema>;

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type WhatsappSettings = typeof whatsappSettings.$inferSelect;
export type InsertWhatsappSettings = z.infer<typeof insertWhatsappSettingsSchema>;

export type SentMessage = typeof sentMessages.$inferSelect;
export type InsertSentMessage = z.infer<typeof insertSentMessageSchema>;

export type ReceivedMessage = typeof receivedMessages.$inferSelect;
export type InsertReceivedMessage = z.infer<typeof insertReceivedMessageSchema>;

export type AiTokenSettings = typeof aiTokenSettings.$inferSelect;
export type InsertAiTokenSettings = z.infer<typeof insertAiTokenSettingsSchema>;

export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type InsertUserSubscription = z.infer<typeof insertUserSubscriptionSchema>;

export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export type Cart = typeof carts.$inferSelect;
export type InsertCart = z.infer<typeof insertCartSchema>;

export type CartItem = typeof cartItems.$inferSelect;
export type InsertCartItem = z.infer<typeof insertCartItemSchema>;
