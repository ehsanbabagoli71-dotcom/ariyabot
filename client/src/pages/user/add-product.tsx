import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, RotateCcw, CloudUpload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeaders } from "@/lib/auth";

export default function AddProduct() {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    quantity: "",
    priceBeforeDiscount: "",
    priceAfterDiscount: "",
  });
  const [productImage, setProductImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createProductMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const formDataToSend = new FormData();
      formDataToSend.append("name", data.name);
      formDataToSend.append("description", data.description);
      formDataToSend.append("quantity", data.quantity);
      formDataToSend.append("priceBeforeDiscount", data.priceBeforeDiscount);
      formDataToSend.append("priceAfterDiscount", data.priceAfterDiscount);

      if (productImage) {
        formDataToSend.append("productImage", productImage);
      }

      const authHeaders = getAuthHeaders();
      const headers: Record<string, string> = {};
      if (authHeaders.Authorization) {
        headers.Authorization = authHeaders.Authorization;
      }
      
      const response = await fetch("/api/products", {
        method: "POST",
        headers,
        body: formDataToSend,
      });

      if (!response.ok) throw new Error("خطا در ایجاد محصول");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      handleReset();
      toast({
        title: "موفقیت",
        description: "محصول با موفقیت اضافه شد",
      });
    },
    onError: () => {
      toast({
        title: "خطا",
        description: "خطا در ایجاد محصول",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.quantity || !formData.priceBeforeDiscount) {
      toast({
        title: "خطا",
        description: "لطفاً تمام فیلدهای الزامی را پر کنید",
        variant: "destructive",
      });
      return;
    }

    const quantity = parseInt(formData.quantity);
    const priceBeforeDiscount = parseFloat(formData.priceBeforeDiscount);
    const priceAfterDiscount = formData.priceAfterDiscount ? parseFloat(formData.priceAfterDiscount) : 0;

    if (quantity < 0) {
      toast({
        title: "خطا",
        description: "تعداد نمی‌تواند منفی باشد",
        variant: "destructive",
      });
      return;
    }

    if (priceBeforeDiscount <= 0) {
      toast({
        title: "خطا",
        description: "قیمت باید بیشتر از صفر باشد",
        variant: "destructive",
      });
      return;
    }

    if (priceAfterDiscount && priceAfterDiscount >= priceBeforeDiscount) {
      toast({
        title: "خطا",
        description: "قیمت تخفیف‌دار باید کمتر از قیمت اصلی باشد",
        variant: "destructive",
      });
      return;
    }

    createProductMutation.mutate(formData);
  };

  const handleReset = () => {
    setFormData({
      name: "",
      description: "",
      quantity: "",
      priceBeforeDiscount: "",
      priceAfterDiscount: "",
    });
    setProductImage(null);
    setImagePreview("");
    // Reset file input
    const fileInput = document.getElementById("productImage") as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "خطا",
        description: "لطفاً یک فایل تصویری انتخاب کنید",
        variant: "destructive",
      });
      e.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB
      toast({
        title: "خطا",
        description: "حجم تصویر نباید بیش از ۵ مگابایت باشد",
        variant: "destructive",
      });
      e.target.value = "";
      return;
    }

    setProductImage(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <DashboardLayout title="افزودن محصول">
      <div className="space-y-6" data-testid="page-add-product">
        <div>
          <h2 className="text-2xl font-bold text-foreground">افزودن محصول جدید</h2>
          <p className="text-muted-foreground">اطلاعات محصول جدید خود را وارد کنید</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Plus className="w-5 h-5 ml-2" />
              محصول جدید
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6" data-testid="form-add-product">
              {/* Product Image Upload */}
              <div>
                <Label htmlFor="productImage">عکس محصول</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                  {imagePreview ? (
                    <div className="space-y-4">
                      <img
                        src={imagePreview}
                        alt="پیش‌نمایش محصول"
                        className="max-w-xs max-h-48 mx-auto rounded-lg object-cover"
                        data-testid="img-product-preview"
                      />
                      <p className="text-sm text-muted-foreground">تصویر انتخاب شده</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <CloudUpload className="w-12 h-12 text-muted-foreground mx-auto" />
                      <p className="text-muted-foreground">تصویر محصول را اینجا بکشید یا کلیک کنید</p>
                    </div>
                  )}
                  <input
                    type="file"
                    id="productImage"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    data-testid="input-product-image"
                  />
                  <Label
                    htmlFor="productImage"
                    className="inline-block mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors cursor-pointer"
                    data-testid="button-select-image"
                  >
                    انتخاب فایل
                  </Label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="productName">نام محصول *</Label>
                  <Input
                    id="productName"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="نام محصول را وارد کنید"
                    required
                    data-testid="input-product-name"
                  />
                </div>

                <div>
                  <Label htmlFor="quantity">تعداد *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    placeholder="تعداد موجودی"
                    min="0"
                    required
                    data-testid="input-product-quantity"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="priceBeforeDiscount">قیمت قبل تخفیف (تومان) *</Label>
                  <Input
                    id="priceBeforeDiscount"
                    type="number"
                    value={formData.priceBeforeDiscount}
                    onChange={(e) => setFormData({ ...formData, priceBeforeDiscount: e.target.value })}
                    placeholder="۰"
                    min="0"
                    step="0.01"
                    required
                    data-testid="input-price-before-discount"
                  />
                </div>

                <div>
                  <Label htmlFor="priceAfterDiscount">قیمت بعد تخفیف (تومان)</Label>
                  <Input
                    id="priceAfterDiscount"
                    type="number"
                    value={formData.priceAfterDiscount}
                    onChange={(e) => setFormData({ ...formData, priceAfterDiscount: e.target.value })}
                    placeholder="۰"
                    min="0"
                    step="0.01"
                    data-testid="input-price-after-discount"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">توضیحات</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="توضیحات کامل محصول را وارد کنید"
                  rows={4}
                  data-testid="textarea-product-description"
                />
              </div>

              <div className="flex items-center space-x-4 space-x-reverse">
                <Button
                  type="submit"
                  disabled={createProductMutation.isPending}
                  data-testid="button-add-product"
                >
                  <Plus className="w-4 h-4 ml-2" />
                  {createProductMutation.isPending ? "در حال افزودن..." : "افزودن محصول"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReset}
                  data-testid="button-reset-product-form"
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
