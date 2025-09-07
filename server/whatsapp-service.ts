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
      // دریافت تنظیمات واتس‌اپ
      const settings = await storage.getWhatsappSettings();
      
      if (!settings || !settings.token || !settings.isEnabled) {
        console.log("⚠️ تنظیمات واتس‌اپ فعال نیست یا توکن موجود نیست");
        if (!settings) console.log("   - تنظیمات موجود نیست");
        if (settings && !settings.token) console.log("   - توکن موجود نیست");
        if (settings && !settings.isEnabled) console.log("   - سرویس فعال نیست");
        return;
      }

      console.log(`🔄 چک کردن پیام‌های جدید...`);

      // دریافت پیام‌ها از WhatsiPlus API با timeout بهبود یافته
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
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
        console.error("❌ خطا در دریافت پیام‌ها از WhatsiPlus:", response.status, response.statusText);
        return;
      }

      const data: WhatsiPlusResponse = await response.json();
      
      if (!data.data || data.data.length === 0) {
        // console.log("📭 پیام جدیدی موجود نیست");
        return;
      }

      let newMessagesCount = 0;

      // ذخیره پیام‌های جدید در دیتابیس
      for (const message of data.data) {
        try {
          // بررسی اینکه پیام قبلاً ذخیره نشده باشد
          const existingMessage = await storage.getReceivedMessageByWhatsiPlusId(message.id);
          
          if (!existingMessage) {
            // پیدا کردن کاربرانی که مجاز به دریافت پیام‌ها هستند (ادمین یا سطح 1)
            const users = await storage.getAllUsers();
            const authorizedUsers = users.filter(user => user.role === 'admin' || user.role === 'user_level_1');

            // ذخیره پیام برای هر کاربر مجاز
            let savedMessageId: string | null = null;
            for (const user of authorizedUsers) {
              const savedMessage = await storage.createReceivedMessage({
                userId: user.id,
                whatsiPlusId: message.id,
                sender: message.from,
                message: message.message,
                status: "خوانده نشده",
                originalDate: message.date
              });
              if (!savedMessageId) savedMessageId = savedMessage.id;
            }

            // پاسخ خودکار با Gemini AI
            if (savedMessageId && geminiService.isActive()) {
              await this.handleAutoResponse(message.from, message.message, message.id, authorizedUsers[0].id);
            }
            
            newMessagesCount++;
          }
        } catch (error) {
          console.error("❌ خطا در ذخیره پیام:", error);
        }
      }

      if (newMessagesCount > 0) {
        console.log(`📨 ${newMessagesCount} پیام جدید از واتس‌اپ دریافت و ذخیره شد`);
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