import { type User, type InsertUser, type Ticket, type InsertTicket, type Subscription, type InsertSubscription, type Product, type InsertProduct, type WhatsappSettings, type InsertWhatsappSettings, type SentMessage, type InsertSentMessage, type ReceivedMessage, type InsertReceivedMessage, type AiTokenSettings, type InsertAiTokenSettings, type UserSubscription, type InsertUserSubscription, type Category, type InsertCategory } from "@shared/schema";
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
  getProduct(id: string, currentUserId: string, userRole: string): Promise<Product | undefined>;
  getProductsByUser(userId: string): Promise<Product[]>;
  getAllProducts(currentUserId?: string, userRole?: string): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<Product>, currentUserId: string, userRole: string): Promise<Product | undefined>;
  deleteProduct(id: string, currentUserId: string, userRole: string): Promise<boolean>;
  
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

  // AI Token Settings
  getAiTokenSettings(): Promise<AiTokenSettings | undefined>;
  updateAiTokenSettings(settings: InsertAiTokenSettings): Promise<AiTokenSettings>;
  
  // User Subscriptions
  getUserSubscription(userId: string): Promise<UserSubscription & { subscriptionName?: string | null; subscriptionDescription?: string | null } | undefined>;
  getUserSubscriptionById(id: string): Promise<UserSubscription | undefined>;
  getUserSubscriptionsByUserId(userId: string): Promise<UserSubscription[]>;
  getAllUserSubscriptions(): Promise<UserSubscription[]>;
  createUserSubscription(userSubscription: InsertUserSubscription): Promise<UserSubscription>;
  updateUserSubscription(id: string, updates: Partial<UserSubscription>): Promise<UserSubscription | undefined>;
  deleteUserSubscription(id: string): Promise<boolean>;
  updateRemainingDays(id: string, remainingDays: number): Promise<UserSubscription | undefined>;
  getActiveUserSubscriptions(): Promise<UserSubscription[]>;
  getExpiredUserSubscriptions(): Promise<UserSubscription[]>;
  
  // Categories  
  getCategory(id: string, currentUserId: string, userRole: string): Promise<Category | undefined>;
  getAllCategories(currentUserId: string, userRole: string): Promise<Category[]>;
  getCategoriesByParent(parentId: string | null, currentUserId: string, userRole: string): Promise<Category[]>;
  getCategoryTree(currentUserId: string, userRole: string): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: string, category: Partial<Category>, currentUserId: string, userRole: string): Promise<Category | undefined>;
  deleteCategory(id: string, currentUserId: string, userRole: string): Promise<boolean>;
  reorderCategories(updates: { id: string; order: number; parentId?: string | null }[]): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private tickets: Map<string, Ticket>;
  private subscriptions: Map<string, Subscription>;
  private products: Map<string, Product>;
  private whatsappSettings: WhatsappSettings | undefined;
  private sentMessages: Map<string, SentMessage>;
  private receivedMessages: Map<string, ReceivedMessage>;
  private aiTokenSettings: AiTokenSettings | undefined;
  private userSubscriptions: Map<string, UserSubscription>;
  private categories: Map<string, Category>;

  constructor() {
    this.users = new Map();
    this.tickets = new Map();
    this.subscriptions = new Map();
    this.products = new Map();
    this.whatsappSettings = undefined;
    this.sentMessages = new Map();
    this.receivedMessages = new Map();
    this.aiTokenSettings = undefined;
    this.userSubscriptions = new Map();
    this.categories = new Map();
    
    // Create default admin user
    this.initializeAdminUser();
    
    // Create default free subscription
    this.initializeDefaultSubscription();
  }

  private async initializeAdminUser() {
    // Use environment variable for admin password, fallback to random password
    const adminPassword = process.env.ADMIN_PASSWORD || this.generateRandomPassword();
    if (!process.env.ADMIN_PASSWORD) {
      console.log("🔑 Admin password auto-generated. Username: ehsan");
      console.log("⚠️  Set ADMIN_PASSWORD environment variable for custom password");
      console.log("💡 For development: set NODE_ENV=development to see generated password");
    }
    
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
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

  private generateRandomPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  private async initializeDefaultSubscription() {
    const defaultSubscription: Subscription = {
      id: randomUUID(),
      name: "اشتراک رایگان",
      description: "اشتراک پیش‌فرض رایگان 7 روزه",
      image: null,
      userLevel: "user_level_1",
      priceBeforeDiscount: "0",
      priceAfterDiscount: null,
      duration: "monthly",
      features: [
        "دسترسی پایه به سیستم",
        "پشتیبانی محدود",
        "7 روز استفاده رایگان"
      ],
      isActive: true,
      isDefault: true,
      createdAt: new Date(),
    };
    this.subscriptions.set(defaultSubscription.id, defaultSubscription);
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
      image: insertSubscription.image || null,
      duration: insertSubscription.duration || 'monthly',
      priceBeforeDiscount: insertSubscription.priceBeforeDiscount || null,
      priceAfterDiscount: insertSubscription.priceAfterDiscount || null,
      features: insertSubscription.features || null,
      isActive: insertSubscription.isActive !== undefined ? insertSubscription.isActive : true,
      isDefault: false,
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
  async getProduct(id: string, currentUserId: string, userRole: string): Promise<Product | undefined> {
    const product = this.products.get(id);
    if (!product) return undefined;
    
    // Apply role-based access control
    if (userRole === 'admin' || userRole === 'user_level_1') {
      // Admin and level 1 can only access their own products
      return product.userId === currentUserId ? product : undefined;
    } else if (userRole === 'user_level_2') {
      // Level 2 can only access products from level 1 users
      const productOwner = this.users.get(product.userId);
      return (productOwner && productOwner.role === 'user_level_1') ? product : undefined;
    }
    return undefined;
  }

  async getProductsByUser(userId: string): Promise<Product[]> {
    return Array.from(this.products.values()).filter(product => product.userId === userId);
  }

  async getAllProducts(currentUserId: string, userRole: string): Promise<Product[]> {
    if (!currentUserId || !userRole) {
      throw new Error('User context required for getAllProducts');
    }

    const allProducts = Array.from(this.products.values());
    
    // Filter based on user role
    if (userRole === 'admin') {
      // Admin sees only their own products
      return allProducts.filter(product => product.userId === currentUserId);
    } else if (userRole === 'user_level_1') {
      // Level 1 sees only their own products  
      return allProducts.filter(product => product.userId === currentUserId);
    } else if (userRole === 'user_level_2') {
      // Level 2 sees products from level 1 users AND their own products
      const level1Users = Array.from(this.users.values()).filter(user => user.role === 'user_level_1');
      const level1UserIds = level1Users.map(user => user.id);
      return allProducts.filter(product => 
        product.userId === currentUserId || level1UserIds.includes(product.userId)
      );
    }
    
    return [];
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const id = randomUUID();
    const product: Product = {
      ...insertProduct,
      id,
      description: insertProduct.description || null,
      image: insertProduct.image || null,
      categoryId: insertProduct.categoryId || null,
      quantity: insertProduct.quantity || 0,
      priceAfterDiscount: insertProduct.priceAfterDiscount || null,
      isActive: insertProduct.isActive !== undefined ? insertProduct.isActive : true,
      createdAt: new Date(),
    };
    this.products.set(id, product);
    return product;
  }

  async updateProduct(id: string, updates: Partial<Product>, currentUserId: string, userRole: string): Promise<Product | undefined> {
    // user_level_2 cannot modify products, only view them
    if (userRole === 'user_level_2') {
      return undefined;
    }
    
    const product = await this.getProduct(id, currentUserId, userRole);
    if (!product) return undefined;
    
    const updatedProduct = { ...product, ...updates };
    this.products.set(id, updatedProduct);
    return updatedProduct;
  }

  async deleteProduct(id: string, currentUserId: string, userRole: string): Promise<boolean> {
    // user_level_2 cannot modify products, only view them
    if (userRole === 'user_level_2') {
      return false;
    }
    
    const product = await this.getProduct(id, currentUserId, userRole);
    if (!product) return false;
    
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
      isEnabled: settings.isEnabled || false,
      notifications: settings.notifications || null,
      updatedAt: new Date(),
    };
    this.whatsappSettings = whatsappSettings;
    return whatsappSettings;
  }

  // Messages
  async getSentMessagesByUser(userId: string): Promise<SentMessage[]> {
    return Array.from(this.sentMessages.values())
      .filter(message => message.userId === userId)
      .sort((a, b) => (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0));
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

  // AI Token Settings
  async getAiTokenSettings(): Promise<AiTokenSettings | undefined> {
    return this.aiTokenSettings;
  }

  async updateAiTokenSettings(settings: InsertAiTokenSettings): Promise<AiTokenSettings> {
    const aiTokenSettings: AiTokenSettings = {
      ...settings,
      id: this.aiTokenSettings?.id || randomUUID(),
      provider: settings.provider || "openai",
      isActive: settings.isActive !== undefined ? settings.isActive : true,
      createdAt: this.aiTokenSettings?.createdAt || new Date(),
      updatedAt: new Date(),
    };
    this.aiTokenSettings = aiTokenSettings;
    return aiTokenSettings;
  }

  // User Subscriptions
  async getUserSubscription(userId: string): Promise<UserSubscription & { subscriptionName?: string | null; subscriptionDescription?: string | null } | undefined> {
    const userSub = Array.from(this.userSubscriptions.values()).find(sub => sub.userId === userId && sub.status === 'active');
    if (!userSub) return undefined;
    
    const subscription = this.subscriptions.get(userSub.subscriptionId);
    return {
      ...userSub,
      subscriptionName: subscription?.name,
      subscriptionDescription: subscription?.description,
    };
  }

  async getUserSubscriptionsByUserId(userId: string): Promise<UserSubscription[]> {
    return Array.from(this.userSubscriptions.values()).filter(sub => sub.userId === userId);
  }

  async getUserSubscriptionById(id: string): Promise<UserSubscription | undefined> {
    return this.userSubscriptions.get(id);
  }

  async getAllUserSubscriptions(): Promise<UserSubscription[]> {
    return Array.from(this.userSubscriptions.values());
  }

  async createUserSubscription(insertUserSubscription: InsertUserSubscription): Promise<UserSubscription> {
    const id = randomUUID();
    const userSubscription: UserSubscription = {
      ...insertUserSubscription,
      id,
      status: insertUserSubscription.status || 'active',
      startDate: insertUserSubscription.startDate || new Date(),
      remainingDays: insertUserSubscription.remainingDays || 0,
      isTrialPeriod: insertUserSubscription.isTrialPeriod || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.userSubscriptions.set(id, userSubscription);
    return userSubscription;
  }

  async updateUserSubscription(id: string, updates: Partial<UserSubscription>): Promise<UserSubscription | undefined> {
    const userSubscription = this.userSubscriptions.get(id);
    if (!userSubscription) return undefined;
    
    const updatedUserSubscription = { 
      ...userSubscription, 
      ...updates,
      updatedAt: new Date()
    };
    this.userSubscriptions.set(id, updatedUserSubscription);
    return updatedUserSubscription;
  }

  async deleteUserSubscription(id: string): Promise<boolean> {
    return this.userSubscriptions.delete(id);
  }

  async updateRemainingDays(id: string, remainingDays: number): Promise<UserSubscription | undefined> {
    const userSubscription = this.userSubscriptions.get(id);
    if (!userSubscription) return undefined;
    
    const status = remainingDays <= 0 ? 'expired' : 'active';
    const updatedUserSubscription = { 
      ...userSubscription, 
      remainingDays,
      status,
      updatedAt: new Date()
    };
    this.userSubscriptions.set(id, updatedUserSubscription);
    return updatedUserSubscription;
  }

  async getActiveUserSubscriptions(): Promise<UserSubscription[]> {
    return Array.from(this.userSubscriptions.values()).filter(sub => sub.status === 'active');
  }

  async getExpiredUserSubscriptions(): Promise<UserSubscription[]> {
    return Array.from(this.userSubscriptions.values()).filter(sub => sub.status === 'expired');
  }

  // Categories
  async getCategory(id: string, currentUserId: string, userRole: string): Promise<Category | undefined> {
    const category = this.categories.get(id);
    if (!category) return undefined;
    
    // Check ownership based on user role
    if (userRole === 'admin' || userRole === 'user_level_1') {
      // Admin and level 1 can only access their own categories
      if (category.createdBy !== currentUserId) {
        return undefined;
      }
    } else if (userRole === 'user_level_2') {
      // Level 2 can only access categories from level 1 users
      const level1Users = Array.from(this.users.values()).filter(user => user.role === 'user_level_1');
      const level1UserIds = level1Users.map(user => user.id);
      if (!level1UserIds.includes(category.createdBy)) {
        return undefined;
      }
    } else {
      return undefined;
    }
    
    return category;
  }

  async getAllCategories(currentUserId: string, userRole: string): Promise<Category[]> {
    if (!currentUserId || !userRole) {
      throw new Error('User context required for getAllCategories');
    }

    const allCategories = Array.from(this.categories.values());
    let filteredCategories: Category[] = [];
    
    // Filter based on user role
    if (userRole === 'admin') {
      // Admin sees only their own categories
      filteredCategories = allCategories.filter(category => category.createdBy === currentUserId);
    } else if (userRole === 'user_level_1') {
      // Level 1 sees only their own categories  
      filteredCategories = allCategories.filter(category => category.createdBy === currentUserId);
    } else if (userRole === 'user_level_2') {
      // Level 2 sees only categories from level 1 users
      const level1Users = Array.from(this.users.values()).filter(user => user.role === 'user_level_1');
      const level1UserIds = level1Users.map(user => user.id);
      filteredCategories = allCategories.filter(category => level1UserIds.includes(category.createdBy));
    }
    
    return filteredCategories.sort((a, b) => a.order - b.order);
  }

  async getCategoriesByParent(parentId: string | null, currentUserId: string, userRole: string): Promise<Category[]> {
    const allCategories = await this.getAllCategories(currentUserId, userRole);
    return allCategories.filter(category => category.parentId === parentId)
      .sort((a, b) => a.order - b.order);
  }

  async getCategoryTree(currentUserId: string, userRole: string): Promise<Category[]> {
    const allCategories = await this.getAllCategories(currentUserId, userRole);
    
    // Build tree structure (this is a simplified version, full tree building would be more complex)
    return allCategories.filter(cat => cat.parentId === null);
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const id = randomUUID();
    const category: Category = {
      ...insertCategory,
      id,
      description: insertCategory.description || null,
      parentId: insertCategory.parentId || null,
      order: insertCategory.order || 0,
      isActive: insertCategory.isActive !== undefined ? insertCategory.isActive : true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.categories.set(id, category);
    return category;
  }

  async updateCategory(id: string, updates: Partial<Category>, currentUserId: string, userRole: string): Promise<Category | undefined> {
    const category = await this.getCategory(id, currentUserId, userRole);
    if (!category) return undefined;
    
    const updatedCategory = { 
      ...category, 
      ...updates,
      updatedAt: new Date()
    };
    this.categories.set(id, updatedCategory);
    return updatedCategory;
  }

  async deleteCategory(id: string, currentUserId: string, userRole: string): Promise<boolean> {
    const category = await this.getCategory(id, currentUserId, userRole);
    if (!category) return false;
    
    return this.categories.delete(id);
  }

  async reorderCategories(updates: { id: string; order: number; parentId?: string | null }[]): Promise<boolean> {
    try {
      for (const update of updates) {
        const category = this.categories.get(update.id);
        if (category) {
          const updatedCategory = {
            ...category,
            order: update.order,
            parentId: update.parentId !== undefined ? update.parentId : category.parentId,
            updatedAt: new Date()
          };
          this.categories.set(update.id, updatedCategory);
        }
      }
      return true;
    } catch (error) {
      return false;
    }
  }
}

import { DbStorage } from "./db-storage";

export const storage = process.env.NODE_ENV === "test" ? new MemStorage() : new DbStorage();
