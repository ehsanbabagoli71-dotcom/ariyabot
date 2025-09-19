import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, Edit, Trash2, Users, Eye, EyeOff, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createAuthenticatedRequest } from "@/lib/auth";
import { insertUserSchema, insertSubUserSchema } from "@shared/schema";
import type { User as UserType } from "@shared/schema";
import { z } from "zod";

// Extended user type to include subscription information
interface UserWithSubscription extends UserType {
  subscription?: {
    name: string;
    remainingDays: number;
    status: string;
    isTrialPeriod: boolean;
  } | null;
}

// Form schema for creating sub-users (level 2)
const createSubUserSchema = insertSubUserSchema.extend({
  password: z.string().min(6, "رمز عبور باید حداقل ۶ کاراکتر باشد"),
});

export default function SubUserManagement() {
  const [search, setSearch] = useState("");
  const [editingUser, setEditingUser] = useState<UserWithSubscription | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState<UserWithSubscription | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [tempPasswords, setTempPasswords] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    username: "",
    firstName: "",
    lastName: "",
    phone: "",
    password: "",
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: subUsers = [], isLoading } = useQuery<UserWithSubscription[]>({
    queryKey: ["/api/sub-users"],
    queryFn: async () => {
      const response = await createAuthenticatedRequest("/api/sub-users");
      if (!response.ok) throw new Error("خطا در دریافت زیرمجموعه‌ها");
      return response.json();
    },
  });

  const createSubUserMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await createAuthenticatedRequest("/api/sub-users", {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "خطا در ایجاد زیرمجموعه");
      }
      return response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sub-users"] });
      // ذخیره رمز عبور موقت برای نمایش
      if (result.user?.id && formData.password) {
        setTempPasswords(prev => ({
          ...prev,
          [result.user.id]: formData.password
        }));
      }
      setIsCreateDialogOpen(false);
      setFormData({
        username: "",
        firstName: "",
        lastName: "",
        phone: "",
        password: "",
      });
      toast({
        title: "موفقیت",
        description: "زیرمجموعه با موفقیت ایجاد شد",
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

  const updateSubUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<UserType> }) => {
      const response = await createAuthenticatedRequest(`/api/sub-users/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "خطا در بروزرسانی زیرمجموعه");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sub-users"] });
      setIsEditDialogOpen(false);
      setEditingUser(null);
      toast({
        title: "موفقیت",
        description: "زیرمجموعه با موفقیت بروزرسانی شد",
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

  const deleteSubUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await createAuthenticatedRequest(`/api/sub-users/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "خطا در حذف زیرمجموعه");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sub-users"] });
      toast({
        title: "موفقیت",
        description: "زیرمجموعه با موفقیت حذف شد",
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

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ id, password }: { id: string; password: string }) => {
      const response = await createAuthenticatedRequest(`/api/sub-users/${id}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "خطا در بازنشانی رمز عبور");
      }
      return response.json();
    },
    onSuccess: (result, variables) => {
      // ذخیره رمز عبور موقت برای نمایش
      if (result.temporaryPassword) {
        setTempPasswords(prev => ({
          ...prev,
          [variables.id]: result.temporaryPassword
        }));
      }
      setIsResetPasswordDialogOpen(false);
      setResetPasswordUser(null);
      setNewPassword("");
      toast({
        title: "موفقیت",
        description: "رمز عبور با موفقیت بازنشانی شد",
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

  // تابع فرمت کردن شماره تلفن
  const formatPhone = (phone: string) => {
    if (!phone) return phone;
    // تبدیل ارقام فارسی و عربی به انگلیسی
    const normalizedPhone = phone
      .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString())
      .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
    
    // حذف فضاهای خالی و کاراکترهای اضافی
    const cleanPhone = normalizedPhone.replace(/\s+/g, '');
    
    // تبدیل +98 یا 0098 یا 98 به 0
    if (cleanPhone.startsWith('+98')) {
      return '0' + cleanPhone.slice(3);
    } else if (cleanPhone.startsWith('0098')) {
      return '0' + cleanPhone.slice(4);
    } else if (cleanPhone.startsWith('98') && cleanPhone.length > 10) {
      return '0' + cleanPhone.slice(2);
    }
    return cleanPhone;
  };

  // سورت کردن کاربران از جدید به قدیم
  const sortedSubUsers = [...subUsers].sort((a, b) => {
    const dateA = new Date(a.createdAt || 0).getTime();
    const dateB = new Date(b.createdAt || 0).getTime();
    return dateB - dateA; // جدید به قدیم
  });

  const filteredSubUsers = sortedSubUsers.filter(user => {
    const matchesSearch = user.firstName.toLowerCase().includes(search.toLowerCase()) ||
                         user.lastName.toLowerCase().includes(search.toLowerCase()) ||
                         (user.username && user.username.toLowerCase().includes(search.toLowerCase()));
    return matchesSearch;
  });

  const handleCreate = () => {
    try {
      createSubUserSchema.parse(formData);
      createSubUserMutation.mutate(formData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        toast({
          title: "خطای اعتبارسنجی",
          description: firstError.message,
          variant: "destructive",
        });
      }
    }
  };

  const handleEdit = (user: UserWithSubscription) => {
    setEditingUser(user);
    setIsEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!editingUser) return;
    updateSubUserMutation.mutate({
      id: editingUser.id,
      data: {
        firstName: editingUser.firstName,
        lastName: editingUser.lastName,
        phone: editingUser.phone,
      },
    });
  };

  const handleDelete = (id: string) => {
    if (confirm("آیا از حذف این زیرمجموعه اطمینان دارید؟")) {
      deleteSubUserMutation.mutate(id);
    }
  };

  const handleResetPassword = (user: UserWithSubscription) => {
    setResetPasswordUser(user);
    setIsResetPasswordDialogOpen(true);
  };

  const handleSubmitResetPassword = () => {
    if (!resetPasswordUser || !newPassword) return;
    resetPasswordMutation.mutate({
      id: resetPasswordUser.id,
      password: newPassword
    });
  };

  const togglePasswordVisibility = (userId: string) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  return (
    <DashboardLayout title="مدیریت زیرمجموعه‌ها">
      <div className="space-y-4" data-testid="sub-users-content">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">مدیریت زیرمجموعه‌ها</h1>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-sub-user" className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                افزودن زیرمجموعه
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>افزودن زیرمجموعه جدید</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="username">نام کاربری</Label>
                  <Input
                    id="username"
                    data-testid="input-create-username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="نام کاربری منحصر به فرد"
                  />
                </div>
                <div>
                  <Label htmlFor="firstName">نام</Label>
                  <Input
                    id="firstName"
                    data-testid="input-create-firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="نام"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">نام خانوادگی</Label>
                  <Input
                    id="lastName"
                    data-testid="input-create-lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="نام خانوادگی"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">شماره تلفن</Label>
                  <Input
                    id="phone"
                    data-testid="input-create-phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="09123456789"
                  />
                </div>
                <div>
                  <Label htmlFor="password">رمز عبور</Label>
                  <Input
                    id="password"
                    data-testid="input-create-password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="حداقل ۶ کاراکتر"
                  />
                </div>
                <Button 
                  onClick={handleCreate} 
                  className="w-full"
                  disabled={createSubUserMutation.isPending}
                  data-testid="button-submit-create"
                >
                  {createSubUserMutation.isPending ? "در حال ایجاد..." : "ایجاد زیرمجموعه"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="جستجو در زیرمجموعه‌ها..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
            data-testid="input-search-sub-users"
          />
        </div>

        {/* Users Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-right">کاربر</TableHead>
                <TableHead className="text-right">نام کاربری</TableHead>
                <TableHead className="text-right">تلفن</TableHead>
                <TableHead className="text-right">اشتراک</TableHead>
                <TableHead className="text-right">روزهای باقیمانده</TableHead>
                <TableHead className="text-right">رمز عبور</TableHead>
                <TableHead className="text-right">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    در حال بارگذاری...
                  </TableCell>
                </TableRow>
              ) : filteredSubUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    {search ? "هیچ زیرمجموعه‌ای یافت نشد" : "هنوز زیرمجموعه‌ای ایجاد نشده است"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredSubUsers.map((user) => (
                  <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium" data-testid={`text-fullname-${user.id}`}>{user.firstName} {user.lastName}</span>
                        {user.isWhatsappRegistered && (
                          <Badge variant="secondary" className="w-fit mt-1 text-xs">
                            واتس‌اپ
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground" data-testid={`text-username-${user.id}`}>@{user.username}</span>
                    </TableCell>
                    <TableCell className="text-sm" data-testid={`text-phone-${user.id}`}>{formatPhone(user.phone)}</TableCell>
                    <TableCell>
                      {user.subscription ? (
                        <div className="flex flex-col gap-1">
                          <span className="text-sm">{user.subscription.name}</span>
                          {user.subscription.isTrialPeriod && (
                            <Badge variant="secondary" className="text-xs w-fit">آزمایشی</Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">بدون اشتراک</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.subscription ? (
                        <span className={`text-sm ${
                          user.subscription.remainingDays <= 3 ? 'text-red-600' :
                          user.subscription.remainingDays <= 7 ? 'text-orange-600' :
                          'text-green-600'
                        }`}>
                          {user.subscription.remainingDays} روز
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {tempPasswords[user.id] ? (
                          <>
                            <span className="text-sm font-mono" data-testid={`text-password-${user.id}`}>
                              {visiblePasswords[user.id] ? tempPasswords[user.id] : '••••••••'}
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => togglePasswordVisibility(user.id)}
                              data-testid={`button-toggle-password-${user.id}`}
                            >
                              {visiblePasswords[user.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </Button>
                          </>
                        ) : (
                          <span className="text-muted-foreground text-sm">••••••••</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(user)}
                          data-testid={`button-edit-${user.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResetPassword(user)}
                          data-testid={`button-reset-password-${user.id}`}
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(user.id)}
                          className="text-destructive hover:text-destructive"
                          data-testid={`button-delete-${user.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>ویرایش زیرمجموعه</DialogTitle>
            </DialogHeader>
            {editingUser && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-firstName">نام</Label>
                  <Input
                    id="edit-firstName"
                    data-testid="input-edit-firstName"
                    value={editingUser.firstName}
                    onChange={(e) => setEditingUser({ ...editingUser, firstName: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-lastName">نام خانوادگی</Label>
                  <Input
                    id="edit-lastName"
                    data-testid="input-edit-lastName"
                    value={editingUser.lastName}
                    onChange={(e) => setEditingUser({ ...editingUser, lastName: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-phone">شماره تلفن</Label>
                  <Input
                    id="edit-phone"
                    data-testid="input-edit-phone"
                    value={editingUser.phone}
                    onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                  />
                </div>
                <Button 
                  onClick={handleUpdate} 
                  className="w-full"
                  disabled={updateSubUserMutation.isPending}
                  data-testid="button-submit-edit"
                >
                  {updateSubUserMutation.isPending ? "در حال بروزرسانی..." : "بروزرسانی"}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Reset Password Dialog */}
        <Dialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>بازنشانی رمز عبور</DialogTitle>
            </DialogHeader>
            {resetPasswordUser && (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  رمز عبور جدید برای <span className="font-medium">{resetPasswordUser.firstName} {resetPasswordUser.lastName}</span>
                </div>
                <div>
                  <Label htmlFor="new-password">رمز عبور جدید</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="حداقل ۶ کاراکتر"
                    data-testid="input-reset-password"
                  />
                </div>
                <Button 
                  onClick={handleSubmitResetPassword} 
                  className="w-full"
                  disabled={resetPasswordMutation.isPending || newPassword.length < 6}
                  data-testid="button-submit-reset-password"
                >
                  {resetPasswordMutation.isPending ? "در حال بازنشانی..." : "بازنشانی رمز عبور"}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}