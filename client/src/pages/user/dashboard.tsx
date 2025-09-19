import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, Calendar, Clock, CheckCircle, AlertCircle, MessageSquare, Package, Send, User } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { createAuthenticatedRequest } from "@/lib/auth";
import type { UserSubscription, Ticket, Product, SentMessage } from "@shared/schema";

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

  // Get user's tickets
  const { data: tickets = [], isLoading: ticketsLoading } = useQuery<Ticket[]>({
    queryKey: ["/api/tickets"],
    enabled: !!user,
    queryFn: async () => {
      const response = await createAuthenticatedRequest("/api/tickets");
      if (!response.ok) {
        if (response.status === 401) return [];
        throw new Error("خطا در دریافت تیکت‌ها");
      }
      return response.json();
    },
  });

  // Get user's products
  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    enabled: !!user,
    queryFn: async () => {
      const response = await createAuthenticatedRequest("/api/products");
      if (!response.ok) {
        if (response.status === 401) return [];
        throw new Error("خطا در دریافت محصولات");
      }
      return response.json();
    },
  });

  // Get user's sent messages
  const { data: sentMessages = [], isLoading: messagesLoading } = useQuery<SentMessage[]>({
    queryKey: ["/api/sent-messages"],
    enabled: !!user,
    queryFn: async () => {
      // Assuming we have an API for sent messages, if not we'll return empty for now
      try {
        const response = await createAuthenticatedRequest("/api/sent-messages");
        if (!response.ok) return [];
        return response.json();
      } catch {
        return [];
      }
    },
  });

  // Calculate stats
  const openTickets = tickets.filter(ticket => ticket.status !== "closed").length;
  const activeProducts = products.filter(product => product.isActive).length;
  const totalSentMessages = sentMessages.length;

  return (
    <DashboardLayout title="پیشخوان">
      <div className="space-y-4" data-testid="dashboard-content">

        {/* Subscription Information - Hidden for user_level_2 */}
        {user?.role !== "user_level_2" && (
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border-blue-200 dark:border-blue-800">
            <CardHeader className="text-center pb-2">
              <CardTitle className="flex items-center justify-center gap-2 text-sm text-blue-900 dark:text-blue-300">
                <Crown className="h-4 w-4" />
                اطلاعات اشتراک
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {subscriptionLoading ? (
                <div className="text-center py-2">
                  <div className="text-xs text-muted-foreground">در حال بارگذاری...</div>
                </div>
              ) : userSubscription ? (
                <div className="space-y-2">
                  {/* Subscription Status */}
                  <div className="flex items-center justify-center gap-2 mb-2">
                    {userSubscription.status === 'active' && userSubscription.remainingDays > 0 ? (
                      <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    )}
                    <Badge 
                      variant={userSubscription.status === 'active' && userSubscription.remainingDays > 0 ? "default" : "destructive"}
                      data-testid="badge-subscription-status"
                      className="text-xs"
                    >
                      {userSubscription.status === 'active' && userSubscription.remainingDays > 0 ? 'فعال' : 'غیرفعال'}
                    </Badge>
                  </div>

                  {/* Subscription Details */}
                  <div className="flex items-center justify-between p-2 bg-white dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Crown className="h-3 w-3 text-green-600 dark:text-green-400" />
                        <span className="text-xs text-green-700 dark:text-green-300" data-testid="text-subscription-name">
                          {userSubscription.subscriptionName || 'نامشخص'}
                        </span>
                        {userSubscription.isTrialPeriod && (
                          <Badge variant="secondary" className="text-[10px] px-1 py-0 ml-1">آزمایشی</Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                        <span className="text-xs font-medium text-blue-700 dark:text-blue-300" data-testid="text-remaining-days">
                          {userSubscription.remainingDays || 0} روز باقیمانده
                        </span>
                      </div>
                    </div>
                    
                    {userSubscription.remainingDays <= 7 && userSubscription.remainingDays > 0 && (
                      <Badge variant="destructive" className="text-[10px]">
                        نزدیک به انقضا
                      </Badge>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-2">
                  <AlertCircle className="h-5 w-5 text-gray-400 mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">اطلاعات اشتراک یافت نشد</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Quick Stats - Hidden for user_level_2 */}
        {user?.role !== "user_level_2" && (
          <div className="grid grid-cols-2 gap-3">
            <Card className="text-center hover:shadow-md transition-shadow border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20">
              <CardContent className="p-3">
                <div className="flex items-center justify-center mb-1">
                  <MessageSquare className="w-4 h-4 text-blue-600 ml-1" />
                  <span className="text-xs text-blue-700 dark:text-blue-300 font-medium">تیکت‌های باز</span>
                </div>
                <div className="text-xl font-bold text-blue-600 mb-1" data-testid="stat-open-tickets">
                  {ticketsLoading ? "..." : openTickets}
                </div>
                {openTickets > 0 && (
                  <Badge variant="secondary" className="text-xs bg-blue-200 text-blue-800">
                    {openTickets === 1 ? "نیاز به بررسی" : `${openTickets} فعال`}
                  </Badge>
                )}
              </CardContent>
            </Card>
            
            <Card className="text-center hover:shadow-md transition-shadow border-green-200 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20">
              <CardContent className="p-3">
                <div className="flex items-center justify-center mb-1">
                  <Package className="w-4 h-4 text-green-600 ml-1" />
                  <span className="text-xs text-green-700 dark:text-green-300 font-medium">محصولات فعال</span>
                </div>
                <div className="text-xl font-bold text-green-600 mb-1" data-testid="stat-active-products">
                  {productsLoading ? "..." : activeProducts}
                </div>
                {activeProducts > 0 && (
                  <Badge variant="secondary" className="text-xs bg-green-200 text-green-800">
                    از {products.length} محصول
                  </Badge>
                )}
              </CardContent>
            </Card>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}