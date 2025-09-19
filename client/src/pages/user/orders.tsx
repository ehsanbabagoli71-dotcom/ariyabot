import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Package, Calendar, MapPin, CreditCard, Clock, CheckCircle2, Truck, Package2, ShoppingBag } from "lucide-react";
import { type Order } from "@shared/schema";

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
  confirmed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
  preparing: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100",
  shipped: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100",
  delivered: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
};

const statusLabels = {
  pending: "در انتظار تایید",
  confirmed: "تایید شده", 
  preparing: "در حال آماده‌سازی",
  shipped: "ارسال شده", 
  delivered: "تحویل داده شده",
  cancelled: "لغو شده"
};

const statusIcons = {
  pending: Clock,
  confirmed: CheckCircle2,
  preparing: Package2,
  shipped: Truck,
  delivered: CheckCircle2,
  cancelled: Clock
};

export default function OrdersPage() {
  // Fetch orders
  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ['/api/orders']
  });

  const formatPrice = (price: number | string) => {
    return new Intl.NumberFormat('fa-IR').format(Number(price)) + ' تومان';
  };

  const handlePayment = (orderId: string) => {
    // TODO: Implement payment logic later
    console.log('Payment for order:', orderId);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          <div className="grid gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2" data-testid="heading-orders">
            سفارشات من
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            مدیریت و پیگیری سفارشات شما
          </p>
        </div>

        {/* Orders List */}
        <div className="space-y-6">
          {orders.length === 0 ? (
            <Card className="text-center py-16">
              <CardContent>
                <ShoppingBag className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  هنوز سفارشی ثبت نکرده‌اید
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  بعد از خرید محصولات، سفارشات شما اینجا نمایش داده خواهند شد
                </p>
                <Button 
                  onClick={() => window.location.href = '/'}
                  className="bg-blue-600 hover:bg-blue-700"
                  data-testid="button-start-shopping"
                >
                  شروع خرید
                </Button>
              </CardContent>
            </Card>
          ) : (
            orders.map((order) => {
              const StatusIcon = statusIcons[order.status as keyof typeof statusIcons];
              const canPay = order.status === 'pending' || order.status === 'confirmed';
              
              return (
                <Card key={order.id} className="overflow-hidden hover:shadow-lg transition-shadow" data-testid={`card-order-${order.id}`}>
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Package className="w-6 h-6 text-blue-600" />
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            سفارش #{order.orderNumber || order.id.slice(0, 8)}
                            <StatusIcon className="w-4 h-4" />
                          </CardTitle>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            {new Date(order.createdAt!).toLocaleDateString('fa-IR')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge 
                          className={statusColors[order.status as keyof typeof statusColors]}
                          data-testid={`status-${order.id}`}
                        >
                          {statusLabels[order.status as keyof typeof statusLabels]}
                        </Badge>
                        {canPay && (
                          <Button
                            size="sm"
                            onClick={() => handlePayment(order.id)}
                            className="bg-green-600 hover:bg-green-700 text-white"
                            data-testid={`button-pay-${order.id}`}
                          >
                            <CreditCard className="w-4 h-4 mr-2" />
                            پرداخت
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {/* Order Summary */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                          <Package2 className="w-4 h-4" />
                          خلاصه سفارش
                        </h4>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <span className="text-sm text-gray-600 dark:text-gray-400">مبلغ کل:</span>
                            <span className="font-bold text-lg text-green-600" data-testid={`amount-${order.id}`}>
                              {formatPrice(order.totalAmount)}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500 dark:text-gray-400">تاریخ ثبت:</span>
                            <span className="font-medium flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(order.createdAt!).toLocaleDateString('fa-IR')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Shipping Info */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          اطلاعات ارسال
                        </h4>
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <span data-testid={`address-${order.id}`}>
                              {order.addressId || 'آدرس تعیین نشده'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Order Actions */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                          عملیات
                        </h4>
                        <div className="space-y-2">
                          {canPay && (
                            <Button
                              onClick={() => handlePayment(order.id)}
                              className="w-full bg-green-600 hover:bg-green-700"
                              data-testid={`button-pay-full-${order.id}`}
                            >
                              <CreditCard className="w-4 h-4 mr-2" />
                              پرداخت سفارش
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => console.log('View details:', order.id)}
                            data-testid={`button-details-${order.id}`}
                          >
                            جزئیات سفارش
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Order Notes */}
                    {order.notes && (
                      <>
                        <Separator className="my-6" />
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                            توضیحات سفارش
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-300 bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg" data-testid={`notes-${order.id}`}>
                            {order.notes}
                          </p>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}