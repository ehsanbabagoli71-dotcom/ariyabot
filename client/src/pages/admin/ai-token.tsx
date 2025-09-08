import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Bot, Key, Save, Eye, EyeOff, Power } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createAuthenticatedRequest } from "@/lib/auth";

export default function AITokenSettings() {
  const [token, setToken] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [showToken, setShowToken] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: aiTokenData, isLoading } = useQuery({
    queryKey: ["/api/ai-token"],
    queryFn: async () => {
      const response = await createAuthenticatedRequest("/api/ai-token");
      if (!response.ok) {
        if (response.status === 404) {
          return { token: "", isActive: true };
        }
        throw new Error("خطا در دریافت توکن هوش مصنوعی");
      }
      return response.json();
    },
  });

  const saveTokenMutation = useMutation({
    mutationFn: async (tokenData: { token: string; isActive: boolean }) => {
      const response = await createAuthenticatedRequest("/api/ai-token", {
        method: "POST",
        body: JSON.stringify(tokenData),
      });
      if (!response.ok) throw new Error("خطا در ذخیره توکن");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-token"] });
      toast({
        title: "موفقیت",
        description: "توکن هوش مصنوعی با موفقیت ذخیره شد",
      });
    },
    onError: () => {
      toast({
        title: "خطا",
        description: "خطا در ذخیره توکن هوش مصنوعی",
        variant: "destructive",
      });
    },
  });

  const handleSaveToken = (e: React.FormEvent) => {
    e.preventDefault();
    saveTokenMutation.mutate({ token, isActive });
  };

  // Set token and status when data is loaded
  useState(() => {
    if (aiTokenData?.token && !token) {
      setToken(aiTokenData.token);
    }
    if (aiTokenData?.isActive !== undefined) {
      setIsActive(aiTokenData.isActive);
    }
  });

  return (
    <DashboardLayout title="توکن هوش مصنوعی">
      <div className="space-y-6" data-testid="page-ai-token">
        <div className="flex items-center">
          <Bot className="w-8 h-8 ml-3 text-primary" />
          <div>
            <h2 className="text-2xl font-bold text-foreground">توکن هوش مصنوعی</h2>
            <p className="text-muted-foreground">مدیریت کلید API برای سرویس‌های هوش مصنوعی</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Key className="w-5 h-5 ml-2" />
              تنظیمات توکن
            </CardTitle>
            <CardDescription>
              توکن API را برای اتصال به سرویس‌های هوش مصنوعی وارد کنید
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="p-8 text-center">در حال بارگذاری...</div>
            ) : (
              <form onSubmit={handleSaveToken} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="aiToken">توکن API</Label>
                  <div className="relative">
                    <Input
                      id="aiToken"
                      type={showToken ? "text" : "password"}
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      placeholder="توکن هوش مصنوعی خود را وارد کنید..."
                      className="pl-10"
                      data-testid="input-ai-token"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute left-2 top-1/2 transform -translate-y-1/2"
                      onClick={() => setShowToken(!showToken)}
                      data-testid="button-toggle-token-visibility"
                    >
                      {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ai-status" className="flex items-center gap-2">
                    <Power className="w-4 h-4" />
                    وضعیت هوش مصنوعی
                  </Label>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <Switch
                      id="ai-status"
                      checked={isActive}
                      onCheckedChange={setIsActive}
                      data-testid="switch-ai-status"
                    />
                    <Label htmlFor="ai-status" className="text-sm text-muted-foreground">
                      {isActive ? "فعال" : "غیرفعال"}
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    در صورت غیرفعال بودن، سیستم به پیام‌های واتس‌اپ پاسخ خودکار نخواهد داد
                  </p>
                </div>

                <Alert>
                  <Bot className="h-4 w-4" />
                  <AlertDescription>
                    این توکن برای تمام درخواست‌های مربوط به هوش مصنوعی در سیستم استفاده خواهد شد. 
                    لطفاً مطمئن شوید که توکن معتبر و دارای دسترسی‌های لازم است.
                  </AlertDescription>
                </Alert>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={saveTokenMutation.isPending || !token.trim()}
                    data-testid="button-save-token"
                    className={!isActive ? "opacity-60" : ""}
                  >
                    <Save className="w-4 h-4 ml-2" />
                    {saveTokenMutation.isPending ? "در حال ذخیره..." : "ذخیره توکن"}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>راهنمای استفاده</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-muted-foreground space-y-2">
              <p><strong>OpenAI:</strong> برای دریافت توکن از <code>platform.openai.com</code> استفاده کنید</p>
              <p><strong>Claude:</strong> برای دریافت توکن از <code>console.anthropic.com</code> استفاده کنید</p>
              <p><strong>امنیت:</strong> توکن خود را با هیچ کس به اشتراک نگذارید</p>
              <p><strong>دقت:</strong> تغییر توکن بر روی تمام قابلیت‌های هوش مصنوعی سیستم تأثیر می‌گذارد</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}