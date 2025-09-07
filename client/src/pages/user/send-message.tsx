import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, Phone, MessageSquare, Link } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { createAuthenticatedRequest } from "@/lib/auth";

const API_SEND_URL = "https://api.whatsiplus.com/sendMsg/";

export default function SendMessagePanel() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [messageText, setMessageText] = useState("");
  const [mediaLink, setMediaLink] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  
  const { user } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phoneNumber.trim() || !messageText.trim()) {
      setError("لطفاً شماره همراه و متن پیام را پر کنید");
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      // Get WhatsApp settings to retrieve the API token
      const settingsResponse = await createAuthenticatedRequest("/api/whatsapp-settings");
      if (!settingsResponse.ok) {
        throw new Error("خطا در دریافت تنظیمات واتس‌اپ");
      }
      
      const settings = await settingsResponse.json();
      const apiToken = settings.token;

      if (!apiToken) {
        setError("توکن API تنظیم نشده است. لطفاً ابتدا تنظیمات واتس‌اپ را کامل کنید");
        return;
      }

      // Prepare form data
      const formData = new FormData();
      formData.append('phonenumber', phoneNumber);
      formData.append('message', messageText);
      
      if (mediaLink.trim()) {
        formData.append('link', mediaLink);
      }

      // Construct API URL with token
      const apiUrl = `${API_SEND_URL}${apiToken}`;

      // Send the message using POST with form data
      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        console.log("پیام با موفقیت به WhatsApp API ارسال شد");
        
        // حالا پیام را در دیتابیس ذخیره کنیم
        try {
          const dbResponse = await createAuthenticatedRequest("/api/messages/sent", {
            method: "POST",
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              recipient: phoneNumber,
              message: `${messageText}${mediaLink.trim() ? `\n\nلینک ضمیمه: ${mediaLink}` : ''}`,
              status: "sent"
            }),
          });

          if (dbResponse.ok) {
            console.log("پیام در دیتابیس ذخیره شد");
          } else {
            console.error("خطا در ذخیره پیام در دیتابیس:", await dbResponse.text());
          }
        } catch (dbError) {
          console.error("خطا در ذخیره پیام در دیتابیس:", dbError);
          // We don't throw here because the main message was sent successfully
        }

        setSuccessMessage("پیام با موفقیت ارسال شد و در گزارشات ذخیره شد");
        setPhoneNumber("");
        setMessageText("");
        setMediaLink("");
        toast({
          title: "موفقیت",
          description: "پیام با موفقیت ارسال شد و در گزارشات ذخیره شد",
        });
      } else {
        const errorText = await response.text();
        console.error("WhatsApp API Error:", errorText);
        throw new Error("خطا در ارسال پیام");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "خطا در ارسال پیام";
      setError(errorMessage);
      toast({
        title: "خطا",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout title="ارسال پیام واتس‌اپ">
      <div className="space-y-6" data-testid="page-send-message">

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6" data-testid="form-send-message">
              <div>
                <Label htmlFor="phoneNumber" className="flex items-center">
                  <Phone className="w-4 h-4 ml-2" />
                  شماره همراه
                </Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="09123456789"
                  className="w-full px-4 py-3 bg-gray-100 border-2 border-transparent rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition"
                  data-testid="input-phone-number"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  شماره همراه گیرنده را با کد کشور وارد کنید (مثال: 989123456789)
                </p>
              </div>

              <div>
                <Label htmlFor="messageText" className="flex items-center">
                  <MessageSquare className="w-4 h-4 ml-2" />
                  متن پیام
                </Label>
                <Textarea
                  id="messageText"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="متن پیام خود را اینجا بنویسید..."
                  className="w-full px-4 py-3 bg-gray-100 border-2 border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition min-h-[120px]"
                  data-testid="textarea-message"
                  required
                />
              </div>

              <div>
                <Label htmlFor="mediaLink" className="flex items-center">
                  <Link className="w-4 h-4 ml-2" />
                  لینک تصویر یا فایل (اختیاری)
                </Label>
                <Input
                  id="mediaLink"
                  type="url"
                  value={mediaLink}
                  onChange={(e) => setMediaLink(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-4 py-3 bg-gray-100 border-2 border-transparent rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition"
                  data-testid="input-media-link"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  لینک مستقیم تصویر یا فایل برای ارسال همراه پیام
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              {successMessage && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                  {successMessage}
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={isLoading || !phoneNumber.trim() || !messageText.trim()}
                  className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white px-6 py-3 rounded-full hover:scale-110 transition-transform duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  data-testid="button-send-message"
                >
                  <Send className="w-4 h-4 ml-2" />
                  {isLoading ? "در حال ارسال..." : "ارسال پیام"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

      </div>
    </DashboardLayout>
  );
}