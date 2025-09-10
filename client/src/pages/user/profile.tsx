import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Camera, User, Save, Crown, Calendar, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { createAuthenticatedRequest, getAuthHeaders } from "@/lib/auth";
import type { UserSubscription } from "@shared/schema";

export default function Profile() {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get user's subscription info
  const { data: userSubscription, isLoading: subscriptionLoading } = useQuery<UserSubscription | null>({
    queryKey: ["/api/user-subscriptions/me"],
    enabled: !!user,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await createAuthenticatedRequest("/api/profile", {
        method: "PUT",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("خطا در بروزرسانی پروفایل");
      return response.json();
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(["/api/auth/me"], updatedUser);
      toast({
        title: "موفقیت",
        description: "پروفایل با موفقیت بروزرسانی شد",
      });
    },
    onError: () => {
      toast({
        title: "خطا",
        description: "خطا در بروزرسانی پروفایل",
        variant: "destructive",
      });
    },
  });

  const uploadPictureMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("profilePicture", file);

      const authHeaders = getAuthHeaders();
      const headers: Record<string, string> = {};
      if (authHeaders.Authorization) {
        headers.Authorization = authHeaders.Authorization;
      }
      
      const response = await fetch("/api/profile/picture", {
        method: "POST",
        headers,
        body: formData,
      });
      
      if (!response.ok) throw new Error("خطا در آپلود تصویر");
      return response.json();
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(["/api/auth/me"], updatedUser);
      toast({
        title: "موفقیت",
        description: "تصویر پروفایل با موفقیت بروزرسانی شد",
      });
    },
    onError: () => {
      toast({
        title: "خطا",
        description: "خطا در آپلود تصویر پروفایل",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast({
        title: "خطا",
        description: "لطفاً تمام فیلدها را پر کنید",
        variant: "destructive",
      });
      return;
    }

    updateProfileMutation.mutate(formData);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "خطا",
        description: "لطفاً یک فایل تصویری انتخاب کنید",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB
      toast({
        title: "خطا",
        description: "حجم فایل نباید بیش از ۵ مگابایت باشد",
        variant: "destructive",
      });
      return;
    }

    uploadPictureMutation.mutate(file);
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case "admin":
        return "مدیر";
      case "user_level_1":
        return "کاربر سطح ۱";
      case "user_level_2":
        return "کاربر سطح ۲";
      default:
        return "کاربر";
    }
  };

  return (
    <DashboardLayout title="اطلاعات کاربری">
      <div className="space-y-6" data-testid="page-user-profile">
        <div>
          <h2 className="text-2xl font-bold text-foreground">اطلاعات کاربری</h2>
          <p className="text-muted-foreground">مشاهده و ویرایش اطلاعات شخصی</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Picture Section */}
          <Card>
            <CardHeader>
              <CardTitle>تصویر پروفایل</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <Avatar className="w-32 h-32 mx-auto mb-4" data-testid="img-profile-avatar">
                <AvatarImage src={user?.profilePicture || undefined} />
                <AvatarFallback className="text-2xl">
                  <User className="h-12 w-12" />
                </AvatarFallback>
              </Avatar>
              <input
                type="file"
                id="profilePicture"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                data-testid="input-profile-picture"
              />
              <Label
                htmlFor="profilePicture"
                className="inline-flex items-center justify-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors cursor-pointer"
                data-testid="button-change-picture"
              >
                <Camera className="w-4 h-4 ml-2" />
                {uploadPictureMutation.isPending ? "در حال آپلود..." : "تغییر تصویر"}
              </Label>
            </CardContent>
          </Card>

          {/* Profile Information Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>اطلاعات شخصی</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4" data-testid="form-update-profile">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">نام</Label>
                      <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        required
                        data-testid="input-firstName"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">نام خانوادگی</Label>
                      <Input
                        id="lastName"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        required
                        data-testid="input-lastName"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email">ایمیل</Label>
                    <Input
                      id="email"
                      value={user?.email || ""}
                      disabled
                      className="bg-muted text-muted-foreground"
                      data-testid="input-email-disabled"
                    />
                    <p className="text-xs text-muted-foreground mt-1">ایمیل قابل تغییر نیست</p>
                  </div>

                  <div>
                    <Label htmlFor="phone">شماره تلفن</Label>
                    <Input
                      id="phone"
                      value={user?.phone || ""}
                      disabled
                      className="bg-muted text-muted-foreground"
                      data-testid="input-phone-disabled"
                    />
                    <p className="text-xs text-muted-foreground mt-1">شماره تلفن قابل تغییر نیست</p>
                  </div>

                  <div>
                    <Label htmlFor="role">نقش کاربری</Label>
                    <Input
                      id="role"
                      value={getRoleName(user?.role || "")}
                      disabled
                      className="bg-muted text-muted-foreground"
                      data-testid="input-role-disabled"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={updateProfileMutation.isPending}
                    data-testid="button-save-profile"
                  >
                    <Save className="w-4 h-4 ml-2" />
                    {updateProfileMutation.isPending ? "در حال ذخیره..." : "ذخیره تغییرات"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Subscription Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              اطلاعات اشتراک
            </CardTitle>
          </CardHeader>
          <CardContent>
            {subscriptionLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                <span className="mr-2">در حال بارگذاری...</span>
              </div>
            ) : userSubscription ? (
              <div className="space-y-4">
                {/* Subscription Status */}
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      userSubscription.status === 'active' && userSubscription.remainingDays > 0
                        ? 'bg-green-100 text-green-600' 
                        : 'bg-red-100 text-red-600'
                    }`}>
                      {userSubscription.status === 'active' && userSubscription.remainingDays > 0 ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <AlertCircle className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium" data-testid="text-subscription-status">
                        {userSubscription.status === 'active' && userSubscription.remainingDays > 0 
                          ? 'اشتراک فعال' 
                          : 'اشتراک غیرفعال'
                        }
                      </p>
                      <p className="text-sm text-muted-foreground">
                        وضعیت اشتراک شما
                      </p>
                    </div>
                  </div>
                  <Badge 
                    variant={userSubscription.status === 'active' && userSubscription.remainingDays > 0 ? "default" : "secondary"}
                    className={userSubscription.status === 'active' && userSubscription.remainingDays > 0 ? "bg-green-100 text-green-800 border-green-200" : ""}
                  >
                    {userSubscription.status === 'active' && userSubscription.remainingDays > 0 ? 'فعال' : 'غیرفعال'}
                  </Badge>
                </div>

                {/* Remaining Days */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-sm font-medium text-blue-900 dark:text-blue-300">روزهای باقیمانده</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400" data-testid="text-remaining-days">
                      {userSubscription.remainingDays || 0} روز
                    </p>
                    {userSubscription.remainingDays <= 7 && userSubscription.remainingDays > 0 && (
                      <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                        اشتراک شما به زودی به پایان می‌رسد
                      </p>
                    )}
                  </div>

                  <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      <span className="text-sm font-medium text-purple-900 dark:text-purple-300">تاریخ انقضا</span>
                    </div>
                    <p className="text-lg font-medium text-purple-600 dark:text-purple-400" data-testid="text-expiry-date">
                      {userSubscription.endDate 
                        ? new Date(userSubscription.endDate).toLocaleDateString('fa-IR')
                        : 'نامشخص'
                      }
                    </p>
                  </div>
                </div>

                {/* Trial Period Indicator */}
                {userSubscription.isTrialPeriod && (
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                      <span className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                        شما در دوره آزمایشی رایگان هستید
                      </span>
                    </div>
                  </div>
                )}

                {/* Subscription Dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
                  <div>
                    <Label className="text-xs text-muted-foreground">تاریخ شروع اشتراک</Label>
                    <p className="text-sm font-medium" data-testid="text-start-date">
                      {userSubscription.startDate 
                        ? new Date(userSubscription.startDate).toLocaleDateString('fa-IR')
                        : 'نامشخص'
                      }
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">وضعیت</Label>
                    <p className="text-sm font-medium" data-testid="text-subscription-detailed-status">
                      {userSubscription.status === 'active' 
                        ? 'فعال' 
                        : userSubscription.status === 'expired' 
                        ? 'منقضی شده' 
                        : 'غیرفعال'
                      }
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Crown className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2" data-testid="text-no-subscription">
                  اشتراک فعالی ندارید
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  برای استفاده از امکانات پیشرفته، یک اشتراک تهیه کنید
                </p>
                <Button variant="outline" size="sm">
                  مشاهده بسته‌های اشتراک
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
