import { type User, type InsertUser, type Ticket, type InsertTicket, type Subscription, type InsertSubscription, type Product, type InsertProduct, type WhatsappSettings, type InsertWhatsappSettings, type SentMessage, type InsertSentMessage, type ReceivedMessage, type InsertReceivedMessage } from "@shared/schema";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmailOrUsername(emailOrUsername: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  getAllUsers(): Promise<User[]>;
  
  // Tickets
  getTicket(id: string): Promise<Ticket | undefined>;
  getTicketsByUser(userId: string): Promise<Ticket[]>;
  getAllTickets(): Promise<Ticket[]>;
  createTicket(ticket: InsertTicket): Promise<Ticket>;
  updateTicket(id: string, ticket: Partial<Ticket>): Promise<Ticket | undefined>;
  deleteTicket(id: string): Promise<boolean>;
  
  // Subscriptions
  getSubscription(id: string): Promise<Subscription | undefined>;
  getAllSubscriptions(): Promise<Subscription[]>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  updateSubscription(id: string, subscription: Partial<Subscription>): Promise<Subscription | undefined>;
  deleteSubscription(id: string): Promise<boolean>;
  
  // Products
  getProduct(id: string): Promise<Product | undefined>;
  getProductsByUser(userId: string): Promise<Product[]>;
  getAllProducts(): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<Product>): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<boolean>;
  
  // WhatsApp Settings
  getWhatsappSettings(): Promise<WhatsappSettings | undefined>;
  updateWhatsappSettings(settings: InsertWhatsappSettings): Promise<WhatsappSettings>;
  
  // Messages
  getSentMessagesByUser(userId: string): Promise<SentMessage[]>;
  createSentMessage(message: InsertSentMessage): Promise<SentMessage>;
  getReceivedMessagesByUser(userId: string): Promise<ReceivedMessage[]>;
  getReceivedMessagesByUserPaginated(userId: string, page: number, limit: number): Promise<{ messages: ReceivedMessage[], total: number, totalPages: number }>;
  getReceivedMessageByWhatsiPlusId(whatsiPlusId: string): Promise<ReceivedMessage | undefined>;
  createReceivedMessage(message: InsertReceivedMessage): Promise<ReceivedMessage>;
  updateReceivedMessageStatus(id: string, status: string): Promise<ReceivedMessage | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private tickets: Map<string, Ticket>;
  private subscriptions: Map<string, Subscription>;
  private products: Map<string, Product>;
  private whatsappSettings: WhatsappSettings | undefined;
  private sentMessages: Map<string, SentMessage>;
  private receivedMessages: Map<string, ReceivedMessage>;

  constructor() {
    this.users = new Map();
    this.tickets = new Map();
    this.subscriptions = new Map();
    this.products = new Map();
    this.whatsappSettings = undefined;
    this.sentMessages = new Map();
    this.receivedMessages = new Map();
    
    // Create default admin user
    this.initializeAdminUser();
  }

  private async initializeAdminUser() {
    const hashedPassword = await bcrypt.hash("232111", 10);
    const adminUser: User = {
      id: randomUUID(),
      username: "ehsan",
      firstName: "احسان",
      lastName: "مدیر",
      email: "ehsan@admin.com",
      phone: "09123456789",
      password: hashedPassword,
      googleId: null,
      role: "admin",
      profilePicture: null,
      createdAt: new Date(),
    };
    this.users.set(adminUser.id, adminUser);
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async getUserByEmailOrUsername(emailOrUsername: string): Promise<User | undefined> {
    // Try email first
    const userByEmail = await this.getUserByEmail(emailOrUsername);
    if (userByEmail) return userByEmail;
    
    // Try username if email doesn't work
    const userByUsername = await this.getUserByUsername(emailOrUsername);
    return userByUsername;
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.googleId === googleId);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      ...insertUser,
      id,
      role: insertUser.role || 'user_level_1',
      password: insertUser.password || null,
      googleId: insertUser.googleId || null,
      profilePicture: insertUser.profilePicture || null,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: string): Promise<boolean> {
    return this.users.delete(id);
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // Tickets
  async getTicket(id: string): Promise<Ticket | undefined> {
    return this.tickets.get(id);
  }

  async getTicketsByUser(userId: string): Promise<Ticket[]> {
    return Array.from(this.tickets.values()).filter(ticket => ticket.userId === userId);
  }

  async getAllTickets(): Promise<Ticket[]> {
    return Array.from(this.tickets.values());
  }

  async createTicket(insertTicket: InsertTicket): Promise<Ticket> {
    const id = randomUUID();
    const ticket: Ticket = {
      ...insertTicket,
      id,
      priority: insertTicket.priority || 'medium',
      attachments: insertTicket.attachments || null,
      status: "unread",
      adminReply: null,
      adminReplyAt: null,
      lastResponseAt: new Date(),
      createdAt: new Date(),
    };
    this.tickets.set(id, ticket);
    return ticket;
  }

  async updateTicket(id: string, updates: Partial<Ticket>): Promise<Ticket | undefined> {
    const ticket = this.tickets.get(id);
    if (!ticket) return undefined;
    
    const updatedTicket = { ...ticket, ...updates };
    this.tickets.set(id, updatedTicket);
    return updatedTicket;
  }

  async deleteTicket(id: string): Promise<boolean> {
    return this.tickets.delete(id);
  }

  // Subscriptions
  async getSubscription(id: string): Promise<Subscription | undefined> {
    return this.subscriptions.get(id);
  }

  async getAllSubscriptions(): Promise<Subscription[]> {
    return Array.from(this.subscriptions.values());
  }

  async createSubscription(insertSubscription: InsertSubscription): Promise<Subscription> {
    const id = randomUUID();
    const subscription: Subscription = {
      ...insertSubscription,
      id,
      description: insertSubscription.description || null,
      createdAt: new Date(),
    };
    this.subscriptions.set(id, subscription);
    return subscription;
  }

  async updateSubscription(id: string, updates: Partial<Subscription>): Promise<Subscription | undefined> {
    const subscription = this.subscriptions.get(id);
    if (!subscription) return undefined;
    
    const updatedSubscription = { ...subscription, ...updates };
    this.subscriptions.set(id, updatedSubscription);
    return updatedSubscription;
  }

  async deleteSubscription(id: string): Promise<boolean> {
    return this.subscriptions.delete(id);
  }

  // Products
  async getProduct(id: string): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async getProductsByUser(userId: string): Promise<Product[]> {
    return Array.from(this.products.values()).filter(product => product.userId === userId);
  }

  async getAllProducts(): Promise<Product[]> {
    return Array.from(this.products.values());
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const id = randomUUID();
    const product: Product = {
      ...insertProduct,
      id,
      description: insertProduct.description || null,
      image: insertProduct.image || null,
      quantity: insertProduct.quantity || 0,
      priceAfterDiscount: insertProduct.priceAfterDiscount || null,
      isActive: insertProduct.isActive !== undefined ? insertProduct.isActive : true,
      createdAt: new Date(),
    };
    this.products.set(id, product);
    return product;
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product | undefined> {
    const product = this.products.get(id);
    if (!product) return undefined;
    
    const updatedProduct = { ...product, ...updates };
    this.products.set(id, updatedProduct);
    return updatedProduct;
  }

  async deleteProduct(id: string): Promise<boolean> {
    return this.products.delete(id);
  }

  // WhatsApp Settings
  async getWhatsappSettings(): Promise<WhatsappSettings | undefined> {
    return this.whatsappSettings;
  }

  async updateWhatsappSettings(settings: InsertWhatsappSettings): Promise<WhatsappSettings> {
    const whatsappSettings: WhatsappSettings = {
      ...settings,
      id: this.whatsappSettings?.id || randomUUID(),
      token: settings.token || null,
      phoneNumber: settings.phoneNumber || null,
      isEnabled: settings.isEnabled || false,
      notifications: settings.notifications || null,
      updatedAt: new Date(),
    };
    this.whatsappSettings = whatsappSettings;
    return whatsappSettings;
  }

  // Messages
  async getSentMessagesByUser(userId: string): Promise<SentMessage[]> {
    return Array.from(this.sentMessages.values()).filter(message => message.userId === userId);
  }

  async createSentMessage(insertMessage: InsertSentMessage): Promise<SentMessage> {
    const id = randomUUID();
    const message: SentMessage = {
      ...insertMessage,
      id,
      status: insertMessage.status || "sent",
      timestamp: new Date(),
    };
    this.sentMessages.set(id, message);
    return message;
  }

  async getReceivedMessagesByUser(userId: string): Promise<ReceivedMessage[]> {
    return Array.from(this.receivedMessages.values()).filter(message => message.userId === userId);
  }

  async getReceivedMessagesByUserPaginated(userId: string, page: number, limit: number): Promise<{ messages: ReceivedMessage[], total: number, totalPages: number }> {
    const allMessages = Array.from(this.receivedMessages.values())
      .filter(message => message.userId === userId)
      .sort((a, b) => (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0));
    
    const total = allMessages.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const messages = allMessages.slice(offset, offset + limit);
    
    return { messages, total, totalPages };
  }

  async getReceivedMessageByWhatsiPlusId(whatsiPlusId: string): Promise<ReceivedMessage | undefined> {
    return Array.from(this.receivedMessages.values()).find(message => message.whatsiPlusId === whatsiPlusId);
  }

  async createReceivedMessage(insertMessage: InsertReceivedMessage): Promise<ReceivedMessage> {
    const id = randomUUID();
    const message: ReceivedMessage = {
      ...insertMessage,
      id,
      status: insertMessage.status || "خوانده نشده",
      whatsiPlusId: insertMessage.whatsiPlusId || null,
      originalDate: insertMessage.originalDate || null,
      timestamp: new Date(),
    };
    this.receivedMessages.set(id, message);
    return message;
  }

  async updateReceivedMessageStatus(id: string, status: string): Promise<ReceivedMessage | undefined> {
    const message = this.receivedMessages.get(id);
    if (!message) return undefined;
    
    const updatedMessage = { ...message, status };
    this.receivedMessages.set(id, updatedMessage);
    return updatedMessage;
  }
}

import { DbStorage } from "./db-storage";

export const storage = process.env.NODE_ENV === "test" ? new MemStorage() : new DbStorage();
