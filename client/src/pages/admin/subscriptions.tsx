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
    image: null as File | null,
  });
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [editImage, setEditImage] = useState<File | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  
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
      const formDataToSend = new FormData();
      formDataToSend.append("name", data.name);
      formDataToSend.append("description", data.description);
      formDataToSend.append("userLevel", data.userLevel);
      if (data.image) {
        formDataToSend.append("subscriptionImage", data.image);
      }

      const response = await createAuthenticatedRequest("/api/subscriptions", {
        method: "POST",
        body: formDataToSend,
      });
      if (!response.ok) throw new Error("خطا در ایجاد اشتراک");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      setFormData({ name: "", description: "", userLevel: "user_level_1", image: null });
      setImagePreview(null);
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
      const formDataToSend = new FormData();
      formDataToSend.append("name", data.name);
      formDataToSend.append("description", data.description);
      formDataToSend.append("userLevel", data.userLevel);
      if (editImage) {
        formDataToSend.append("subscriptionImage", editImage);
      }

      const response = await createAuthenticatedRequest(`/api/subscriptions/${id}`, {
        method: "PUT",
        body: formDataToSend,
      });
      if (!response.ok) throw new Error("خطا در بروزرسانی اشتراک");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      setIsEditDialogOpen(false);
      setEditingSubscription(null);
      setEditImage(null);
      setEditImagePreview(null);
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "❌ خطا",
          description: "حجم فایل نباید بیشتر از ۵ مگابایت باشد",
          variant: "destructive",
        });
        return;
      }

      const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "❌ خطا",
          description: "فقط فایل‌های تصویری (JPG, PNG, GIF, WEBP) مجاز هستند",
          variant: "destructive",
        });
        return;
      }

      if (isEdit) {
        setEditImage(file);
        const reader = new FileReader();
        reader.onload = (e) => setEditImagePreview(e.target?.result as string);
        reader.readAsDataURL(file);
      } else {
        setFormData({ ...formData, image: file });
        const reader = new FileReader();
        reader.onload = (e) => setImagePreview(e.target?.result as string);
        reader.readAsDataURL(file);
      }
    }
  };

  const removeImage = (isEdit = false) => {
    if (isEdit) {
      setEditImage(null);
      setEditImagePreview(null);
    } else {
      setFormData({ ...formData, image: null });
      setImagePreview(null);
    }
  };

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
    setEditImagePreview(subscription.image || null);
    setIsEditDialogOpen(true);
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubscription) return;

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const data = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      userLevel: formData.get("userLevel") as string,
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
                      rows={4}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">تصویر اشتراک</Label>
                    <div className="mt-2">
                      {imagePreview ? (
                        <div className="relative">
                          <img
                            src={imagePreview}
                            alt="پیش‌نمایش"
                            className="w-full h-48 object-cover rounded-lg border-2 border-dashed border-gray-300"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 left-2"
                            onClick={() => removeImage()}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <label className="relative block border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors cursor-pointer">
                          <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                          <p className="mt-2 text-sm text-gray-600">
                            برای آپلود تصویر کلیک کنید
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            JPG, PNG, GIF, WEBP (حداکثر ۵MB)
                          </p>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageChange(e)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                        </label>
                      )}
                    </div>
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

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
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
                        rows={4}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">تصویر اشتراک</Label>
                      <div className="mt-2">
                        {editImagePreview ? (
                          <div className="relative">
                            <img
                              src={editImagePreview}
                              alt="پیش‌نمایش"
                              className="w-full h-48 object-cover rounded-lg border-2 border-dashed border-gray-300"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute top-2 left-2"
                              onClick={() => removeImage(true)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <label className="relative block border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors cursor-pointer">
                            <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                            <p className="mt-2 text-sm text-gray-600">
                              برای آپلود تصویر کلیک کنید
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              JPG, PNG, GIF, WEBP (حداکثر ۵MB)
                            </p>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageChange(e, true)}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                          </label>
                        )}
                      </div>
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