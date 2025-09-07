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
        this.model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
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

  async generateResponse(message: string): Promise<string> {
    if (!this.model) {
      throw new Error("Gemini AI فعال نیست. لطفاً توکن API را تنظیم کنید.");
    }

    try {
      // اضافه کردن context فارسی برای پاسخ‌های بهتر
      const prompt = `شما یک دستیار هوشمند هستید که به زبان فارسی پاسخ می‌دهید. لطفاً به این پیام پاسخ دهید:

${message}

پاسخ شما باید:
- به زبان فارسی باشد
- مفید و مفصل باشد  
- مؤدبانه و دوستانه باشد
- حداکثر 500 کلمه باشد`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      return text.trim() || "متأسفانه نتوانستم پاسخ مناسبی تولید کنم.";
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