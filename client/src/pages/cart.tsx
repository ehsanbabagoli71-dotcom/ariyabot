import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ShoppingCart, Plus, Minus, Trash2, Package, MapPin } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { CartItem, Product, Address } from "@shared/schema";

// Extended cart item with product details
interface CartItemWithProduct extends CartItem {
  productName: string;
  productDescription?: string;
  productImage?: string;
}

export default function Cart() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);
  const [newAddress, setNewAddress] = useState({
    title: "",
    fullName: "",
    phoneNumber: "",
    province: "",
    city: "",
    postalCode: "",
    addressLine: ""
  });

  // Get user's cart items
  const { data: cartItems = [], isLoading: cartLoading } = useQuery<CartItemWithProduct[]>({
    queryKey: ["/api/cart"],
    enabled: !!user,
  });

  // Get user's addresses
  const { data: addresses = [] } = useQuery<Address[]>({
    queryKey: ["/api/addresses"],
    enabled: !!user,
  });

  // Calculate total
  const totalAmount = cartItems.reduce((sum, item) => sum + parseFloat(item.totalPrice), 0);
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // Add new address mutation
  const addAddressMutation = useMutation({
    mutationFn: async (addressData: typeof newAddress) => {
      const response = await apiRequest("POST", "/api/addresses", addressData);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "خطا در ثبت آدرس");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/addresses"] });
      setSelectedAddressId(data.id);
      setIsAddressDialogOpen(false);
      setNewAddress({
        title: "",
        fullName: "",
        phoneNumber: "",
        province: "",
        city: "",
        postalCode: "",
        addressLine: ""
      });
      toast({
        title: "موفقیت",
        description: "آدرس جدید با موفقیت اضافه شد",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطا",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update cart item quantity
  const updateQuantityMutation = useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: string; quantity: number }) => {
      if (quantity < 1) {
        throw new Error("تعداد باید بیشتر از صفر باشد");
      }
      const response = await apiRequest("PATCH", `/api/cart/items/${itemId}`, { quantity });
      if (!response.ok) {
        throw new Error("خطا در بروزرسانی تعداد");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      toast({
        title: "موفقیت",
        description: "تعداد محصول بروزرسانی شد",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطا",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Remove item from cart
  const removeItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const response = await apiRequest("DELETE", `/api/cart/items/${itemId}`);
      if (!response.ok) {
        throw new Error("خطا در حذف محصول از سبد");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      toast({
        title: "موفقیت",
        description: "محصول از سبد خرید حذف شد",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطا",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Clear entire cart
  const clearCartMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", "/api/cart/clear");
      if (!response.ok) {
        throw new Error("خطا در پاک کردن سبد");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      toast({
        title: "موفقیت", 
        description: "سبد خرید پاک شد",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطا",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    if (newQuantity >= 1) {
      updateQuantityMutation.mutate({ itemId, quantity: newQuantity });
    }
  };

  const handleRemoveItem = (itemId: string) => {
    removeItemMutation.mutate(itemId);
  };

  const handleClearCart = () => {
    if (cartItems.length > 0) {
      clearCartMutation.mutate();
    }
  };

  // Proceed to checkout mutation
  const proceedToCheckoutMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAddressId) {
        throw new Error("لطفاً آدرس تحویل را انتخاب کنید");
      }
      const response = await apiRequest("POST", "/api/orders", {
        addressId: selectedAddressId
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "خطا در ثبت سفارش");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: "موفقیت",
        description: "سفارش شما با موفقیت ثبت شد و در لیست سفارشات شما قرار گرفت",
      });
      // Redirect to orders page
      setLocation('/orders');
    },
    onError: (error: Error) => {
      toast({
        title: "خطا",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleProceedToCheckout = () => {
    if (cartItems.length > 0) {
      proceedToCheckoutMutation.mutate();
    }
  };

  const handleAddNewAddress = () => {
    if (newAddress.title && newAddress.fullName && newAddress.phoneNumber && 
        newAddress.province && newAddress.city && newAddress.postalCode && newAddress.addressLine) {
      addAddressMutation.mutate(newAddress);
    } else {
      toast({
        title: "خطا",
        description: "لطفاً تمام فیلدها را پر کنید",
        variant: "destructive",
      });
    }
  };

  if (cartLoading) {
    return (
      <DashboardLayout title="سبد خرید">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">در حال بارگذاری...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="سبد خرید">
      <div className="space-y-6" data-testid="cart-content">
        {/* Cart Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShoppingCart className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">سبد خرید شما</h1>
              <p className="text-muted-foreground">
                {totalItems} محصول در سبد خرید
              </p>
            </div>
          </div>
          {cartItems.length > 0 && (
            <Button
              variant="outline"
              onClick={handleClearCart}
              disabled={clearCartMutation.isPending}
              data-testid="button-clear-cart"
            >
              <Trash2 className="h-4 w-4 ml-2" />
              پاک کردن سبد
            </Button>
          )}
        </div>

        {cartItems.length === 0 ? (
          // Empty Cart State
          <Card className="text-center py-12">
            <CardContent>
              <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">سبد خرید شما خالی است</h3>
              <p className="text-muted-foreground mb-4">
                هنوز محصولی به سبد خرید خود اضافه نکرده‌اید
              </p>
              <Link href="/products">
                <Button variant="default" data-testid="button-start-shopping">
                  شروع خرید
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => (
                <Card key={item.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Product Image */}
                      <div className="flex-shrink-0">
                        {item.productImage ? (
                          <img
                            src={item.productImage}
                            alt={item.productName}
                            className="w-16 h-16 object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                            <Package className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg mb-1" data-testid={`text-product-name-${item.id}`}>
                          {item.productName}
                        </h3>
                        {item.productDescription && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {item.productDescription}
                          </p>
                        )}
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            قیمت واحد: {parseFloat(item.unitPrice).toLocaleString()} تومان
                          </Badge>
                        </div>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                          disabled={updateQuantityMutation.isPending || item.quantity <= 1}
                          data-testid={`button-decrease-${item.id}`}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => {
                            const newQuantity = parseInt(e.target.value) || 1;
                            handleQuantityChange(item.id, newQuantity);
                          }}
                          className="w-16 text-center"
                          min="1"
                          data-testid={`input-quantity-${item.id}`}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                          disabled={updateQuantityMutation.isPending}
                          data-testid={`button-increase-${item.id}`}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Price and Remove */}
                      <div className="text-left">
                        <p className="font-bold text-lg" data-testid={`text-total-price-${item.id}`}>
                          {parseFloat(item.totalPrice).toLocaleString()} تومان
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveItem(item.id)}
                          disabled={removeItemMutation.isPending}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 mt-1"
                          data-testid={`button-remove-${item.id}`}
                        >
                          <Trash2 className="h-4 w-4 ml-1" />
                          حذف
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Address Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  آدرس تحویل
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {addresses.length > 0 ? (
                  <div className="space-y-3">
                    <Label>انتخاب آدرس:</Label>
                    <Select value={selectedAddressId} onValueChange={setSelectedAddressId}>
                      <SelectTrigger data-testid="select-address">
                        <SelectValue placeholder="آدرس تحویل را انتخاب کنید" />
                      </SelectTrigger>
                      <SelectContent>
                        {addresses.map((address) => (
                          <SelectItem key={address.id} value={address.id}>
                            {address.title} - {address.city}, {address.province}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    هیچ آدرسی ثبت نشده است. لطفاً آدرس جدید اضافه کنید.
                  </p>
                )}
                
                <Dialog open={isAddressDialogOpen} onOpenChange={setIsAddressDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full" data-testid="button-add-address">
                      <Plus className="h-4 w-4 ml-2" />
                      اضافه کردن آدرس جدید
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>اضافه کردن آدرس جدید</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="title">عنوان آدرس</Label>
                        <Input
                          id="title"
                          placeholder="مثال: منزل، محل کار"
                          value={newAddress.title}
                          onChange={(e) => setNewAddress({...newAddress, title: e.target.value})}
                          data-testid="input-address-title"
                        />
                      </div>
                      <div>
                        <Label htmlFor="fullName">نام و نام خانوادگی</Label>
                        <Input
                          id="fullName"
                          placeholder="نام کامل گیرنده"
                          value={newAddress.fullName}
                          onChange={(e) => setNewAddress({...newAddress, fullName: e.target.value})}
                          data-testid="input-full-name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="phoneNumber">شماره تماس</Label>
                        <Input
                          id="phoneNumber"
                          placeholder="09123456789"
                          value={newAddress.phoneNumber}
                          onChange={(e) => setNewAddress({...newAddress, phoneNumber: e.target.value})}
                          data-testid="input-phone-number"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label htmlFor="province">استان</Label>
                          <Input
                            id="province"
                            placeholder="استان"
                            value={newAddress.province}
                            onChange={(e) => setNewAddress({...newAddress, province: e.target.value})}
                            data-testid="input-province"
                          />
                        </div>
                        <div>
                          <Label htmlFor="city">شهر</Label>
                          <Input
                            id="city"
                            placeholder="شهر"
                            value={newAddress.city}
                            onChange={(e) => setNewAddress({...newAddress, city: e.target.value})}
                            data-testid="input-city"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="postalCode">کد پستی</Label>
                        <Input
                          id="postalCode"
                          placeholder="1234567890"
                          value={newAddress.postalCode}
                          onChange={(e) => setNewAddress({...newAddress, postalCode: e.target.value})}
                          data-testid="input-postal-code"
                        />
                      </div>
                      <div>
                        <Label htmlFor="addressLine">آدرس کامل</Label>
                        <Textarea
                          id="addressLine"
                          placeholder="آدرس کامل..."
                          value={newAddress.addressLine}
                          onChange={(e) => setNewAddress({...newAddress, addressLine: e.target.value})}
                          data-testid="textarea-address-line"
                        />
                      </div>
                      <Button 
                        onClick={handleAddNewAddress} 
                        disabled={addAddressMutation.isPending}
                        className="w-full"
                        data-testid="button-save-address"
                      >
                        {addAddressMutation.isPending ? "در حال ذخیره..." : "ذخیره آدرس"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>

            {/* Cart Summary */}
            <div className="lg:col-span-1">
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    خلاصه سفارش
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>تعداد محصولات:</span>
                      <span data-testid="text-total-items">{totalItems}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-lg border-t pt-2">
                      <span>مجموع کل:</span>
                      <span data-testid="text-total-amount">
                        {totalAmount.toLocaleString()} تومان
                      </span>
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={handleProceedToCheckout}
                    disabled={proceedToCheckoutMutation.isPending}
                    data-testid="button-proceed-checkout"
                  >
                    {proceedToCheckoutMutation.isPending ? "در حال پردازش..." : "ادامه خرید"}
                  </Button>
                  
                  <p className="text-xs text-muted-foreground text-center">
                    با ادامه خرید، شرایط و قوانین را می‌پذیرید
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}