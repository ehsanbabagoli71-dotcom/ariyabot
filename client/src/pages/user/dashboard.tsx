import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, Calendar, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import type { UserSubscription } from "@shared/schema";

// Extended subscription type with subscription details
interface UserSubscriptionWithDetails extends UserSubscription {
  subscriptionName?: string | null;
  subscriptionDescription?: string | null;
}

export default function UserDashboard() {
  const { user } = useAuth();

  // Get user's subscription info
  const { data: userSubscription, isLoading: subscriptionLoading } = useQuery<UserSubscriptionWithDetails | null>({
    queryKey: ["/api/user-subscriptions/me"],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return null;
      
      const token = localStorage.getItem("token");
      if (!token) return null;
      
      const response = await fetch("/api/user-subscriptions/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          return null;
        }
        throw new Error(`Failed to fetch subscription: ${response.statusText}`);
      }
      
      return response.json();
    },
  });

  return (
    <DashboardLayout title="پیشخوان">
      <div className="space-y-6" data-testid="dashboard-content">

        {/* Subscription Information */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border-blue-200 dark:border-blue-800">
          <CardHeader className="text-center pb-3">
            <CardTitle className="flex items-center justify-center gap-2 text-lg text-blue-900 dark:text-blue-300">
              <Crown className="h-5 w-5" />
              اطلاعات اشتراک
            </CardTitle>
          </CardHeader>
          <CardContent>
            {subscriptionLoading ? (
              <div className="text-center py-4">
                <div className="text-sm text-muted-foreground">در حال بارگذاری...</div>
              </div>
            ) : userSubscription ? (
              <div className="space-y-4">
                {/* Subscription Status */}
                <div className="flex items-center justify-center gap-2 mb-4">
                  {userSubscription.status === 'active' && userSubscription.remainingDays > 0 ? (
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  )}
                  <Badge 
                    variant={userSubscription.status === 'active' && userSubscription.remainingDays > 0 ? "default" : "destructive"}
                    data-testid="badge-subscription-status"
                  >
                    {userSubscription.status === 'active' && userSubscription.remainingDays > 0 ? 'فعال' : 'غیرفعال'}
                  </Badge>
                </div>

                {/* Subscription Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 mb-1">
                      <Crown className="h-3 w-3 text-green-600 dark:text-green-400" />
                      <span className="text-xs font-medium text-green-900 dark:text-green-300">نوع اشتراک</span>
                    </div>
                    <p className="text-sm font-bold text-green-600 dark:text-green-400" data-testid="text-subscription-name">
                      {userSubscription.subscriptionName || 'نامشخص'}
                    </p>
                    {userSubscription.isTrialPeriod && (
                      <Badge variant="secondary" className="text-xs mt-1">آزمایشی</Badge>
                    )}
                  </div>

                  <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                      <span className="text-xs font-medium text-blue-900 dark:text-blue-300">روزهای باقیمانده</span>
                    </div>
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400" data-testid="text-remaining-days">
                      {userSubscription.remainingDays || 0} روز
                    </p>
                    {userSubscription.remainingDays <= 7 && userSubscription.remainingDays > 0 && (
                      <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                        اشتراک به زودی به پایان می‌رسد
                      </p>
                    )}
                  </div>

                  <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                      <span className="text-xs font-medium text-purple-900 dark:text-purple-300">تاریخ انقضا</span>
                    </div>
                    <p className="text-sm font-medium text-purple-600 dark:text-purple-400" data-testid="text-expiry-date">
                      {userSubscription.endDate 
                        ? new Date(userSubscription.endDate).toLocaleDateString('fa-IR')
                        : 'نامشخص'
                      }
                    </p>
                  </div>
                </div>

                {/* Trial Period Indicator */}
                {userSubscription.isTrialPeriod && (
                  <div className="p-2 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                      <span className="text-xs text-yellow-800 dark:text-yellow-300">
                        شما در حال استفاده از دوره آزمایشی هستید
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">اطلاعات اشتراک یافت نشد</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="text-center">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-primary mb-1">0</div>
              <div className="text-sm text-muted-foreground">تیکت‌های باز</div>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600 mb-1">0</div>
              <div className="text-sm text-muted-foreground">محصولات فعال</div>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-600 mb-1">0</div>
              <div className="text-sm text-muted-foreground">پیام‌های ارسالی</div>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-600 mb-1">
                {userSubscription?.remainingDays || 0}
              </div>
              <div className="text-sm text-muted-foreground">روز باقیمانده</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}