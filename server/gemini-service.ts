import { GoogleGenerativeAI } from "@google/generative-ai";
import { storage } from "./storage";

export class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    try {
      const tokenSettings = await storage.getAiTokenSettings();
      if (tokenSettings?.token && tokenSettings.isActive) {
        this.genAI = new GoogleGenerativeAI(tokenSettings.token);
        this.model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
        console.log("🤖 سرویس Gemini AI با موفقیت راه‌اندازی شد");
      } else {
        console.log("⚠️ توکن Gemini AI تنظیم نشده یا غیرفعال است");
      }
    } catch (error) {
      console.error("❌ خطا در راه‌اندازی Gemini AI:", error);
    }
  }

  async reinitialize() {
    await this.initialize();
  }

  async generateResponse(message: string, userId?: string): Promise<string> {
    if (!this.model) {
      throw new Error("Gemini AI فعال نیست. لطفاً توکن API را تنظیم کنید.");
    }

    try {
      // دریافت نام هوش مصنوعی از تنظیمات
      let aiName = "من هوش مصنوعی هستم"; // پیش‌فرض
      
      try {
        if (userId) {
          const user = await storage.getUser(userId);
          // اگر کاربر سطح 1 است، از تنظیمات شخصی استفاده کن (در آینده)
          // در حال حاضر از تنظیمات عمومی استفاده می‌کنیم
          if (user?.role === 'admin') {
            const whatsappSettings = await storage.getWhatsappSettings();
            if (whatsappSettings?.aiName) {
              aiName = whatsappSettings.aiName;
            }
          }
        } else {
          // اگر userId نداریم، از تنظیمات عمومی استفاده کن
          const whatsappSettings = await storage.getWhatsappSettings();
          if (whatsappSettings?.aiName) {
            aiName = whatsappSettings.aiName;
          }
        }
      } catch (settingsError) {
        console.error("خطا در دریافت نام هوش مصنوعی:", settingsError);
        // ادامه با نام پیش‌فرض
      }
      
      // اضافه کردن context فارسی برای پاسخ‌های بهتر
      const prompt = `${aiName} و به زبان فارسی پاسخ می‌دهم. لطفاً به این پیام پاسخ دهید:

${message}

پاسخ من باید:
- به زبان فارسی باشد
- حداکثر 20 کلمه باشد
- مؤدبانه و مستقیم باشد
- بدون توضیحات اضافی باشد`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const finalText = text.trim() || "متأسفانه نتوانستم پاسخ مناسبی تولید کنم.";
      
      // محدود کردن طول پاسخ برای ارسال بهتر
      if (finalText.length > 200) {
        return finalText.substring(0, 200) + '...';
      }
      
      return finalText;
    } catch (error) {
      console.error("❌ خطا در تولید پاسخ Gemini:", error);
      throw new Error("خطا در تولید پاسخ هوش مصنوعی");
    }
  }

  isActive(): boolean {
    return this.model !== null;
  }
}

export const geminiService = new GeminiService();