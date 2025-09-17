import { storage } from "./storage";
import { geminiService } from "./gemini-service";
import { whatsAppSender } from "./whatsapp-sender";

interface WhatsiPlusMessage {
  id: string;
  type: string;
  from: string;
  to: string;
  date: string;
  message: string;
}

interface WhatsiPlusResponse {
  count: number;
  pageCount: number;
  page: string;
  data: WhatsiPlusMessage[];
}

class WhatsAppMessageService {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private isFetching = false;
  private lastFetchTime: Date | null = null;

  async start() {
    if (this.isRunning) {
      console.log("🔄 سرویس پیام‌های واتس‌اپ در حال اجرا است");
      return;
    }

    console.log("🚀 شروع سرویس پیام‌های واتس‌اپ...");
    this.isRunning = true;
    
    // اجرای فوری برای اولین بار
    await this.fetchMessages();
    
    // تنظیم interval برای اجرای هر 5 ثانیه
    this.intervalId = setInterval(async () => {
      await this.fetchMessages();
    }, 5000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log("🛑 سرویس پیام‌های واتس‌اپ متوقف شد");
  }

  async fetchMessages() {
    // جلوگیری از race condition - اگر در حال fetch کردن هستیم، نادیده بگیر
    if (this.isFetching) {
      return;
    }

    this.isFetching = true;
    
    try {
      console.log(`🔄 چک کردن پیام‌های جدید...`);

      // دریافت همه کاربرانی که توکن واتس‌اپ شخصی دارند (کاربران سطح ۱ با توکن)
      const allUsers = await storage.getAllUsers();
      const usersWithTokens = allUsers.filter(user => 
        user.role === 'user_level_1' && 
        user.whatsappToken && 
        user.whatsappToken.trim() !== ''
      );

      // اگر هیچ کاربری توکن ندارد، از تنظیمات عمومی (برای ادمین) استفاده کن
      if (usersWithTokens.length === 0) {
        await this.fetchMessagesForGlobalToken();
        return;
      }

      // برای هر کاربر با توکن شخصی، پیام‌ها را جداگانه دریافت کن
      for (const user of usersWithTokens) {
        await this.fetchMessagesForUser(user);
      }

    } catch (error: any) {
      console.error("❌ خطا در دریافت پیام‌های واتس‌اپ:", error.message || error);
    } finally {
      this.isFetching = false;
    }
  }

  /**
   * دریافت پیام‌ها برای یک کاربر خاص با استفاده از توکن شخصی
   */
  async fetchMessagesForUser(user: any) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(`https://api.whatsiplus.com/receivedMessages/${user.whatsappToken}?page=1`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'WhatsApp-Service/1.0',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error(`❌ خطا در دریافت پیام‌ها برای ${user.username}:`, response.status, response.statusText);
        return;
      }

      const data: WhatsiPlusResponse = await response.json();
      
      if (!data.data || data.data.length === 0) {
        return;
      }

      let newMessagesCount = 0;

      // ذخیره پیام‌های جدید فقط برای این کاربر
      for (const message of data.data) {
        try {
          // بررسی اینکه پیام خالی نباشد
          if (!message.message || message.message.trim() === '') {
            continue;
          }
          
          // بررسی اینکه پیام قبلاً برای این کاربر ذخیره نشده باشد
          const existingMessage = await storage.getReceivedMessageByWhatsiPlusIdAndUser(message.id, user.id);
          
          if (!existingMessage) {
            // بررسی ثبت نام خودکار برای فرستندگان جدید
            const isUserInRegistrationProcess = await this.handleAutoRegistration(message.from, message.message, user.id);

            // ذخیره پیام فقط برای این کاربر
            const savedMessage = await storage.createReceivedMessage({
              userId: user.id,
              whatsiPlusId: message.id,
              sender: message.from,
              message: message.message,
              status: "خوانده نشده",
              originalDate: message.date
            });

            // پاسخ خودکار با Gemini AI فقط اگر کاربر ثبت‌نام کامل شده باشد
            if (geminiService.isActive() && !isUserInRegistrationProcess) {
              await this.handleAutoResponse(message.from, message.message, message.id, user.id);
            }
            
            newMessagesCount++;
          }
        } catch (error) {
          console.error("❌ خطا در ذخیره پیام:", error);
        }
      }

      if (newMessagesCount > 0) {
        console.log(`📨 ${newMessagesCount} پیام جدید برای ${user.username} دریافت و ذخیره شد`);
        this.lastFetchTime = new Date();
      }

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error(`⏱️ Timeout: درخواست پیام‌ها برای ${user.username} بیش از حد انتظار طول کشید`);
      } else {
        console.error(`❌ خطا در دریافت پیام‌های واتس‌اپ برای ${user.username}:`, error.message || error);
      }
    }
  }

  /**
   * دریافت پیام‌ها با استفاده از توکن عمومی (برای ادمین)
   */
  async fetchMessagesForGlobalToken() {
    try {
      // دریافت تنظیمات واتس‌اپ عمومی
      const settings = await storage.getWhatsappSettings();
      
      if (!settings || !settings.token || !settings.isEnabled) {
        console.log("⚠️ تنظیمات واتس‌اپ فعال نیست یا توکن موجود نیست");
        return;
      }

      // دریافت پیام‌ها از WhatsiPlus API
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(`https://api.whatsiplus.com/receivedMessages/${settings.token}?page=1`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'WhatsApp-Service/1.0',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error("❌ خطا در دریافت پیام‌ها از توکن عمومی:", response.status, response.statusText);
        return;
      }

      const data: WhatsiPlusResponse = await response.json();
      
      if (!data.data || data.data.length === 0) {
        return;
      }

      let newMessagesCount = 0;
      
      // پیدا کردن ادمین برای ذخیره پیام‌ها
      const adminUsers = await storage.getAllUsers();
      const admin = adminUsers.find(user => user.role === 'admin');
      
      if (!admin) {
        console.error("❌ هیچ کاربر ادمین یافت نشد");
        return;
      }

      // ذخیره پیام‌های جدید برای ادمین
      for (const message of data.data) {
        try {
          if (!message.message || message.message.trim() === '') {
            continue;
          }
          
          const existingMessage = await storage.getReceivedMessageByWhatsiPlusIdAndUser(message.id, admin.id);
          
          if (!existingMessage) {
            const isUserInRegistrationProcess = await this.handleAutoRegistration(message.from, message.message, admin.id);

            await storage.createReceivedMessage({
              userId: admin.id,
              whatsiPlusId: message.id,
              sender: message.from,
              message: message.message,
              status: "خوانده نشده",
              originalDate: message.date
            });

            // پاسخ خودکار فقط اگر کاربر ثبت‌نام کامل شده باشد
            if (geminiService.isActive() && !isUserInRegistrationProcess) {
              await this.handleAutoResponse(message.from, message.message, message.id, admin.id);
            }
            
            newMessagesCount++;
          }
        } catch (error) {
          console.error("❌ خطا در ذخیره پیام:", error);
        }
      }

      if (newMessagesCount > 0) {
        console.log(`📨 ${newMessagesCount} پیام جدید از توکن عمومی دریافت و ذخیره شد`);
        this.lastFetchTime = new Date();
      }

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error("⏱️ Timeout: درخواست پیام‌ها بیش از حد انتظار طول کشید");
      } else {
        console.error("❌ خطا در دریافت پیام‌های واتس‌اپ:", error.message || error);
      }
    }
  }

  /**
   * تجزیه نام و نام خانوادگی از پیام کاربر
   * @param message پیام کاربر
   * @returns object شامل firstName و lastName یا null
   */
  private parseNameFromMessage(message: string): { firstName: string; lastName: string } | null {
    // پاک کردن کاراکترهای اضافی و تقسیم کلمات
    const words = message.trim().split(/\s+/).filter(word => word.length > 0);
    
    if (words.length >= 2) {
      return {
        firstName: words[0],
        lastName: words.slice(1).join(' ') // اگر نام خانوادگی چند کلمه باشد
      };
    }
    
    return null;
  }

  /**
   * ارسال پیام درخواست نام و نام خانوادگی
   * @param whatsappNumber شماره واتس‌اپ
   * @param fromUser کاربر ارسال‌کننده 
   */
  async sendNameRequestMessage(whatsappNumber: string, fromUser: any) {
    try {
      let whatsappToken: string;
      
      // انتخاب توکن مناسب برای ارسال
      if (fromUser && fromUser.role === 'user_level_1' && fromUser.whatsappToken && fromUser.whatsappToken.trim() !== '') {
        whatsappToken = fromUser.whatsappToken;
      } else {
        const whatsappSettings = await storage.getWhatsappSettings();
        if (!whatsappSettings?.token || !whatsappSettings.isEnabled) {
          console.log("⚠️ توکن واتس‌اپ برای درخواست نام موجود نیست");
          return false;
        }
        whatsappToken = whatsappSettings.token;
      }

      const nameRequestMessage = `سلام! 👋
      
برای ثبت‌نام در سیستم، لطفاً نام و نام خانوادگی خود را بنویسید.

مثال: احمد محمدی

منتظر پاسخ شما هستیم.`;
      
      const sendUrl = `https://api.whatsiplus.com/sendMsg/${whatsappToken}?phonenumber=${whatsappNumber}&message=${encodeURIComponent(nameRequestMessage)}`;
      
      const response = await fetch(sendUrl, { method: 'GET' });
      
      if (response.ok) {
        console.log(`✅ پیام درخواست نام به ${whatsappNumber} ارسال شد`);
        return true;
      } else {
        console.error(`❌ خطا در ارسال پیام درخواست نام به ${whatsappNumber}`);
        return false;
      }
    } catch (error) {
      console.error("❌ خطا در ارسال پیام درخواست نام:", error);
      return false;
    }
  }

  /**
   * مدیریت ثبت نام خودکار کاربران جدید از طریق واتس‌اپ
   * حالا اول نام و نام خانوادگی را می‌پرسد
   * @param whatsappNumber شماره واتس‌اپ فرستنده
   * @param message پیام دریافت شده
   * @param fromUserId شناسه کاربری که پیام را دریافت کرده (کاربر سطح 1)
   * @returns boolean - true اگر کاربر در حال ثبت‌نام است، false اگر ثبت‌نام کامل شده یا وجود دارد
   */
  async handleAutoRegistration(whatsappNumber: string, message: string, fromUserId?: string): Promise<boolean> {
    try {
      // بررسی اینکه کاربری با این شماره واتس‌اپ وجود دارد یا نه
      const existingUser = await storage.getUserByWhatsappNumber(whatsappNumber);
      if (existingUser) {
        // کاربر از قبل ثبت نام کرده است - AI می‌تواند پاسخ دهد
        console.log(`👤 کاربر با شماره ${whatsappNumber} از قبل وجود دارد: ${existingUser.username}`);
        return false;
      } else {
        console.log(`🆕 کاربر با شماره ${whatsappNumber} جدید است - بررسی ثبت نام...`);
      }

      // بررسی اینکه آیا کاربری با این شماره تلفن وجود دارد (ممکن است شماره واتس‌اپ آنها ست نشده باشد)
      const allUsers = await storage.getAllUsers();
      const userWithPhone = allUsers.find(user => user.phone === whatsappNumber);
      
      if (userWithPhone && !userWithPhone.whatsappNumber) {
        // کاربر وجود دارد اما شماره واتس‌اپ ندارد - آپدیت کنید
        await storage.updateUser(userWithPhone.id, { 
          whatsappNumber: whatsappNumber,
          isWhatsappRegistered: true 
        });
        console.log(`✅ شماره واتس‌اپ برای کاربر موجود ${userWithPhone.username} به‌روزرسانی شد`);
        return false; // ثبت‌نام کامل شده - AI می‌تواند پاسخ دهد
      }

      // یافتن کاربر سطح ۱ که این پیام را دریافت کرده
      const fromUser = fromUserId ? await storage.getUser(fromUserId) : 
                      allUsers.find(user => user.role === 'user_level_1');
      
      if (!fromUser) {
        console.error('❌ هیچ کاربر سطح ۱ یافت نشد - کاربر واتس‌اپ ایجاد نمی‌شود');
        return false;
      }

      // تلاش برای استخراج نام و نام خانوادگی از پیام
      const parsedName = this.parseNameFromMessage(message);
      
      if (!parsedName) {
        // پیام شامل نام و نام خانوادگی نیست - درخواست کن
        console.log(`📝 درخواست نام و نام خانوادگی از ${whatsappNumber}`);
        await this.sendNameRequestMessage(whatsappNumber, fromUser);
        return true; // کاربر در حال ثبت‌نام است - AI نباید پاسخ دهد
      }

      // پیام شامل نام و نام خانوادگی است - ثبت نام کن
      console.log(`🔄 ثبت نام خودکار کاربر جدید از واتس‌اپ: ${whatsappNumber}`);
      
      // تولید نام کاربری یکتا بر اساس شماره تلفن
      const username = `whatsapp_${whatsappNumber.replace('+', '').slice(-8)}`;

      // ایجاد کاربر جدید با نام و نام خانوادگی دریافت شده (بدون ایمیل)
      const newUser = await storage.createUser({
        username: username,
        firstName: parsedName.firstName,
        lastName: parsedName.lastName,
        email: null, // ایمیل برای کاربران واتس‌اپ اختیاری است
        phone: whatsappNumber,
        whatsappNumber: whatsappNumber,
        password: null, // کاربران واتس‌اپ بدون رمز عبور
        role: "user_level_2", // کاربران واتس‌اپ به صورت پیش‌فرض سطح ۲
        parentUserId: fromUser.id, // تخصیص به کاربر سطح ۱ که پیام را دریافت کرده
        isWhatsappRegistered: true,
      });

      // ایجاد اشتراک آزمایشی 7 روزه
      try {
        const subscriptions = await storage.getAllSubscriptions();
        const trialSubscription = subscriptions.find(sub => sub.isDefault === true);
        
        if (trialSubscription) {
          await storage.createUserSubscription({
            userId: newUser.id,
            subscriptionId: trialSubscription.id,
            remainingDays: 7,
            startDate: new Date(),
            endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            status: "active",
            isTrialPeriod: true,
          });
        }
      } catch (subscriptionError) {
        console.error("خطا در ایجاد اشتراک برای کاربر واتس‌اپ:", subscriptionError);
      }

      console.log(`✅ کاربر جدید واتس‌اپ ثبت نام شد: ${newUser.username} (${parsedName.firstName} ${parsedName.lastName})`);
      
      // ارسال پیام خوشامدگویی با نام واقعی
      await this.sendWelcomeMessage(whatsappNumber, parsedName.firstName, fromUser);
      
      return false; // ثبت‌نام کامل شده - از الان AI می‌تواند پاسخ دهد
      
    } catch (error) {
      console.error("❌ خطا در ثبت نام خودکار کاربر واتس‌اپ:", error);
      return false; // در صورت خطا، AI می‌تواند پاسخ دهد
    }
  }

  /**
   * ارسال پیام خوشامدگویی به کاربر جدید
   * @param whatsappNumber شماره واتس‌اپ
   * @param firstName نام کاربر
   * @param fromUser کاربر ارسال‌کننده 
   */
  async sendWelcomeMessage(whatsappNumber: string, firstName: string, fromUser?: any) {
    try {
      let whatsappToken: string;
      
      // انتخاب توکن مناسب برای ارسال
      if (fromUser && fromUser.role === 'user_level_1' && fromUser.whatsappToken && fromUser.whatsappToken.trim() !== '') {
        whatsappToken = fromUser.whatsappToken;
      } else {
        const whatsappSettings = await storage.getWhatsappSettings();
        if (!whatsappSettings?.token || !whatsappSettings.isEnabled) {
          return; // اگر واتس‌اپ غیرفعال است، پیام ارسال نکن
        }
        whatsappToken = whatsappSettings.token;
      }

      // استفاده از پیام خوش آمدگویی سفارشی کاربر یا پیام پیش‌فرض
      let welcomeMessage = fromUser?.welcomeMessage;
      
      if (!welcomeMessage || welcomeMessage.trim() === '') {
        // پیام پیش‌فرض اگر کاربر پیام سفارشی نداشته باشد
        welcomeMessage = `سلام ${firstName}! 🌟

به سیستم ما خوش آمدید. شما با موفقیت ثبت نام شدید.

🎁 اشتراک رایگان 7 روزه به حساب شما اضافه شد.

برای کمک و راهنمایی، می‌توانید هر زمان پیام بدهید.`;
      } else {
        // جایگزینی نام در پیام سفارشی
        welcomeMessage = welcomeMessage.replace('{firstName}', firstName);
      }
      
      const sendUrl = `https://api.whatsiplus.com/sendMsg/${whatsappToken}?phonenumber=${whatsappNumber}&message=${encodeURIComponent(welcomeMessage)}`;
      
      const response = await fetch(sendUrl, { method: 'GET' });
      
      if (response.ok) {
        console.log(`✅ پیام خوشامدگویی به ${whatsappNumber} ارسال شد`);
      } else {
        console.error(`❌ خطا در ارسال پیام خوشامدگویی به ${whatsappNumber}`);
      }
    } catch (error) {
      console.error("❌ خطا در ارسال پیام خوشامدگویی:", error);
    }
  }

  /**
   * یک پاسخ هوشمند برای پیام ورودی ایجاد کرده و آن را از طریق واتس‌اپ ارسال می‌کند.
   * هر کاربر سطح 1 با توکن اختصاصی خود پاسخ می‌دهد
   * @param sender شماره موبایل فرستنده پیام
   * @param incomingMessage پیام دریافت شده از کاربر
   * @param whatsiPlusId شناسه پیام از WhatsiPlus API
   * @param userId شناسه کاربر
   */
  async handleAutoResponse(sender: string, incomingMessage: string, whatsiPlusId: string, userId: string) {
    try {
      console.log(`🤖 در حال تولید پاسخ برای پیام از ${sender}...`);
      
      // دریافت کاربری که این پیام را دریافت کرده
      const user = await storage.getUser(userId);
      if (!user) {
        console.log("❌ کاربر یافت نشد");
        return;
      }

      // اگر کاربر سطح 1 است و توکن شخصی دارد، از توکن خودش استفاده کن
      let whatsappToken: string;
      if (user.role === 'user_level_1' && user.whatsappToken && user.whatsappToken.trim() !== '') {
        whatsappToken = user.whatsappToken;
        console.log(`📱 استفاده از توکن اختصاصی کاربر ${user.username}`);
      } else {
        // در غیر این صورت از تنظیمات عمومی استفاده کن
        const whatsappSettings = await storage.getWhatsappSettings();
        if (!whatsappSettings?.token || !whatsappSettings.isEnabled) {
          console.log("⚠️ تنظیمات واتس‌اپ برای ارسال پاسخ خودکار فعال نیست");
          return;
        }
        whatsappToken = whatsappSettings.token;
        console.log("📱 استفاده از توکن عمومی");
      }

      // دریافت تنظیمات هوش مصنوعی
      const aiTokenSettings = await storage.getAiTokenSettings();
      if (!aiTokenSettings?.token || !aiTokenSettings.isActive) {
        console.log("⚠️ توکن هوش مصنوعی تنظیم نشده یا غیرفعال است");
        return;
      }

      // تولید پاسخ با Gemini AI
      const aiResponse = await geminiService.generateResponse(incomingMessage, userId);

      // محدود کردن طول پاسخ برای جلوگیری از خطای 414
      const maxLength = 200; // حداکثر 200 کاراکتر
      const finalResponse = aiResponse.length > maxLength 
        ? aiResponse.substring(0, maxLength) + '...'
        : aiResponse;

      // ارسال پاسخ از طریق WhatsiPlus API با GET method
      const sendUrl = `https://api.whatsiplus.com/sendMsg/${whatsappToken}?phonenumber=${sender}&message=${encodeURIComponent(finalResponse)}`;
      
      console.log(`🔄 در حال ارسال پاسخ خودکار به ${sender} از طرف ${user.username}...`);
      const sendResponse = await fetch(sendUrl, { method: 'GET' });

      if (sendResponse.ok) {
        // ذخیره پیام ارسالی در دیتابیس
        await storage.createSentMessage({
          userId: userId,
          recipient: sender,
          message: aiResponse,
          status: "sent"
        });

        // تغییر وضعیت پیام به خوانده شده فقط برای همان کاربر
        const userMessage = await storage.getReceivedMessageByWhatsiPlusIdAndUser(whatsiPlusId, userId);
        if (userMessage) {
          await storage.updateReceivedMessageStatus(userMessage.id, "خوانده شده");
          console.log(`📖 وضعیت پیام ${whatsiPlusId} برای کاربر ${user.username} به "خوانده شده" تغییر کرد`);
        }
        
        console.log(`✅ پاسخ خودکار به ${sender} از طرف ${user.username} ارسال شد: "${aiResponse.substring(0, 50)}..."`);
      } else {
        const errorText = await sendResponse.text();
        console.error(`❌ خطا در ارسال پاسخ خودکار به ${sender}:`, errorText);
      }
      
    } catch (error) {
      console.error("❌ خطا در فرآیند پاسخ خودکار:", error);
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      lastFetchTime: this.lastFetchTime,
      geminiActive: geminiService.isActive()
    };
  }
}

// ایجاد نمونه سینگلتون
export const whatsAppMessageService = new WhatsAppMessageService();