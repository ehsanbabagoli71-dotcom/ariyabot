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
            await this.handleAutoRegistration(message.from, message.message);

            // ذخیره پیام فقط برای این کاربر
            const savedMessage = await storage.createReceivedMessage({
              userId: user.id,
              whatsiPlusId: message.id,
              sender: message.from,
              message: message.message,
              status: "خوانده نشده",
              originalDate: message.date
            });

            // پاسخ خودکار با Gemini AI (اگر برای این کاربر فعال باشد)
            if (geminiService.isActive()) {
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
            await this.handleAutoRegistration(message.from, message.message);

            await storage.createReceivedMessage({
              userId: admin.id,
              whatsiPlusId: message.id,
              sender: message.from,
              message: message.message,
              status: "خوانده نشده",
              originalDate: message.date
            });

            if (geminiService.isActive()) {
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
   * مدیریت ثبت نام خودکار کاربران جدید از طریق واتس‌اپ
   * @param whatsappNumber شماره واتس‌اپ فرستنده
   * @param message پیام دریافت شده
   */
  async handleAutoRegistration(whatsappNumber: string, message: string) {
    try {
      // بررسی اینکه کاربری با این شماره واتس‌اپ وجود دارد یا نه
      const existingUser = await storage.getUserByWhatsappNumber(whatsappNumber);
      if (existingUser) {
        // کاربر از قبل ثبت نام کرده است
        return;
      }

      // بررسی اینکه آیا کاربری با این شماره تلفن وجود دارد (ممکن است شماره واتس‌اپ آنها ست نشده باشد)
      const phoneUser = await storage.getAllUsers();
      const userWithPhone = phoneUser.find(user => user.phone === whatsappNumber);
      
      if (userWithPhone && !userWithPhone.whatsappNumber) {
        // کاربر وجود دارد اما شماره واتس‌اپ ندارد - آپدیت کنید
        await storage.updateUser(userWithPhone.id, { 
          whatsappNumber: whatsappNumber,
          isWhatsappRegistered: true 
        });
        console.log(`✅ شماره واتس‌اپ برای کاربر موجود ${userWithPhone.username} به‌روزرسانی شد`);
        return;
      }

      // ایجاد کاربر جدید با اطلاعات پایه
      console.log(`🔄 ثبت نام خودکار کاربر جدید از واتس‌اپ: ${whatsappNumber}`);
      
      // تولید نام کاربری یکتا بر اساس شماره تلفن
      const username = `whatsapp_${whatsappNumber.replace('+', '').substring(-8)}`;
      
      // تولید ایمیل موقت
      const tempEmail = `${username}@whatsapp.temp`;
      
      // یافتن اولین کاربر سطح ۱ برای تنظیم به عنوان والد
      const level1Users = await storage.getAllUsers();
      const parentUser = level1Users.find(user => user.role === 'user_level_1');
      
      if (!parentUser) {
        console.error('❌ هیچ کاربر سطح ۱ یافت نشد - کاربر واتس‌اپ ایجاد نمی‌شود');
        return;
      }

      // ایجاد کاربر جدید
      const newUser = await storage.createUser({
        username: username,
        firstName: "کاربر واتس‌اپ",
        lastName: `${whatsappNumber.substring(-4)}`, // چهار رقم آخر شماره
        email: tempEmail,
        phone: whatsappNumber,
        whatsappNumber: whatsappNumber,
        password: null, // کاربران واتس‌اپ بدون رمز عبور
        role: "user_level_2", // کاربران واتس‌اپ به صورت پیش‌فرض سطح ۲
        parentUserId: parentUser.id, // تخصیص به اولین کاربر سطح ۱
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

      console.log(`✅ کاربر جدید واتس‌اپ ثبت نام شد: ${newUser.username} (${whatsappNumber})`);
      
      // ارسال پیام خوشامدگویی
      await this.sendWelcomeMessage(whatsappNumber, newUser.firstName);
      
    } catch (error) {
      console.error("❌ خطا در ثبت نام خودکار کاربر واتس‌اپ:", error);
    }
  }

  /**
   * ارسال پیام خوشامدگویی به کاربر جدید
   * @param whatsappNumber شماره واتس‌اپ
   * @param firstName نام کاربر
   */
  async sendWelcomeMessage(whatsappNumber: string, firstName: string) {
    try {
      const whatsappSettings = await storage.getWhatsappSettings();
      if (!whatsappSettings?.token || !whatsappSettings.isEnabled) {
        return; // اگر واتس‌اپ غیرفعال است، پیام ارسال نکن
      }

      const welcomeMessage = `سلام ${firstName}! 🌟\n\nبه سیستم ما خوش آمدید. شما با موفقیت ثبت نام شدید.\n\nبرای کمک و راهنمایی، می‌توانید هر زمان پیام بدهید.`;
      
      const sendUrl = `https://api.whatsiplus.com/sendMsg/${whatsappSettings.token}?phonenumber=${whatsappNumber}&message=${encodeURIComponent(welcomeMessage)}`;
      
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
   * @param sender شماره موبایل فرستنده پیام
   * @param incomingMessage پیام دریافت شده از کاربر
   * @param whatsiPlusId شناسه پیام از WhatsiPlus API
   * @param userId شناسه کاربر
   */
  async handleAutoResponse(sender: string, incomingMessage: string, whatsiPlusId: string, userId: string) {
    try {
      console.log(`🤖 در حال تولید پاسخ برای پیام از ${sender}...`);
      
      // دریافت تنظیمات هوش مصنوعی
      const aiTokenSettings = await storage.getAiTokenSettings();
      if (!aiTokenSettings?.token || !aiTokenSettings.isActive) {
        console.log("⚠️ توکن هوش مصنوعی تنظیم نشده یا غیرفعال است");
        return;
      }

      // تولید پاسخ با Gemini AI
      const aiResponse = await geminiService.generateResponse(incomingMessage);
      
      // دریافت تنظیمات واتس‌اپ
      const whatsappSettings = await storage.getWhatsappSettings();
      if (!whatsappSettings?.token || !whatsappSettings.isEnabled) {
        console.log("⚠️ تنظیمات واتس‌اپ برای ارسال پاسخ خودکار فعال نیست");
        return;
      }

      // محدود کردن طول پاسخ برای جلوگیری از خطای 414
      const maxLength = 200; // حداکثر 200 کاراکتر
      const finalResponse = aiResponse.length > maxLength 
        ? aiResponse.substring(0, maxLength) + '...'
        : aiResponse;

      // ارسال پاسخ از طریق WhatsiPlus API با GET method
      const sendUrl = `https://api.whatsiplus.com/sendMsg/${whatsappSettings.token}?phonenumber=${sender}&message=${encodeURIComponent(finalResponse)}`;
      
      console.log(`🔄 در حال ارسال پاسخ خودکار به ${sender}...`);
      const sendResponse = await fetch(sendUrl, { method: 'GET' });

      if (sendResponse.ok) {
        // ذخیره پیام ارسالی در دیتابیس
        await storage.createSentMessage({
          userId: userId,
          recipient: sender,
          message: aiResponse,
          status: "sent"
        });

        // تغییر وضعیت پیام به خوانده شده
        const users = await storage.getAllUsers();
        const authorizedUsers = users.filter(user => user.role === 'admin' || user.role === 'user_level_1');
        
        for (const user of authorizedUsers) {
          const userMessages = await storage.getReceivedMessagesByUser(user.id);
          const userMessage = userMessages.find(msg => msg.whatsiPlusId === whatsiPlusId);
          if (userMessage) {
            await storage.updateReceivedMessageStatus(userMessage.id, "خوانده شده");
            console.log(`📖 وضعیت پیام ${whatsiPlusId} برای کاربر ${user.username} به "خوانده شده" تغییر کرد`);
          }
        }
        
        console.log(`✅ پاسخ خودکار به ${sender} ارسال شد: "${aiResponse.substring(0, 50)}..."`);
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