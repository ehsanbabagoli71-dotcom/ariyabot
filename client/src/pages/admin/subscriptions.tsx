import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Upload, Image as ImageIcon, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createAuthenticatedRequest } from "@/lib/auth";
import type { Subscription } from "@shared/schema";

export default function Subscriptions() {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    userLevel: "user_level_1",
    imageUrl: "",
    priceBeforeDiscount: "",
    priceAfterDiscount: "",
    duration: "monthly",
    features: [""],
    isActive: true,
  });
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: subscriptions = [], isLoading } = useQuery<Subscription[]>({
    queryKey: ["/api/subscriptions"],
    queryFn: async () => {
      const response = await createAuthenticatedRequest("/api/subscriptions");
      if (!response.ok) throw new Error("خطا در دریافت اشتراک‌ها");
      return response.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await createAuthenticatedRequest("/api/subscriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          userLevel: data.userLevel,
          image: data.imageUrl || null,
        }),
      });
      if (!response.ok) throw new Error("خطا در ایجاد اشتراک");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      setFormData({ 
        name: "", 
        description: "", 
        userLevel: "user_level_1", 
        imageUrl: "",
        priceBeforeDiscount: "",
        priceAfterDiscount: "",
        duration: "monthly",
        features: [""],
        isActive: true,
      });
      toast({
        title: "✅ موفقیت",
        description: "اشتراک با موفقیت ایجاد شد",
      });
    },
    onError: () => {
      toast({
        title: "❌ خطا",
        description: "خطا در ایجاد اشتراک",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await createAuthenticatedRequest(`/api/subscriptions/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          userLevel: data.userLevel,
          image: data.imageUrl || null,
        }),
      });
      if (!response.ok) throw new Error("خطا در بروزرسانی اشتراک");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      setIsEditDialogOpen(false);
      setEditingSubscription(null);
      toast({
        title: "✅ موفقیت",
        description: "اشتراک با موفقیت بروزرسانی شد",
      });
    },
    onError: () => {
      toast({
        title: "❌ خطا",
        description: "خطا در بروزرسانی اشتراک",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await createAuthenticatedRequest(`/api/subscriptions/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("خطا در حذف اشتراک");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      toast({
        title: "✅ موفقیت",
        description: "اشتراک با موفقیت حذف شد",
      });
    },
    onError: () => {
      toast({
        title: "❌ خطا",
        description: "خطا در حذف اشتراک",
        variant: "destructive",
      });
    },
  });



  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "❌ خطا",
        description: "نام اشتراک الزامی است",
        variant: "destructive",
      });
      return;
    }

    createMutation.mutate(formData);
  };

  const handleEdit = (subscription: Subscription) => {
    setEditingSubscription(subscription);
    setIsEditDialogOpen(true);
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubscription) return;

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const featuresValue = formData.get("features") as string;
    const data = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      userLevel: formData.get("userLevel") as string,
      imageUrl: formData.get("imageUrl") as string,
      priceBeforeDiscount: formData.get("priceBeforeDiscount") as string,
      priceAfterDiscount: formData.get("priceAfterDiscount") as string,
      duration: formData.get("duration") as string,
      features: featuresValue ? featuresValue.split(',').map(f => f.trim()).filter(f => f) : [],
      isActive: formData.get("isActive") === 'on',
    };

    updateMutation.mutate({ id: editingSubscription.id, data });
  };

  const handleDelete = (id: string) => {
    if (confirm("آیا از حذف این اشتراک اطمینان دارید؟")) {
      deleteMutation.mutate(id);
    }
  };

  const getUserLevelBadge = (userLevel: string) => {
    switch (userLevel) {
      case "user_level_1":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">کاربر سطح ۱</Badge>;
      case "user_level_2":
        return <Badge variant="outline" className="border-green-300 text-green-700">کاربر سطح ۲</Badge>;
      default:
        return <Badge variant="secondary">{userLevel}</Badge>;
    }
  };

  return (
    <DashboardLayout title="اشتراک‌ها">
      <div className="space-y-6">
        {/* Add Subscription Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Plus className="w-5 h-5 ml-2 text-primary" />
              افزودن اشتراک جدید
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="subscriptionName" className="text-sm font-medium">
                      نام اشتراک *
                    </Label>
                    <Input
                      id="subscriptionName"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="نام اشتراک را وارد کنید"
                      required
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="userLevel" className="text-sm font-medium">
                      سطح کاربری
                    </Label>
                    <Select
                      value={formData.userLevel}
                      onValueChange={(value) => setFormData({ ...formData, userLevel: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user_level_1">کاربر سطح ۱</SelectItem>
                        <SelectItem value="user_level_2">کاربر سطح ۲</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="description" className="text-sm font-medium">
                      توضیحات
                    </Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="توضیحات اشتراک را وارد کنید"
                      rows={3}
                      className="mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="priceBeforeDiscount" className="text-sm font-medium">
                        قیمت قبل تخفیف (تومان)
                      </Label>
                      <Input
                        id="priceBeforeDiscount"
                        type="number"
                        value={formData.priceBeforeDiscount}
                        onChange={(e) => setFormData({ ...formData, priceBeforeDiscount: e.target.value })}
                        placeholder="100000"
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="priceAfterDiscount" className="text-sm font-medium">
                        قیمت بعد تخفیف (تومان)
                      </Label>
                      <Input
                        id="priceAfterDiscount"
                        type="number"
                        value={formData.priceAfterDiscount}
                        onChange={(e) => setFormData({ ...formData, priceAfterDiscount: e.target.value })}
                        placeholder="80000"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="duration" className="text-sm font-medium">
                        مدت زمان اشتراک
                      </Label>
                      <Select
                        value={formData.duration}
                        onValueChange={(value) => setFormData({ ...formData, duration: value })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">ماهانه</SelectItem>
                          <SelectItem value="yearly">سالانه</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm font-medium flex items-center gap-2">
                        وضعیت فعال
                        <input
                          type="checkbox"
                          checked={formData.isActive}
                          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                          className="rounded"
                        />
                      </Label>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">
                      ویژگی‌ها و امکانات
                    </Label>
                    <div className="mt-2 space-y-2">
                      {formData.features.map((feature, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            value={feature}
                            onChange={(e) => {
                              const newFeatures = [...formData.features];
                              newFeatures[index] = e.target.value;
                              setFormData({ ...formData, features: newFeatures });
                            }}
                            placeholder={`ویژگی ${index + 1}`}
                          />
                          {formData.features.length > 1 && (
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                const newFeatures = formData.features.filter((_, i) => i !== index);
                                setFormData({ ...formData, features: newFeatures });
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setFormData({ ...formData, features: [...formData.features, ""] })}
                        className="mt-2"
                      >
                        <Plus className="h-4 w-4 ml-2" />
                        اضافه ویژگی
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="imageUrl" className="text-sm font-medium">
                      لینک تصویر اشتراک
                    </Label>
                    <Input
                      id="imageUrl"
                      type="url"
                      value={formData.imageUrl}
                      onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                      placeholder="https://example.com/image.jpg"
                      className="mt-1"
                    />
                    {formData.imageUrl && (
                      <div className="mt-2">
                        <img
                          src={formData.imageUrl}
                          alt="پیش‌نمایش"
                          className="w-full h-48 object-cover rounded-lg border"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending}
                  className="flex items-center gap-2"
                >
                  {createMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      در حال افزودن...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      افزودن اشتراک
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Subscriptions Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {subscriptions.length === 0 ? (
              <div className="col-span-full">
                <Card>
                  <CardContent className="p-8 text-center">
                    <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-muted-foreground mb-2">
                      هیچ اشتراکی موجود نیست
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      اولین اشتراک خود را ایجاد کنید
                    </p>
                  </CardContent>
                </Card>
              </div>
            ) : (
              subscriptions.map((subscription) => (
                <Card key={subscription.id} className="group hover:shadow-lg transition-all duration-200">
                  <CardContent className="p-0">
                    {subscription.image ? (
                      <div className="relative">
                        <img
                          src={subscription.image}
                          alt={subscription.name}
                          className="w-full h-48 object-cover rounded-t-lg"
                        />
                        <div className="absolute top-2 right-2">
                          {getUserLevelBadge(subscription.userLevel)}
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 rounded-t-lg flex items-center justify-center relative">
                        <ImageIcon className="h-16 w-16 text-gray-400" />
                        <div className="absolute top-2 right-2">
                          {getUserLevelBadge(subscription.userLevel)}
                        </div>
                      </div>
                    )}
                    
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                          {subscription.name}
                        </h3>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(subscription)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(subscription.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive/80"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {subscription.description || "توضیحاتی ارائه نشده است"}
                      </p>

                      {/* Price Display */}
                      <div className="flex items-center gap-2 mb-2">
                        {subscription.priceAfterDiscount ? (
                          <>
                            <span className="text-lg font-bold text-green-600">
                              {parseInt(subscription.priceAfterDiscount).toLocaleString('fa-IR')} تومان
                            </span>
                            <span className="text-sm line-through text-muted-foreground">
                              {parseInt(subscription.priceBeforeDiscount || '0').toLocaleString('fa-IR')} تومان
                            </span>
                          </>
                        ) : subscription.priceBeforeDiscount ? (
                          <span className="text-lg font-bold text-primary">
                            {parseInt(subscription.priceBeforeDiscount).toLocaleString('fa-IR')} تومان
                          </span>
                        ) : (
                          <span className="text-lg font-bold text-primary">رایگان</span>
                        )}
                        <Badge variant="secondary" className="text-xs">
                          {subscription.duration === 'monthly' ? 'ماهانه' : 'سالانه'}
                        </Badge>
                      </div>

                      {/* Features */}
                      {subscription.features && subscription.features.length > 0 && subscription.features[0] && (
                        <div className="mb-2">
                          <div className="text-xs text-muted-foreground mb-1">ویژگی‌ها:</div>
                          <div className="flex flex-wrap gap-1">
                            {subscription.features.slice(0, 3).map((feature: string, index: number) => (
                              feature && (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {feature}
                                </Badge>
                              )
                            ))}
                            {subscription.features.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{subscription.features.length - 3} مورد دیگر
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Status */}
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={subscription.isActive ? "default" : "secondary"}>
                          {subscription.isActive ? 'فعال' : 'غیرفعال'}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                        <span>
                          {subscription.createdAt ? 
                            new Date(subscription.createdAt).toLocaleDateString('fa-IR') : 
                            '-'
                          }
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Edit Subscription Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5" />
                ویرایش اشتراک
              </DialogTitle>
            </DialogHeader>
            
            {editingSubscription && (
              <form onSubmit={handleUpdateSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="editName" className="text-sm font-medium">
                        نام اشتراک *
                      </Label>
                      <Input
                        id="editName"
                        name="name"
                        defaultValue={editingSubscription.name}
                        required
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="editUserLevel" className="text-sm font-medium">
                        سطح کاربری
                      </Label>
                      <Select name="userLevel" defaultValue={editingSubscription.userLevel}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user_level_1">کاربر سطح ۱</SelectItem>
                          <SelectItem value="user_level_2">کاربر سطح ۲</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="editDescription" className="text-sm font-medium">
                        توضیحات
                      </Label>
                      <Textarea
                        id="editDescription"
                        name="description"
                        defaultValue={editingSubscription.description || ""}
                        rows={3}
                        className="mt-1"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="editPriceBeforeDiscount" className="text-sm font-medium">
                          قیمت قبل تخفیف (تومان)
                        </Label>
                        <Input
                          id="editPriceBeforeDiscount"
                          name="priceBeforeDiscount"
                          type="number"
                          defaultValue={editingSubscription.priceBeforeDiscount || ""}
                          className="mt-1"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="editPriceAfterDiscount" className="text-sm font-medium">
                          قیمت بعد تخفیف (تومان)
                        </Label>
                        <Input
                          id="editPriceAfterDiscount"
                          name="priceAfterDiscount"
                          type="number"
                          defaultValue={editingSubscription.priceAfterDiscount || ""}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="editDuration" className="text-sm font-medium">
                          مدت زمان اشتراک
                        </Label>
                        <Select name="duration" defaultValue={editingSubscription.duration || "monthly"}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="monthly">ماهانه</SelectItem>
                            <SelectItem value="yearly">سالانه</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-sm font-medium flex items-center gap-2">
                          وضعیت فعال
                          <input
                            type="checkbox"
                            name="isActive"
                            defaultChecked={editingSubscription.isActive !== false}
                            className="rounded"
                          />
                        </Label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="editImageUrl" className="text-sm font-medium">
                        لینک تصویر اشتراک
                      </Label>
                      <Input
                        id="editImageUrl"
                        name="imageUrl"
                        type="url"
                        defaultValue={editingSubscription.image || ""}
                        placeholder="https://example.com/image.jpg"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditDialogOpen(false)}
                  >
                    لغو
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateMutation.isPending}
                    className="flex items-center gap-2"
                  >
                    {updateMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        در حال ذخیره...
                      </>
                    ) : (
                      <>
                        <Edit className="h-4 w-4" />
                        ذخیره تغییرات
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}