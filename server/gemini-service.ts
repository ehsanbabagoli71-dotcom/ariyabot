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
        // همیشه از تنظیمات واتس‌اپ برای دریافت نام استفاده کن (برای همه کاربران)
        const whatsappSettings = await storage.getWhatsappSettings();
        if (whatsappSettings?.aiName) {
          aiName = whatsappSettings.aiName;
        }
      } catch (settingsError) {
        console.error("خطا در دریافت نام هوش مصنوعی:", settingsError);
        // ادامه با نام پیش‌فرض
      }

      // normalize کردن متن برای تشخیص بهتر سوالات فارسی
      const normalizeText = (text: string): string => {
        return text
          .normalize('NFKC') // Unicode normalization
          .replace(/\u200C|\u200F|\u200E/g, '') // حذف ZWNJ و سایر کاراکترهای مخفی
          .replace(/[\u064A]/g, '\u06CC') // تبدیل ي عربی به ی فارسی
          .replace(/[\u0643]/g, '\u06A9') // تبدیل ك عربی به ک فارسی
          .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]/g, '') // حذف اعراب
          .replace(/[؟?!.،,]/g, ' ') // تبدیل علائم نگارشی به فاصله
          .replace(/\s+/g, ' ') // کاهش فاصله‌های چندگانه
          .trim()
          .toLowerCase();
      };

      const normalizedMessage = normalizeText(message);
      
      // الگوهای مختلف سوالات نام (فارسی و انگلیسی)
      const nameQuestionPatterns = [
        /(اسم(ت| شما)?\s*(چیه|چیست|چی\s*هست))/,
        /(نام(ت| شما)?\s*(چیه|چیست))/,
        /(تو\s*کی(ی|\s*هستی)?)/,
        /(چه\s*اسمی\s*داری)/,
        /(خودت\s*رو\s*معرفی\s*کن)/,
        /(who\s*are\s*you)/,
        /(what'?s\s*your\s*name)/
      ];
      
      const isNameQuestion = nameQuestionPatterns.some(pattern => 
        pattern.test(normalizedMessage)
      );

      // اگر سوال در مورد نام بود، مستقیماً نام را برگردان
      if (isNameQuestion) {
        return aiName;
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