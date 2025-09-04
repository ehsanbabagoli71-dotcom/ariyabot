import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeaders } from "@/lib/auth";

export default function SendTicket() {
  const [formData, setFormData] = useState({
    subject: "",
    category: "",
    priority: "medium",
    message: "",
  });
  const [attachments, setAttachments] = useState<FileList | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createTicketMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const formDataToSend = new FormData();
      formDataToSend.append("subject", data.subject);
      formDataToSend.append("category", data.category);
      formDataToSend.append("priority", data.priority);
      formDataToSend.append("message", data.message);

      if (attachments) {
        Array.from(attachments).forEach((file) => {
          formDataToSend.append("attachments", file);
        });
      }

      const authHeaders = getAuthHeaders();
      const headers: Record<string, string> = {};
      if (authHeaders.Authorization) {
        headers.Authorization = authHeaders.Authorization;
      }
      
      const response = await fetch("/api/tickets", {
        method: "POST",
        headers,
        body: formDataToSend,
      });

      if (!response.ok) throw new Error("خطا در ارسال تیکت");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      setFormData({ subject: "", category: "", priority: "medium", message: "" });
      setAttachments(null);
      // Reset file input
      const fileInput = document.getElementById("attachments") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
      
      toast({
        title: "موفقیت",
        description: "تیکت با موفقیت ارسال شد",
      });
    },
    onError: () => {
      toast({
        title: "خطا",
        description: "خطا در ارسال تیکت",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.subject.trim() || !formData.category || !formData.message.trim()) {
      toast({
        title: "خطا",
        description: "لطفاً تمام فیلدهای الزامی را پر کنید",
        variant: "destructive",
      });
      return;
    }

    createTicketMutation.mutate(formData);
  };

  const handleReset = () => {
    setFormData({ subject: "", category: "", priority: "medium", message: "" });
    setAttachments(null);
    // Reset file input
    const fileInput = document.getElementById("attachments") as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // Check file count
    if (files.length > 5) {
      toast({
        title: "خطا",
        description: "حداکثر ۵ فایل می‌توانید ضمیمه کنید",
        variant: "destructive",
      });
      e.target.value = "";
      return;
    }

    // Check file sizes
    for (let i = 0; i < files.length; i++) {
      if (files[i].size > 5 * 1024 * 1024) { // 5MB
        toast({
          title: "خطا",
          description: "حجم هر فایل نباید بیش از ۵ مگابایت باشد",
          variant: "destructive",
        });
        e.target.value = "";
        return;
      }
    }

    setAttachments(files);
  };

  const getCategoryLabel = (category: string) => {
    const categories: Record<string, string> = {
      technical: "مشکل فنی",
      account: "مسائل حساب کاربری",
      billing: "مسائل مالی",
      feature: "درخواست ویژگی جدید",
      other: "سایر",
    };
    return categories[category] || category;
  };

  const getPriorityLabel = (priority: string) => {
    const priorities: Record<string, string> = {
      low: "کم",
      medium: "متوسط",
      high: "بالا",
      urgent: "فوری",
    };
    return priorities[priority] || priority;
  };

  return (
    <DashboardLayout title="ارسال تیکت">
      <div className="space-y-6" data-testid="page-send-ticket">
        <div>
          <h2 className="text-2xl font-bold text-foreground">ارسال تیکت پشتیبانی</h2>
          <p className="text-muted-foreground">برای دریافت کمک از تیم پشتیبانی تیکت ایجاد کنید</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Send className="w-5 h-5 ml-2" />
              تیکت جدید
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6" data-testid="form-send-ticket">
              <div>
                <Label htmlFor="subject">موضوع تیکت *</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="موضوع مشکل یا سوال خود را وارد کنید"
                  required
                  data-testid="input-ticket-subject"
                />
              </div>

              <div>
                <Label htmlFor="category">دسته‌بندی *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger data-testid="select-ticket-category">
                    <SelectValue placeholder="دسته‌بندی را انتخاب کنید" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technical">مشکل فنی</SelectItem>
                    <SelectItem value="account">مسائل حساب کاربری</SelectItem>
                    <SelectItem value="billing">مسائل مالی</SelectItem>
                    <SelectItem value="feature">درخواست ویژگی جدید</SelectItem>
                    <SelectItem value="other">سایر</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="priority">اولویت</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger data-testid="select-ticket-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">کم</SelectItem>
                    <SelectItem value="medium">متوسط</SelectItem>
                    <SelectItem value="high">بالا</SelectItem>
                    <SelectItem value="urgent">فوری</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="message">پیام *</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="توضیح کاملی از مشکل یا سوال خود ارائه دهید"
                  rows={6}
                  required
                  data-testid="textarea-ticket-message"
                />
              </div>

              <div>
                <Label htmlFor="attachments">فایل‌های ضمیمه</Label>
                <Input
                  id="attachments"
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={handleFileChange}
                  data-testid="input-ticket-attachments"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  فرمت‌های مجاز: تصاویر، PDF، Word (حداکثر ۵ فایل، هر فایل حداکثر ۵ مگابایت)
                </p>
                {attachments && attachments.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm text-foreground">فایل‌های انتخاب شده:</p>
                    <ul className="text-sm text-muted-foreground">
                      {Array.from(attachments).map((file, index) => (
                        <li key={index} data-testid={`text-attachment-${index}`}>
                          {file.name} ({Math.round(file.size / 1024)} KB)
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-4 space-x-reverse">
                <Button
                  type="submit"
                  disabled={createTicketMutation.isPending}
                  data-testid="button-submit-ticket"
                >
                  <Send className="w-4 h-4 ml-2" />
                  {createTicketMutation.isPending ? "در حال ارسال..." : "ارسال تیکت"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReset}
                  data-testid="button-reset-form"
                >
                  <RotateCcw className="w-4 h-4 ml-2" />
                  پاک کردن فرم
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
