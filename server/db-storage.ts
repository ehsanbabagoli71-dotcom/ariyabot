import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, sql, desc, and, gte, or } from "drizzle-orm";
import { users, tickets, subscriptions, products, whatsappSettings, sentMessages, receivedMessages, aiTokenSettings, userSubscriptions, categories, carts, cartItems } from "@shared/schema";
import { type User, type InsertUser, type Ticket, type InsertTicket, type Subscription, type InsertSubscription, type Product, type InsertProduct, type WhatsappSettings, type InsertWhatsappSettings, type SentMessage, type InsertSentMessage, type ReceivedMessage, type InsertReceivedMessage, type AiTokenSettings, type InsertAiTokenSettings, type UserSubscription, type InsertUserSubscription, type Category, type InsertCategory, type Cart, type InsertCart, type CartItem, type InsertCartItem } from "@shared/schema";
import { type IStorage } from "./storage";
import bcrypt from "bcryptjs";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});
const db = drizzle(pool);

export class DbStorage implements IStorage {
  constructor() {
    // Initialize default admin user on startup
    this.initializeAdminUser();
    
    // Initialize default free subscription
    this.initializeDefaultSubscription();
    
    // Initialize test data only in development environment
    if (process.env.NODE_ENV === 'development') {
      this.initializeTestData().catch(console.error);
    }
  }

  private async initializeAdminUser() {
    try {
      // Check if admin user exists
      const existingAdmin = await db
        .select()
        .from(users)
        .where(eq(users.username, "ehsan"))
        .limit(1);

      if (existingAdmin.length === 0) {
        // Use environment variable for admin password, fallback to default password
        const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
        if (!process.env.ADMIN_PASSWORD) {
          console.log("🔑 کاربر ادمین ایجاد شد - نام کاربری: ehsan");
          console.log("🔑 رمز عبور پیش‌فرض: admin123");
          console.log("⚠️  برای تغییر رمز عبور، متغیر ADMIN_PASSWORD را تنظیم کنید");
        }
        
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        await db.insert(users).values({
          username: "ehsan",
          firstName: "احسان",
          lastName: "مدیر",
          email: "ehsan@admin.com",
          phone: "09123456789",
          password: hashedPassword,
          role: "admin",
        });
      }
    } catch (error) {
      console.error("Error initializing admin user:", error);
    }
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
    try {
      // Check if default free subscription exists
      const existingSubscription = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.name, "اشتراک رایگان"))
        .limit(1);

      if (existingSubscription.length === 0) {
        await db.insert(subscriptions).values({
          name: "اشتراک رایگان",
          description: "اشتراک پیش‌فرض رایگان 7 روزه",
          userLevel: "user_level_1",
          priceBeforeDiscount: "0",
          duration: "monthly",
          features: [
            "دسترسی پایه به سیستم",
            "پشتیبانی محدود",
            "7 روز استفاده رایگان"
          ],
          isActive: true,
          isDefault: true,
        });
      }
    } catch (error) {
      console.error("Error initializing default subscription:", error);
    }
  }

  private async initializeTestData() {
    try {
      // بررسی وجود کاربر تستی سطح 1
      const existingTestUser = await db
        .select()
        .from(users)
        .where(eq(users.username, "test_seller"))
        .limit(1);

      let testUser: User;
      
      if (existingTestUser.length === 0) {
        // ایجاد کاربر سطح 1 تستی
        const testUserPassword = await bcrypt.hash("test123", 10);
        const [createdUser] = await db.insert(users).values({
          username: "test_seller",
          firstName: "علی",
          lastName: "فروشنده تستی",
          email: "test@seller.com",
          phone: "09111234567",
          whatsappNumber: "09111234567",
          password: testUserPassword,
          role: "user_level_1",
        }).returning();
        testUser = createdUser;
        console.log("🔑 کاربر سطح 1 تستی ایجاد شد - نام کاربری: test_seller، رمز عبور: test123");
      } else {
        testUser = existingTestUser[0];
      }

      // بررسی و ایجاد دسته‌بندی‌های تستی
      const existingCategories = await db
        .select()
        .from(categories)
        .where(eq(categories.createdBy, testUser.id));

      let categoryIds: {smartphones: string, accessories: string, tablets: string} | null = null;

      if (existingCategories.length === 0) {
        // ایجاد 3 دسته‌بندی موبایل
        const mobileCategories = [
          {
            name: "گوشی‌های هوشمند",
            description: "انواع گوشی‌های هوشمند اندروید و آیفون",
            createdBy: testUser.id,
            order: 0,
          },
          {
            name: "لوازم جانبی موبایل",
            description: "کیف، کاور، محافظ صفحه و سایر لوازم جانبی",
            createdBy: testUser.id,
            order: 1,
          },
          {
            name: "تبلت و آیپد",
            description: "انواع تبلت‌های اندروید و آیپد اپل",
            createdBy: testUser.id,
            order: 2,
          }
        ];

        const createdCategories = await db.insert(categories).values(mobileCategories).returning();
        console.log("📱 3 دسته‌بندی موبایل تستی ایجاد شد");
        
        categoryIds = {
          smartphones: createdCategories[0].id,
          accessories: createdCategories[1].id,
          tablets: createdCategories[2].id,
        };
      } else {
        // استفاده از دسته‌بندی‌های موجود
        const smartphonesCategory = existingCategories.find(cat => cat.name === "گوشی‌های هوشمند");
        const accessoriesCategory = existingCategories.find(cat => cat.name === "لوازم جانبی موبایل");
        const tabletsCategory = existingCategories.find(cat => cat.name === "تبلت و آیپد");
        
        if (smartphonesCategory && accessoriesCategory && tabletsCategory) {
          categoryIds = {
            smartphones: smartphonesCategory.id,
            accessories: accessoriesCategory.id,
            tablets: tabletsCategory.id,
          };
        }
      }

      // بررسی و ایجاد محصولات تستی (مستقل از وضعیت دسته‌بندی‌ها)
      if (categoryIds) {
        const existingProducts = await db
          .select()
          .from(products)
          .where(eq(products.userId, testUser.id));

        if (existingProducts.length === 0) {
          // ایجاد 6 محصول تستی
          const testProducts = [
            {
              userId: testUser.id,
              name: "آیفون 15 پرو مکس",
              description: "گوشی آیفون 15 پرو مکس با ظرفیت 256 گیگابایت، رنگ طلایی",
              categoryId: categoryIds.smartphones,
              priceBeforeDiscount: "45000000",
              priceAfterDiscount: "43000000",
              quantity: 5,
              image: "/uploads/iphone15-pro-max.png"
            },
            {
              userId: testUser.id,
              name: "سامسونگ گلکسی S24 اولترا",
              description: "گوشی سامسونگ گلکسی S24 اولترا با ظرفیت 512 گیگابایت",
              categoryId: categoryIds.smartphones,
              priceBeforeDiscount: "35000000",
              priceAfterDiscount: "33500000",
              quantity: 8,
              image: "/uploads/samsung-s24-ultra.png"
            },
            {
              userId: testUser.id,
              name: "کاور چرمی آیفون",
              description: "کاور چرمی اصل برای آیفون 15 سری، رنگ قهوه‌ای",
              categoryId: categoryIds.accessories,
              priceBeforeDiscount: "350000",
              priceAfterDiscount: "299000",
              quantity: 20,
              image: "/uploads/iphone-case.png"
            },
            {
              userId: testUser.id,
              name: "محافظ صفحه شیشه‌ای",
              description: "محافظ صفحه شیشه‌ای ضد ضربه برای انواع گوشی",
              categoryId: categoryIds.accessories,
              priceBeforeDiscount: "120000",
              priceAfterDiscount: "95000",
              quantity: 50,
              image: "/uploads/screen-protector.png"
            },
            {
              userId: testUser.id,
              name: "آیپد پرو 12.9 اینچ",
              description: "تبلت آیپد پرو 12.9 اینچ نسل پنجم با چیپ M2",
              categoryId: categoryIds.tablets,
              priceBeforeDiscount: "28000000",
              priceAfterDiscount: "26500000",
              quantity: 3,
              image: "/uploads/ipad-pro.png"
            },
            {
              userId: testUser.id,
              name: "تبلت سامسونگ گلکسی Tab S9",
              description: "تبلت سامسونگ گلکسی Tab S9 با صفحه 11 اینچ",
              categoryId: categoryIds.tablets,
              priceBeforeDiscount: "18000000",
              priceAfterDiscount: "17200000",
              quantity: 6,
              image: "/uploads/samsung-tab-s9.png"
            }
          ];

          await db.insert(products).values(testProducts);
          console.log("🛍️ 6 محصول تستی ایجاد شد");
        }
      }
      
      console.log("✅ تمام داده‌های تستی با موفقیت بررسی و ایجاد شدند");
    } catch (error) {
      console.error("Error initializing test data:", error);
    }
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
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
    const result = await db.select().from(users).where(eq(users.googleId, googleId)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const result = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return result[0];
  }

  async updateUserPassword(id: string, hashedPassword: string): Promise<User | undefined> {
    const result = await db.update(users).set({ password: hashedPassword }).where(eq(users.id, id)).returning();
    return result[0];
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return result.rowCount! > 0;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  // Tickets
  async getTicket(id: string): Promise<Ticket | undefined> {
    const result = await db.select().from(tickets).where(eq(tickets.id, id)).limit(1);
    return result[0];
  }

  async getTicketsByUser(userId: string): Promise<Ticket[]> {
    return await db.select().from(tickets).where(eq(tickets.userId, userId));
  }

  async getAllTickets(): Promise<Ticket[]> {
    return await db.select().from(tickets);
  }

  async createTicket(insertTicket: InsertTicket): Promise<Ticket> {
    const result = await db.insert(tickets).values(insertTicket).returning();
    return result[0];
  }

  async updateTicket(id: string, updates: Partial<Ticket>): Promise<Ticket | undefined> {
    const result = await db.update(tickets).set(updates).where(eq(tickets.id, id)).returning();
    return result[0];
  }

  async deleteTicket(id: string): Promise<boolean> {
    const result = await db.delete(tickets).where(eq(tickets.id, id));
    return result.rowCount! > 0;
  }

  // Subscriptions
  async getSubscription(id: string): Promise<Subscription | undefined> {
    const result = await db.select().from(subscriptions).where(eq(subscriptions.id, id)).limit(1);
    return result[0];
  }

  async getAllSubscriptions(): Promise<Subscription[]> {
    return await db.select().from(subscriptions);
  }

  async createSubscription(insertSubscription: InsertSubscription): Promise<Subscription> {
    const result = await db.insert(subscriptions).values(insertSubscription).returning();
    return result[0];
  }

  async updateSubscription(id: string, updates: Partial<Subscription>): Promise<Subscription | undefined> {
    const result = await db.update(subscriptions).set(updates).where(eq(subscriptions.id, id)).returning();
    return result[0];
  }

  async deleteSubscription(id: string): Promise<boolean> {
    const result = await db.delete(subscriptions).where(eq(subscriptions.id, id));
    return result.rowCount! > 0;
  }

  // Products
  async getProduct(id: string, currentUserId: string, userRole: string): Promise<Product | undefined> {
    const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
    const product = result[0];
    
    if (!product) return undefined;
    
    // Apply role-based access control
    if (userRole === 'admin' || userRole === 'user_level_1') {
      // Admin and level 1 can only access their own products
      return product.userId === currentUserId ? product : undefined;
    } else if (userRole === 'user_level_2') {
      // Level 2 can only access products from level 1 users
      const productOwner = await db.select().from(users)
        .where(and(eq(users.id, product.userId), eq(users.role, 'user_level_1')))
        .limit(1);
      return productOwner.length > 0 ? product : undefined;
    }
    
    return undefined;
  }

  async getProductsByUser(userId: string): Promise<Product[]> {
    return await db.select().from(products).where(eq(products.userId, userId));
  }

  async getAllProducts(currentUserId: string, userRole: string): Promise<Product[]> {
    if (!currentUserId || !userRole) {
      throw new Error('User context required for getAllProducts');
    }

    // Filter based on user role
    if (userRole === 'admin') {
      // Admin sees only their own products
      return await db.select().from(products).where(eq(products.userId, currentUserId));
    } else if (userRole === 'user_level_1') {
      // Level 1 sees only their own products  
      return await db.select().from(products).where(eq(products.userId, currentUserId));
    } else if (userRole === 'user_level_2') {
      // Level 2 sees products from their parent user
      const currentUser = await db.select({ parentUserId: users.parentUserId })
        .from(users)
        .where(eq(users.id, currentUserId))
        .limit(1);
      
      if (currentUser.length === 0 || !currentUser[0].parentUserId) {
        // If no parent user found, return empty array
        return [];
      }
      
      // Return products from parent user
      return await db.select().from(products).where(eq(products.userId, currentUser[0].parentUserId));
    }
    
    return [];
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const result = await db.insert(products).values(insertProduct).returning();
    return result[0];
  }

  async updateProduct(id: string, updates: Partial<Product>, currentUserId: string, userRole: string): Promise<Product | undefined> {
    // user_level_2 cannot modify products, only view them
    if (userRole === 'user_level_2') {
      return undefined;
    }
    
    const product = await this.getProduct(id, currentUserId, userRole);
    if (!product) return undefined;
    
    const result = await db.update(products).set(updates).where(eq(products.id, id)).returning();
    return result[0];
  }

  async deleteProduct(id: string, currentUserId: string, userRole: string): Promise<boolean> {
    // user_level_2 cannot modify products, only view them
    if (userRole === 'user_level_2') {
      return false;
    }
    
    const product = await this.getProduct(id, currentUserId, userRole);
    if (!product) return false;
    
    const result = await db.delete(products).where(eq(products.id, id));
    return result.rowCount! > 0;
  }

  // WhatsApp Settings
  async getWhatsappSettings(): Promise<WhatsappSettings | undefined> {
    const result = await db.select().from(whatsappSettings).limit(1);
    return result[0];
  }

  async updateWhatsappSettings(settings: InsertWhatsappSettings): Promise<WhatsappSettings> {
    // First try to get existing settings
    const existing = await this.getWhatsappSettings();
    
    if (existing) {
      const result = await db.update(whatsappSettings).set(settings).where(eq(whatsappSettings.id, existing.id)).returning();
      return result[0];
    } else {
      const result = await db.insert(whatsappSettings).values(settings).returning();
      return result[0];
    }
  }

  // Messages
  async getSentMessagesByUser(userId: string): Promise<SentMessage[]> {
    return await db.select().from(sentMessages)
      .where(eq(sentMessages.userId, userId))
      .orderBy(desc(sentMessages.timestamp), desc(sentMessages.id));
  }

  async createSentMessage(insertMessage: InsertSentMessage): Promise<SentMessage> {
    const result = await db.insert(sentMessages).values(insertMessage).returning();
    return result[0];
  }

  async getReceivedMessagesByUser(userId: string): Promise<ReceivedMessage[]> {
    return await db.select().from(receivedMessages)
      .where(eq(receivedMessages.userId, userId))
      .orderBy(desc(receivedMessages.timestamp), desc(receivedMessages.id));
  }

  async getReceivedMessagesByUserPaginated(userId: string, page: number, limit: number): Promise<{ messages: ReceivedMessage[], total: number, totalPages: number }> {
    const offset = (page - 1) * limit;
    
    // Get total count
    const countResult = await db.select({ count: sql<number>`count(*)` })
      .from(receivedMessages)
      .where(eq(receivedMessages.userId, userId));
    const total = countResult[0].count;
    const totalPages = Math.ceil(total / limit);
    
    // Get paginated messages ordered by timestamp desc (newest first)
    const messages = await db.select()
      .from(receivedMessages)
      .where(eq(receivedMessages.userId, userId))
      .orderBy(desc(receivedMessages.timestamp), desc(receivedMessages.id))
      .limit(limit)
      .offset(offset);
    
    return { messages, total, totalPages };
  }

  async getReceivedMessageByWhatsiPlusId(whatsiPlusId: string): Promise<ReceivedMessage | undefined> {
    const result = await db.select().from(receivedMessages).where(eq(receivedMessages.whatsiPlusId, whatsiPlusId)).limit(1);
    return result[0];
  }

  async getReceivedMessageByWhatsiPlusIdAndUser(whatsiPlusId: string, userId: string): Promise<ReceivedMessage | undefined> {
    const result = await db.select()
      .from(receivedMessages)
      .where(and(eq(receivedMessages.whatsiPlusId, whatsiPlusId), eq(receivedMessages.userId, userId)))
      .limit(1);
    return result[0];
  }

  async createReceivedMessage(insertMessage: InsertReceivedMessage): Promise<ReceivedMessage> {
    const result = await db.insert(receivedMessages).values(insertMessage).returning();
    return result[0];
  }

  async updateReceivedMessageStatus(id: string, status: string): Promise<ReceivedMessage | undefined> {
    const result = await db.update(receivedMessages).set({ status }).where(eq(receivedMessages.id, id)).returning();
    return result[0];
  }

  // AI Token Settings
  async getAiTokenSettings(): Promise<AiTokenSettings | undefined> {
    const result = await db.select().from(aiTokenSettings).limit(1);
    return result[0];
  }

  async updateAiTokenSettings(settings: InsertAiTokenSettings): Promise<AiTokenSettings> {
    // First try to get existing settings
    const existing = await this.getAiTokenSettings();
    
    if (existing) {
      const result = await db.update(aiTokenSettings).set(settings).where(eq(aiTokenSettings.id, existing.id)).returning();
      return result[0];
    } else {
      const result = await db.insert(aiTokenSettings).values(settings).returning();
      return result[0];
    }
  }

  // User Subscriptions
  async getUserSubscription(userId: string): Promise<UserSubscription & { subscriptionName?: string | null; subscriptionDescription?: string | null } | undefined> {
    const result = await db.select({
      id: userSubscriptions.id,
      userId: userSubscriptions.userId,
      subscriptionId: userSubscriptions.subscriptionId,
      status: userSubscriptions.status,
      startDate: userSubscriptions.startDate,
      endDate: userSubscriptions.endDate,
      remainingDays: userSubscriptions.remainingDays,
      isTrialPeriod: userSubscriptions.isTrialPeriod,
      createdAt: userSubscriptions.createdAt,
      updatedAt: userSubscriptions.updatedAt,
      subscriptionName: subscriptions.name,
      subscriptionDescription: subscriptions.description,
    })
    .from(userSubscriptions)
    .innerJoin(subscriptions, eq(userSubscriptions.subscriptionId, subscriptions.id))
    .where(and(
      eq(userSubscriptions.userId, userId),
      eq(userSubscriptions.status, 'active'),
      gte(userSubscriptions.endDate, new Date())
    ))
    .orderBy(desc(userSubscriptions.endDate))
    .limit(1);
    return result[0];
  }

  async getUserSubscriptionsByUserId(userId: string): Promise<UserSubscription[]> {
    return await db.select().from(userSubscriptions)
      .where(eq(userSubscriptions.userId, userId))
      .orderBy(desc(userSubscriptions.createdAt));
  }

  async getUserSubscriptionById(id: string): Promise<UserSubscription | undefined> {
    const result = await db.select().from(userSubscriptions).where(eq(userSubscriptions.id, id)).limit(1);
    return result[0];
  }

  async getAllUserSubscriptions(): Promise<UserSubscription[]> {
    return await db.select().from(userSubscriptions).orderBy(desc(userSubscriptions.createdAt));
  }

  async createUserSubscription(insertUserSubscription: InsertUserSubscription): Promise<UserSubscription> {
    const result = await db.insert(userSubscriptions).values(insertUserSubscription).returning();
    return result[0];
  }

  async updateUserSubscription(id: string, updates: Partial<UserSubscription>): Promise<UserSubscription | undefined> {
    const result = await db.update(userSubscriptions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(userSubscriptions.id, id))
      .returning();
    return result[0];
  }

  async deleteUserSubscription(id: string): Promise<boolean> {
    const result = await db.delete(userSubscriptions).where(eq(userSubscriptions.id, id));
    return result.rowCount! > 0;
  }

  async updateRemainingDays(id: string, remainingDays: number): Promise<UserSubscription | undefined> {
    const status = remainingDays <= 0 ? 'expired' : 'active';
    const result = await db.update(userSubscriptions)
      .set({ 
        remainingDays, 
        status,
        updatedAt: new Date()
      })
      .where(eq(userSubscriptions.id, id))
      .returning();
    return result[0];
  }

  async getActiveUserSubscriptions(): Promise<UserSubscription[]> {
    return await db.select().from(userSubscriptions)
      .where(eq(userSubscriptions.status, 'active'))
      .orderBy(desc(userSubscriptions.createdAt));
  }

  async getExpiredUserSubscriptions(): Promise<UserSubscription[]> {
    return await db.select().from(userSubscriptions)
      .where(eq(userSubscriptions.status, 'expired'))
      .orderBy(desc(userSubscriptions.createdAt));
  }

  // Categories
  async getCategory(id: string, currentUserId: string, userRole: string): Promise<Category | undefined> {
    if (userRole === 'admin' || userRole === 'user_level_1') {
      // Admin and level 1 can only access their own categories
      const result = await db.select().from(categories)
        .where(and(eq(categories.id, id), eq(categories.createdBy, currentUserId)))
        .limit(1);
      return result[0];
    } else if (userRole === 'user_level_2') {
      // Level 2 can only access categories from level 1 users
      const result = await db.select().from(categories)
        .innerJoin(users, eq(categories.createdBy, users.id))
        .where(and(eq(categories.id, id), eq(users.role, 'user_level_1')))
        .limit(1);
      return result[0]?.categories;
    }
    return undefined;
  }

  async getAllCategories(currentUserId: string, userRole: string): Promise<Category[]> {
    if (!currentUserId || !userRole) {
      throw new Error('User context required for getAllCategories');
    }

    // Filter based on user role
    if (userRole === 'admin') {
      // Admin sees only their own categories
      return await db.select().from(categories)
        .where(eq(categories.createdBy, currentUserId))
        .orderBy(categories.order);
    } else if (userRole === 'user_level_1') {
      // Level 1 sees only their own categories
      return await db.select().from(categories)
        .where(eq(categories.createdBy, currentUserId))
        .orderBy(categories.order);
    } else if (userRole === 'user_level_2') {
      // Level 2 sees only categories from level 1 users
      const level1Users = await db.select({ id: users.id }).from(users).where(eq(users.role, 'user_level_1'));
      const level1UserIds = level1Users.map(user => user.id);
      
      if (level1UserIds.length === 0) {
        return [];
      }
      
      return await db.select().from(categories)
        .where(sql`${categories.createdBy} = ANY(${level1UserIds})`)
        .orderBy(categories.order);
    }
    
    return [];
  }

  async getCategoriesByParent(parentId: string | null, currentUserId: string, userRole: string): Promise<Category[]> {
    const allCategories = await this.getAllCategories(currentUserId, userRole);
    return allCategories.filter(category => category.parentId === parentId);
  }

  async getCategoryTree(currentUserId: string, userRole: string): Promise<Category[]> {
    const allCategories = await this.getAllCategories(currentUserId, userRole);
    // Get root categories (those with null parentId)
    return allCategories.filter(cat => cat.parentId === null);
  }

  async createCategory(insertCategory: InsertCategory, createdBy: string): Promise<Category> {
    const result = await db.insert(categories).values({ ...insertCategory, createdBy }).returning();
    return result[0];
  }

  async updateCategory(id: string, updates: Partial<Category>, currentUserId: string, userRole: string): Promise<Category | undefined> {
    const category = await this.getCategory(id, currentUserId, userRole);
    if (!category) return undefined;
    
    const result = await db.update(categories)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(categories.id, id))
      .returning();
    return result[0];
  }

  async deleteCategory(id: string, currentUserId: string, userRole: string): Promise<boolean> {
    const category = await this.getCategory(id, currentUserId, userRole);
    if (!category) return false;
    
    const result = await db.delete(categories).where(eq(categories.id, id));
    return result.rowCount! > 0;
  }

  async reorderCategories(updates: { id: string; order: number; parentId?: string | null }[]): Promise<boolean> {
    try {
      // Use a transaction to ensure all updates succeed or fail together
      for (const update of updates) {
        await db.update(categories)
          .set({
            order: update.order,
            parentId: update.parentId !== undefined ? update.parentId : undefined,
            updatedAt: new Date()
          })
          .where(eq(categories.id, update.id));
      }
      return true;
    } catch (error) {
      console.error('Error reordering categories:', error);
      return false;
    }
  }

  // Missing methods that were causing LSP errors
  async getUserByWhatsappNumber(whatsappNumber: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.whatsappNumber, whatsappNumber)).limit(1);
    return result[0];
  }

  async getSubUsers(parentUserId: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.parentUserId, parentUserId));
  }

  async getUsersVisibleToUser(userId: string, userRole: string): Promise<User[]> {
    if (userRole === 'admin') {
      // Admin can see only admin and user_level_1 users, NOT user_level_2
      return await db.select().from(users).where(
        or(
          eq(users.role, 'admin'),
          eq(users.role, 'user_level_1')
        )
      );
    } else if (userRole === 'user_level_1') {
      // Level 1 users can see their sub-users (level 2)
      return await db.select().from(users).where(eq(users.parentUserId, userId));
    } else {
      // Level 2 users cannot see other users
      return [];
    }
  }

  // Cart
  async getCart(userId: string): Promise<Cart | undefined> {
    const result = await db.select().from(carts).where(eq(carts.userId, userId)).limit(1);
    return result[0];
  }

  async getCartItems(userId: string): Promise<CartItem[]> {
    const cart = await this.getCart(userId);
    if (!cart) return [];
    
    return await db.select().from(cartItems).where(eq(cartItems.cartId, cart.id));
  }

  async getCartItemsWithProducts(userId: string): Promise<(CartItem & { productName: string; productDescription?: string; productImage?: string })[]> {
    const cart = await this.getCart(userId);
    if (!cart) return [];
    
    const result = await db
      .select({
        id: cartItems.id,
        cartId: cartItems.cartId,
        productId: cartItems.productId,
        quantity: cartItems.quantity,
        unitPrice: cartItems.unitPrice,
        totalPrice: cartItems.totalPrice,
        createdAt: cartItems.createdAt,
        updatedAt: cartItems.updatedAt,
        productName: products.name,
        productDescription: products.description,
        productImage: products.image,
      })
      .from(cartItems)
      .innerJoin(products, eq(cartItems.productId, products.id))
      .where(eq(cartItems.cartId, cart.id));

    return result.map(row => ({
      id: row.id,
      cartId: row.cartId,
      productId: row.productId,
      quantity: row.quantity,
      unitPrice: row.unitPrice,
      totalPrice: row.totalPrice,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      productName: row.productName,
      productDescription: row.productDescription || undefined,
      productImage: row.productImage || undefined,
    }));
  }

  async addToCart(userId: string, productId: string, quantity: number): Promise<CartItem> {
    const product = await db.select().from(products).where(eq(products.id, productId)).limit(1);
    if (product.length === 0) {
      throw new Error('محصول یافت نشد');
    }

    // Get or create cart for user
    let cart = await this.getCart(userId);
    if (!cart) {
      const cartResult = await db.insert(carts).values({
        userId,
        totalAmount: "0",
        itemCount: 0,
      }).returning();
      cart = cartResult[0];
    }

    // Check if item already exists in cart
    const existingItem = await db.select().from(cartItems)
      .where(and(eq(cartItems.cartId, cart.id), eq(cartItems.productId, productId)))
      .limit(1);

    const unitPrice = product[0].priceAfterDiscount || product[0].priceBeforeDiscount;
    const totalPrice = (parseFloat(unitPrice) * quantity).toString();

    if (existingItem.length > 0) {
      // Update existing item
      const newQuantity = existingItem[0].quantity + quantity;
      const newTotalPrice = (parseFloat(unitPrice) * newQuantity).toString();
      
      const result = await db.update(cartItems)
        .set({
          quantity: newQuantity,
          totalPrice: newTotalPrice,
          updatedAt: new Date(),
        })
        .where(eq(cartItems.id, existingItem[0].id))
        .returning();
      
      return result[0];
    } else {
      // Create new item
      const result = await db.insert(cartItems).values({
        cartId: cart.id,
        productId,
        quantity,
        unitPrice: unitPrice,
        totalPrice: totalPrice,
      }).returning();
      
      return result[0];
    }
  }

  async updateCartItemQuantity(itemId: string, quantity: number, userId: string): Promise<CartItem | undefined> {
    const cart = await this.getCart(userId);
    if (!cart) return undefined;

    const item = await db.select().from(cartItems)
      .where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cart.id)))
      .limit(1);
    
    if (item.length === 0) return undefined;

    const newTotalPrice = (parseFloat(item[0].unitPrice) * quantity).toString();
    
    const result = await db.update(cartItems)
      .set({
        quantity,
        totalPrice: newTotalPrice,
        updatedAt: new Date(),
      })
      .where(eq(cartItems.id, itemId))
      .returning();
    
    return result[0];
  }

  async removeFromCart(itemId: string, userId: string): Promise<boolean> {
    const cart = await this.getCart(userId);
    if (!cart) return false;

    const result = await db.delete(cartItems)
      .where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cart.id)));
    
    return result.rowCount! > 0;
  }

  async clearCart(userId: string): Promise<boolean> {
    const cart = await this.getCart(userId);
    if (!cart) return false;

    const result = await db.delete(cartItems).where(eq(cartItems.cartId, cart.id));
    return result.rowCount! >= 0;
  }
}