import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Package, Calendar, MapPin, User, Phone, Edit } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type Order } from "@shared/schema";

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
  preparing: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100",
  shipped: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100",
  delivered: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
};

const statusLabels = {
  pending: "در انتظار تایید",
  preparing: "در حال آماده‌سازی",
  shipped: "ارسال شده", 
  delivered: "تحویل داده شده",
  cancelled: "لغو شده"
};

const statusOptions = [
  { value: "pending", label: "در انتظار تایید" },
  { value: "preparing", label: "در حال آماده‌سازی" },
  { value: "shipped", label: "ارسال شده" },
  { value: "delivered", label: "تحویل داده شده" },
  { value: "cancelled", label: "لغو شده" }
];

export default function ReceivedOrdersPage() {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  
  // Fetch received orders (orders where current user is seller)
  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ['/api/orders/seller']
  });

  // Update order status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const response = await apiRequest('PUT', `/api/orders/${orderId}/status`, { status });
      return response.json();
    },
    onSuccess: () => {
      // Invalidate cache for both seller orders and customer orders
      queryClient.invalidateQueries({ queryKey: ['/api/orders/seller'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      setDialogOpen(false);
      setSelectedOrder(null);
      setNewStatus("");
      toast({
        title: "موفق",
        description: "وضعیت سفارش با موفقیت تغییر کرد"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطا",
        description: "خطا در تغییر وضعیت سفارش",
        variant: "destructive"
      });
    }
  });

  const handleStatusUpdate = () => {
    if (!selectedOrder || !newStatus) return;
    updateStatusMutation.mutate({ orderId: selectedOrder.id, status: newStatus });
  };

  const formatPrice = (price: number | string) => {
    return new Intl.NumberFormat('fa-IR').format(Number(price)) + ' تومان';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          <div className="grid gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100" data-testid="heading-received-orders">
            سفارشات دریافتی
          </h1>
          <div className="text-sm text-gray-600 dark:text-gray-300">
            مجموع: {orders.length} سفارش
          </div>
        </div>

        {/* Orders List */}
        <div className="grid gap-6">
          {orders.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Package className="w-16 h-16 text-gray-400 dark:text-gray-600 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  هنوز سفارشی دریافت نکرده‌اید
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-center">
                  سفارشات جدید اینجا نمایش داده خواهند شد
                </p>
              </CardContent>
            </Card>
          ) : (
            orders.map((order) => (
              <Card key={order.id} className="overflow-hidden" data-testid={`card-order-${order.id}`}>
                <CardHeader className="bg-gray-50 dark:bg-gray-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Package className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      <CardTitle className="text-lg">
                        سفارش #{order.orderNumber}
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge 
                        className={statusColors[order.status as keyof typeof statusColors]}
                        data-testid={`status-${order.id}`}
                      >
                        {statusLabels[order.status as keyof typeof statusLabels]}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedOrder(order);
                          setNewStatus(order.status);
                          setDialogOpen(true);
                        }}
                        data-testid={`button-edit-status-${order.id}`}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        تغییر وضعیت
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Order Details */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                        جزئیات سفارش
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400">مبلغ کل:</span>
                          <span className="font-medium" data-testid={`amount-${order.id}`}>
                            {formatPrice(order.totalAmount)}
                          </span>
                        </div>
                        {order.createdAt && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500 dark:text-gray-400">تاریخ ثبت:</span>
                            <span className="font-medium flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(order.createdAt).toLocaleDateString('fa-IR')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Customer Info */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                        اطلاعات مشتری
                      </h4>
                      <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          <span data-testid={`customer-${order.id}`}>
                            شناسه مشتری: {order.userId.slice(0, 8)}...
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Shipping Address */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                        آدرس تحویل
                      </h4>
                      <div className="text-sm text-gray-600 dark:text-gray-300 flex items-start gap-2">
                        <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span data-testid={`address-${order.id}`}>
                          {order.addressId || 'آدرس تعیین نشده'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  {order.notes && (
                    <div className="mt-6 pt-6 border-t">
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        توضیحات مشتری
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-3 rounded" data-testid={`notes-${order.id}`}>
                        {order.notes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Status Update Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>تغییر وضعیت سفارش</DialogTitle>
              <DialogDescription>
                وضعیت جدید سفارش #{selectedOrder?.orderNumber} را انتخاب کنید
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">وضعیت فعلی:</label>
                <div className="mt-1">
                  <Badge className={statusColors[selectedOrder?.status as keyof typeof statusColors]}>
                    {statusLabels[selectedOrder?.status as keyof typeof statusLabels]}
                  </Badge>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">وضعیت جدید:</label>
                <Select value={newStatus} onValueChange={setNewStatus} defaultValue={selectedOrder?.status}>
                  <SelectTrigger className="mt-1" data-testid="select-new-status">
                    <SelectValue placeholder="انتخاب وضعیت جدید" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  onClick={handleStatusUpdate}
                  disabled={!newStatus || newStatus === selectedOrder?.status || updateStatusMutation.isPending}
                  data-testid="button-update-status"
                >
                  {updateStatusMutation.isPending ? "در حال تغییر..." : "تغییر وضعیت"}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setDialogOpen(false);
                    setSelectedOrder(null);
                    setNewStatus("");
                  }}
                  data-testid="button-cancel-status"
                >
                  لغو
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}