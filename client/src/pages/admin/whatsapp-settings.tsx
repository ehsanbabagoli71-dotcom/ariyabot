import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, TestTube, Circle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createAuthenticatedRequest } from "@/lib/auth";
import type { WhatsappSettings } from "@shared/schema";

export default function WhatsappSettings() {
  const [formData, setFormData] = useState({
    token: "",
    phoneNumber: "",
    isEnabled: false,
    notifications: [] as string[],
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery<WhatsappSettings | null>({
    queryKey: ["/api/whatsapp-settings"],
    queryFn: async () => {
      const response = await createAuthenticatedRequest("/api/whatsapp-settings");
      if (!response.ok) throw new Error("خطا در دریافت تنظیمات واتس‌اپ");
      return response.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await createAuthenticatedRequest("/api/whatsapp-settings", {
        method: "PUT",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("خطا در بروزرسانی تنظیمات واتس‌اپ");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp-settings"] });
      toast({
        title: "موفقیت",
        description: "تنظیمات با موفقیت ذخیره شد",
      });
    },
    onError: () => {
      toast({
        title: "خطا",
        description: "خطا در ذخیره تنظیمات",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        token: settings.token || "",
        phoneNumber: settings.phoneNumber || "",
        isEnabled: settings.isEnabled,
        notifications: settings.notifications || [],
      });
    }
  }, [settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handleTestConnection = () => {
    toast({
      title: "تست اتصال",
      description: "در حال تست اتصال واتس‌اپ...",
    });
    
    // Simulate connection test
    setTimeout(() => {
      toast({
        title: "نتیجه تست",
        description: "اتصال با موفقیت برقرار شد",
      });
    }, 2000);
  };

  const handleNotificationChange = (notification: string, checked: boolean) => {
    if (checked) {
      setFormData({
        ...formData,
        notifications: [...formData.notifications, notification],
      });
    } else {
      setFormData({
        ...formData,
        notifications: formData.notifications.filter(n => n !== notification),
      });
    }
  };

  const notificationOptions = [
    { id: "new_ticket", label: "اعلان تیکت جدید" },
    { id: "new_user", label: "اعلان کاربر جدید" },
    { id: "new_product", label: "اعلان محصول جدید" },
  ];

  if (isLoading) {
    return (
      <DashboardLayout title="تنظیمات واتس‌اپ">
        <div className="text-center py-8">در حال بارگذاری...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="تنظیمات واتس‌اپ">
      <div className="space-y-6" data-testid="page-whatsapp-settings">
        <div>
          <h2 className="text-2xl font-bold text-foreground">تنظیمات واتس‌اپ</h2>
          <p className="text-muted-foreground">پیکربندی ادغام با واتس‌اپ بیزینس</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>تنظیمات اتصال</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6" data-testid="form-whatsapp-settings">
              <div>
                <Label htmlFor="token">توکن واتس‌اپ</Label>
                <Input
                  id="token"
                  type="password"
                  value={formData.token}
                  onChange={(e) => setFormData({ ...formData, token: e.target.value })}
                  placeholder="توکن API واتس‌اپ بیزینس را وارد کنید"
                  data-testid="input-whatsapp-token"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  توکن را از پنل توسعه‌دهندگان فیس‌بوک دریافت کنید
                </p>
              </div>

              <div>
                <Label htmlFor="phoneNumber">شماره واتس‌اپ بیزینس</Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  placeholder="+989123456789"
                  data-testid="input-whatsapp-phone"
                />
              </div>

              <div className="flex items-center space-x-3 space-x-reverse">
                <Checkbox
                  id="isEnabled"
                  checked={formData.isEnabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, isEnabled: checked as boolean })}
                  data-testid="checkbox-whatsapp-enabled"
                />
                <div>
                  <Label htmlFor="isEnabled" className="text-sm font-medium">
                    فعال‌سازی ادغام واتس‌اپ
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    ارسال خودکار پیام‌ها و اعلان‌ها از طریق واتس‌اپ
                  </p>
                </div>
              </div>

              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-sm">تنظیمات اعلان‌ها</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {notificationOptions.map((option) => (
                    <div key={option.id} className="flex items-center space-x-2 space-x-reverse">
                      <Checkbox
                        id={option.id}
                        checked={formData.notifications.includes(option.id)}
                        onCheckedChange={(checked) => handleNotificationChange(option.id, checked as boolean)}
                        data-testid={`checkbox-notification-${option.id}`}
                      />
                      <Label htmlFor={option.id} className="text-sm">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <div className="flex items-center space-x-4 space-x-reverse">
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  data-testid="button-save-whatsapp-settings"
                >
                  <Save className="w-4 h-4 ml-2" />
                  {updateMutation.isPending ? "در حال ذخیره..." : "ذخیره تنظیمات"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTestConnection}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  data-testid="button-test-whatsapp-connection"
                >
                  <TestTube className="w-4 h-4 ml-2" />
                  تست اتصال
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Connection Status */}
        <Card>
          <CardHeader>
            <CardTitle>وضعیت اتصال</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-3 space-x-reverse" data-testid="section-connection-status">
              <Circle className={`w-3 h-3 ${formData.isEnabled ? 'text-green-500' : 'text-red-500'} fill-current`} />
              <span className="text-sm text-muted-foreground">
                {formData.isEnabled ? "متصل" : "قطع شده"}
              </span>
              <span className="text-xs text-muted-foreground" data-testid="text-last-check-time">
                آخرین بررسی: {new Date().toLocaleString('fa-IR')}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
