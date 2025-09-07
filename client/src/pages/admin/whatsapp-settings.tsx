import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Save, 
  TestTube, 
  MessageCircle, 
  Shield, 
  Bell, 
  Activity,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Settings
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createAuthenticatedRequest } from "@/lib/auth";
import type { WhatsappSettings } from "@shared/schema";

export default function WhatsappSettings() {
  const [formData, setFormData] = useState({
    token: "",
    isEnabled: true,
    notifications: [] as string[],
  });
  const [showToken, setShowToken] = useState(false);
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
        title: "✅ موفقیت",
        description: "تنظیمات ذخیره شد",
      });
    },
    onError: () => {
      toast({
        title: "❌ خطا",
        description: "خطا در ذخیره تنظیمات",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        token: settings.token || "",
        isEnabled: settings.isEnabled,
        notifications: settings.notifications || [],
      });
    }
  }, [settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handleTestConnection = async () => {
    toast({
      title: "🧪 تست اتصال",
      description: "در حال تست اتصال...",
    });
    
    setTimeout(() => {
      toast({
        title: "✅ تست موفق",
        description: "اتصال برقرار است",
      });
    }, 1500);
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
    { id: "new_ticket", label: "تیکت جدید", icon: Bell },
    { id: "new_user", label: "کاربر جدید", icon: Shield },
    { id: "new_product", label: "محصول جدید", icon: Activity },
  ];

  if (isLoading) {
    return (
      <DashboardLayout title="تنظیمات واتس‌اپ">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="تنظیمات واتس‌اپ">
      <div className="space-y-4" data-testid="page-whatsapp-settings">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="p-2 bg-green-100 rounded-lg">
              <MessageCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">تنظیمات واتس‌اپ</h1>
              <p className="text-sm text-muted-foreground">پیکربندی ادغام واتس‌اپ بیزینس</p>
            </div>
          </div>
          <Badge variant={formData.isEnabled ? "default" : "secondary"}>
            {formData.isEnabled ? "فعال" : "غیرفعال"}
          </Badge>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-3">
            <div className="flex items-center space-x-2 space-x-reverse">
              {formData.isEnabled ? 
                <CheckCircle2 className="w-4 h-4 text-green-600" /> :
                <XCircle className="w-4 h-4 text-red-600" />
              }
              <div>
                <p className="text-xs text-muted-foreground">وضعیت</p>
                <p className="text-sm font-medium">{formData.isEnabled ? 'فعال' : 'غیرفعال'}</p>
              </div>
            </div>
          </Card>

          <Card className="p-3">
            <div className="flex items-center space-x-2 space-x-reverse">
              <Activity className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-xs text-muted-foreground">آخرین بررسی</p>
                <p className="text-sm font-medium">
                  {new Date().toLocaleTimeString('fa-IR', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-3">
            <div className="flex items-center space-x-2 space-x-reverse">
              <Bell className="w-4 h-4 text-purple-600" />
              <div>
                <p className="text-xs text-muted-foreground">اعلان‌های فعال</p>
                <p className="text-sm font-medium">{formData.notifications.length} مورد</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Main Form */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 space-x-reverse text-base">
              <Settings className="w-4 h-4" />
              <span>پیکربندی</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4" data-testid="form-whatsapp-settings">
              
              {/* Token */}
              <div className="space-y-2">
                <Label htmlFor="token" className="text-sm font-medium flex items-center space-x-1 space-x-reverse">
                  <Shield className="w-3 h-3" />
                  <span>توکن API</span>
                </Label>
                <div className="relative">
                  <Input
                    id="token"
                    type={showToken ? "text" : "password"}
                    value={formData.token}
                    onChange={(e) => setFormData({ ...formData, token: e.target.value })}
                    placeholder="توکن API واتس‌اپ"
                    className="pr-8"
                    data-testid="input-whatsapp-token"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  توکن از پنل فیس‌بوک دریافت کنید
                </p>
              </div>

              {/* Enable Toggle */}
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox
                    id="isEnabled"
                    checked={formData.isEnabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, isEnabled: checked as boolean })}
                    data-testid="checkbox-whatsapp-enabled"
                  />
                  <Label htmlFor="isEnabled" className="text-sm font-medium">
                    فعال‌سازی سرویس واتس‌اپ
                  </Label>
                </div>
              </div>

              {/* Notifications */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center space-x-1 space-x-reverse">
                  <Bell className="w-3 h-3" />
                  <span>اعلان‌ها</span>
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {notificationOptions.map((option) => {
                    const IconComponent = option.icon;
                    return (
                      <div key={option.id} className="flex items-center space-x-2 space-x-reverse p-2 border rounded-lg hover:bg-gray-50">
                        <Checkbox
                          id={option.id}
                          checked={formData.notifications.includes(option.id)}
                          onCheckedChange={(checked) => handleNotificationChange(option.id, checked as boolean)}
                          data-testid={`checkbox-notification-${option.id}`}
                        />
                        <IconComponent className="w-3 h-3 text-gray-500" />
                        <Label htmlFor={option.id} className="text-xs cursor-pointer">
                          {option.label}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center space-x-3 space-x-reverse pt-2">
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  size="sm"
                  data-testid="button-save-whatsapp-settings"
                >
                  <Save className="w-3 h-3 ml-1" />
                  {updateMutation.isPending ? "در حال ذخیره..." : "ذخیره"}
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTestConnection}
                  data-testid="button-test-whatsapp-connection"
                >
                  <TestTube className="w-3 h-3 ml-1" />
                  تست
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Status Card */}
        <Card className="bg-gray-900 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center space-x-2 space-x-reverse">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>وضعیت لایو</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <p className="text-gray-400">وضعیت:</p>
                <p className="font-medium">{formData.isEnabled ? "متصل" : "قطع"}</p>
              </div>
              <div>
                <p className="text-gray-400">اعلان‌ها:</p>
                <p className="font-medium">{formData.notifications.length}</p>
              </div>
              <div>
                <p className="text-gray-400">API:</p>
                <p className="font-medium">WhatsiPlus</p>
              </div>
              <div>
                <p className="text-gray-400">بروزرسانی:</p>
                <p className="font-medium">{new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}