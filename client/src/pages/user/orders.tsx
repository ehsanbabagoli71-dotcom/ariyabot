import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Package, Calendar, MapPin } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertOrderSchema, type Order, type Address } from "@shared/schema";

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

export default function OrdersPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Fetch orders
  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ['/api/orders']
  });

  // Fetch addresses for order form
  const { data: addresses = [] } = useQuery<Address[]>({
    queryKey: ['/api/addresses']
  });

  // Create order form
  const form = useForm({
    resolver: zodResolver(insertOrderSchema.extend({
      notes: insertOrderSchema.shape.notes.optional()
    })),
    defaultValues: {
      totalAmount: "0",
      status: "pending" as const,
      addressId: "",
      notes: ""
    }
  });

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('/api/orders', 'POST', data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      setDialogOpen(false);
      form.reset();
      toast({
        title: "موفق",
        description: "سفارش با موفقیت ایجاد شد"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطا",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: any) => {
    createOrderMutation.mutate(data);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fa-IR').format(price) + ' تومان';
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100" data-testid="heading-orders">
            سفارشات من
          </h1>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" data-testid="button-create-order">
                <Plus className="w-4 h-4" />
                سفارش جدید
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>ایجاد سفارش جدید</DialogTitle>
                <DialogDescription>
                  اطلاعات سفارش خود را وارد کنید
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="totalAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>مبلغ کل (تومان)</FormLabel>
                        <FormControl>
                          <input 
                            type="number"
                            min="0"
                            step="1000"
                            {...field}
                            value={field.value || ""}
                            onChange={e => field.onChange(String(e.target.value))}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="۰"
                            data-testid="input-total-amount"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="addressId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>آدرس ارسال</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-address">
                              <SelectValue placeholder="انتخاب آدرس ارسال" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {addresses.map(address => (
                              <SelectItem key={address.id} value={address.id}>
                                {address.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>توضیحات (اختیاری)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="توضیحات اضافی برای سفارش..."
                            className="resize-none"
                            {...field}
                            value={field.value ?? ""}
                            data-testid="textarea-notes"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-3 pt-4">
                    <Button 
                      type="submit" 
                      disabled={createOrderMutation.isPending}
                      data-testid="button-submit-order"
                    >
                      {createOrderMutation.isPending ? "در حال ایجاد..." : "ایجاد سفارش"}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setDialogOpen(false)}
                      data-testid="button-cancel-order"
                    >
                      لغو
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Orders List */}
        <div className="grid gap-6">
          {orders.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Package className="w-16 h-16 text-gray-400 dark:text-gray-600 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  هنوز سفارشی ثبت نکرده‌اید
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-center mb-6">
                  اولین سفارش خود را ایجاد کنید
                </p>
                <Button onClick={() => setDialogOpen(true)} data-testid="button-first-order">
                  <Plus className="w-4 h-4 mr-2" />
                  ایجاد سفارش
                </Button>
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
                        سفارش #{order.id.slice(0, 6)}
                      </CardTitle>
                    </div>
                    <Badge 
                      className={statusColors[order.status as keyof typeof statusColors]}
                      data-testid={`status-${order.id}`}
                    >
                      {statusLabels[order.status as keyof typeof statusLabels]}
                    </Badge>
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
                            {formatPrice(Number(order.totalAmount))}
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

                    {/* Shipping Info */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                        آدرس ارسال
                      </h4>
                      <div className="text-sm text-gray-600 dark:text-gray-300 flex items-start gap-2">
                        <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span data-testid={`address-${order.id}`}>
                          {order.addressId || 'آدرس تعیین نشده'}
                        </span>
                      </div>
                    </div>

                    {/* Notes */}
                    {order.notes && (
                      <div className="space-y-3">
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                          توضیحات
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300" data-testid={`notes-${order.id}`}>
                          {order.notes}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}