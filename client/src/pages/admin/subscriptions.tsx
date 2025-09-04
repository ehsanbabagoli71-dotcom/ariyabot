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
import { Plus, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createAuthenticatedRequest } from "@/lib/auth";
import type { Subscription } from "@shared/schema";

export default function Subscriptions() {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    userLevel: "user_level_1",
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
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("خطا در ایجاد اشتراک");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      setFormData({ name: "", description: "", userLevel: "user_level_1" });
      toast({
        title: "موفقیت",
        description: "اشتراک با موفقیت ایجاد شد",
      });
    },
    onError: () => {
      toast({
        title: "خطا",
        description: "خطا در ایجاد اشتراک",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Subscription> }) => {
      const response = await createAuthenticatedRequest(`/api/subscriptions/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("خطا در بروزرسانی اشتراک");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      setIsEditDialogOpen(false);
      setEditingSubscription(null);
      toast({
        title: "موفقیت",
        description: "اشتراک با موفقیت بروزرسانی شد",
      });
    },
    onError: () => {
      toast({
        title: "خطا",
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
        title: "موفقیت",
        description: "اشتراک با موفقیت حذف شد",
      });
    },
    onError: () => {
      toast({
        title: "خطا",
        description: "خطا در حذف اشتراک",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "خطا",
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
        return <Badge variant="secondary">کاربر سطح ۱</Badge>;
      case "user_level_2":
        return <Badge variant="outline">کاربر سطح ۲</Badge>;
      default:
        return <Badge variant="secondary">{userLevel}</Badge>;
    }
  };

  return (
    <DashboardLayout title="اشتراک‌ها">
      <div className="space-y-6" data-testid="page-subscriptions">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">مدیریت اشتراک‌ها</h2>
            <p className="text-muted-foreground">ایجاد و مدیریت اشتراک‌های مختلف برای کاربران</p>
          </div>
        </div>

        {/* Add Subscription Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Plus className="w-5 h-5 ml-2" />
              افزودن اشتراک جدید
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4" data-testid="form-add-subscription">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="subscriptionName">نام اشتراک</Label>
                  <Input
                    id="subscriptionName"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="نام اشتراک را وارد کنید"
                    required
                    data-testid="input-subscription-name"
                  />
                </div>
                <div>
                  <Label htmlFor="userLevel">سطح کاربری</Label>
                  <Select
                    value={formData.userLevel}
                    onValueChange={(value) => setFormData({ ...formData, userLevel: value })}
                  >
                    <SelectTrigger data-testid="select-user-level">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user_level_1">کاربر سطح ۱</SelectItem>
                      <SelectItem value="user_level_2">کاربر سطح ۲</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={createMutation.isPending}
                    data-testid="button-add-subscription"
                  >
                    {createMutation.isPending ? "در حال افزودن..." : "افزودن"}
                  </Button>
                </div>
              </div>
              <div>
                <Label htmlFor="description">توضیحات</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="توضیحات اشتراک را وارد کنید"
                  rows={3}
                  data-testid="textarea-subscription-description"
                />
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Subscriptions Grid */}
        {isLoading ? (
          <div className="text-center py-8">در حال بارگذاری...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {subscriptions.length === 0 ? (
              <div className="col-span-2 text-center py-8 text-muted-foreground">
                هیچ اشتراکی یافت نشد
              </div>
            ) : (
              subscriptions.map((subscription) => (
                <Card key={subscription.id} className="hover-lift" data-testid={`card-subscription-${subscription.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg" data-testid={`text-subscription-name-${subscription.id}`}>
                          {subscription.name}
                        </CardTitle>
                        <div className="mt-2" data-testid={`badge-subscription-level-${subscription.id}`}>
                          {getUserLevelBadge(subscription.userLevel)}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(subscription)}
                          data-testid={`button-edit-subscription-${subscription.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(subscription.id)}
                          className="text-destructive hover:text-destructive/80"
                          data-testid={`button-delete-subscription-${subscription.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4" data-testid={`text-subscription-description-${subscription.id}`}>
                      {subscription.description || "توضیحاتی ارائه نشده است"}
                    </p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground" data-testid={`text-subscription-date-${subscription.id}`}>
                        تاریخ ایجاد: {subscription.createdAt ? new Date(subscription.createdAt).toLocaleDateString('fa-IR') : '-'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Edit Subscription Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent data-testid="dialog-edit-subscription">
            <DialogHeader>
              <DialogTitle>ویرایش اشتراک</DialogTitle>
            </DialogHeader>
            {editingSubscription && (
              <form onSubmit={handleUpdateSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="editName">نام اشتراک</Label>
                  <Input
                    id="editName"
                    name="name"
                    defaultValue={editingSubscription.name}
                    required
                    data-testid="input-edit-subscription-name"
                  />
                </div>
                <div>
                  <Label htmlFor="editUserLevel">سطح کاربری</Label>
                  <Select name="userLevel" defaultValue={editingSubscription.userLevel}>
                    <SelectTrigger data-testid="select-edit-user-level">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user_level_1">کاربر سطح ۱</SelectItem>
                      <SelectItem value="user_level_2">کاربر سطح ۲</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="editDescription">توضیحات</Label>
                  <Textarea
                    id="editDescription"
                    name="description"
                    defaultValue={editingSubscription.description || ""}
                    rows={3}
                    data-testid="textarea-edit-subscription-description"
                  />
                </div>
                <div className="flex justify-end space-x-2 space-x-reverse">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditDialogOpen(false)}
                    data-testid="button-cancel-edit-subscription"
                  >
                    لغو
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateMutation.isPending}
                    data-testid="button-save-subscription"
                  >
                    {updateMutation.isPending ? "در حال ذخیره..." : "ذخیره تغییرات"}
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
