import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  password: text("password"),
  googleId: text("google_id"),
  role: text("role").notNull().default("user_level_1"), // admin, user_level_1, user_level_2
  profilePicture: text("profile_picture"),
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
  userLevel: text("user_level").notNull(), // user_level_1, user_level_2
  createdAt: timestamp("created_at").defaultNow(),
});

export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
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
  whatsiPlusId: text("whatsiplus_id").unique(), // شناسه اصلی از WhatsiPlus
  sender: text("sender").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("خوانده نشده"), // خوانده نشده, خوانده شده
  originalDate: text("original_date"), // تاریخ اصلی از WhatsiPlus
  timestamp: timestamp("timestamp").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
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
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
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
