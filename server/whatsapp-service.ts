import { storage } from "./storage";

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

      // دریافت پیام‌ها از WhatsiPlus API
      const response = await fetch(`https://api.whatsiplus.com/receivedMessages/${settings.token}?page=1&phonenumber=${settings.phoneNumber || ''}`);
      
      if (!response.ok) {
        console.error("❌ خطا در دریافت پیام‌ها از WhatsiPlus:", response.statusText);
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
            for (const user of authorizedUsers) {
              await storage.createReceivedMessage({
                userId: user.id,
                whatsiPlusId: message.id,
                sender: message.from,
                message: message.message,
                status: "خوانده نشده",
                originalDate: message.date
              });
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

    } catch (error) {
      console.error("❌ خطا در دریافت پیام‌های واتس‌اپ:", error);
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      lastFetchTime: this.lastFetchTime
    };
  }
}

// ایجاد نمونه سینگلتون
export const whatsAppMessageService = new WhatsAppMessageService();