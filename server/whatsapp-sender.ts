import { storage } from "./storage";

export class WhatsAppSender {
  async sendMessage(recipient: string, message: string, userId: string): Promise<boolean> {
    try {
      // دریافت تنظیمات واتس‌اپ
      const settings = await storage.getWhatsappSettings();
      
      if (!settings || !settings.token || !settings.isEnabled) {
        console.log("⚠️ تنظیمات واتس‌اپ برای ارسال پیام فعال نیست");
        return false;
      }

      // ارسال پیام از طریق WhatsiPlus API
      const response = await fetch(`https://api.whatsiplus.com/sendMessage/${settings.token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'WhatsApp-Service/1.0',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          to: recipient,
          message: message
        })
      });

      if (!response.ok) {
        console.error("❌ خطا در ارسال پیام واتس‌اپ:", response.status, response.statusText);
        return false;
      }

      // ذخیره پیام ارسالی در دیتابیس
      await storage.createSentMessage({
        userId: userId,
        recipient: recipient,
        message: message,
        status: "sent"
      });

      console.log(`📤 پیام به ${recipient} ارسال شد: ${message.substring(0, 50)}...`);
      return true;

    } catch (error) {
      console.error("❌ خطا در ارسال پیام واتس‌اپ:", error);
      return false;
    }
  }
}

export const whatsAppSender = new WhatsAppSender();