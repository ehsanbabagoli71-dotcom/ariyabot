import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Plus, Search, Edit, Trash2, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createAuthenticatedRequest } from "@/lib/auth";
import type { Product, Category } from "@shared/schema";

export default function ProductList() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categorySortOrder, setCategorySortOrder] = useState<'none' | 'asc' | 'desc'>('none');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    queryFn: async () => {
      const response = await createAuthenticatedRequest("/api/products");
      if (!response.ok) throw new Error("خطا در دریافت محصولات");
      return response.json();
    },
  });

  // Fetch categories to display category names
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Product> }) => {
      const response = await createAuthenticatedRequest(`/api/products/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("خطا در بروزرسانی محصول");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "موفقیت",
        description: "محصول با موفقیت بروزرسانی شد",
      });
    },
    onError: () => {
      toast({
        title: "خطا",
        description: "خطا در بروزرسانی محصول",
        variant: "destructive",
      });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await createAuthenticatedRequest(`/api/products/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("خطا در حذف محصول");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "موفقیت",
        description: "محصول با موفقیت حذف شد",
      });
    },
    onError: () => {
      toast({
        title: "خطا",
        description: "خطا در حذف محصول",
        variant: "destructive",
      });
    },
  });

  // Get category name by categoryId
  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return "بدون دسته‌بندی";
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : "نامشخص";
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase()) ||
                         (product.description && product.description.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "active" && product.isActive) ||
                         (statusFilter === "inactive" && !product.isActive);
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    // Apply category sorting if enabled
    if (categorySortOrder !== 'none') {
      const categoryNameA = getCategoryName(a.categoryId);
      const categoryNameB = getCategoryName(b.categoryId);
      
      const comparison = categoryNameA.localeCompare(categoryNameB, 'fa');
      return categorySortOrder === 'asc' ? comparison : -comparison;
    }
    return 0; // No sorting
  });

  const handleToggleActive = (product: Product) => {
    updateProductMutation.mutate({
      id: product.id,
      data: { isActive: !product.isActive },
    });
  };

  const handleDelete = (productId: string) => {
    if (confirm("آیا از حذف این محصول اطمینان دارید؟")) {
      deleteProductMutation.mutate(productId);
    }
  };

  const formatPrice = (price: string | null) => {
    if (!price) return "-";
    return parseFloat(price).toLocaleString("fa-IR") + " تومان";
  };

  // Handle category sort
  const handleCategorySortToggle = () => {
    if (categorySortOrder === 'none') {
      setCategorySortOrder('asc');
    } else if (categorySortOrder === 'asc') {
      setCategorySortOrder('desc');
    } else {
      setCategorySortOrder('none');
    }
  };

  // Get sort icon for category column
  const getCategorySortIcon = () => {
    if (categorySortOrder === 'asc') return <ChevronUp className="h-4 w-4" />;
    if (categorySortOrder === 'desc') return <ChevronDown className="h-4 w-4" />;
    return <ChevronsUpDown className="h-4 w-4" />;
  };

  return (
    <DashboardLayout title="لیست محصولات">
      <div className="space-y-6" data-testid="page-product-list">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">لیست محصولات</h2>
            <p className="text-muted-foreground">مدیریت محصولات اضافه شده توسط شما</p>
          </div>
          <Link href="/add-product">
            <Button data-testid="button-add-product">
              <Plus className="w-4 h-4 ml-2" />
              افزودن محصول
            </Button>
          </Link>
        </div>

        {/* Search and Filters */}
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center space-x-4 space-x-reverse">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="جستجو در محصولات..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-search-products"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48" data-testid="select-status-filter">
                <SelectValue placeholder="همه محصولات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه محصولات</SelectItem>
                <SelectItem value="active">فعال</SelectItem>
                <SelectItem value="inactive">غیرفعال</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="secondary" data-testid="button-search">
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">در حال بارگذاری...</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted">
                    <TableHead className="text-right">تصویر</TableHead>
                    <TableHead className="text-right">نام محصول</TableHead>
                    <TableHead className="text-right">
                      <button 
                        onClick={handleCategorySortToggle}
                        className="flex items-center gap-2 hover:text-primary transition-colors cursor-pointer"
                        data-testid="button-sort-category"
                      >
                        دسته‌بندی
                        {getCategorySortIcon()}
                      </button>
                    </TableHead>
                    <TableHead className="text-right">تعداد</TableHead>
                    <TableHead className="text-right">قیمت اصلی</TableHead>
                    <TableHead className="text-right">قیمت تخفیف‌دار</TableHead>
                    <TableHead className="text-right">وضعیت</TableHead>
                    <TableHead className="text-right">عملیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        {search || statusFilter !== "all" ? "محصولی یافت نشد" : "هیچ محصولی اضافه نکرده‌اید"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts.map((product) => (
                      <TableRow key={product.id} className="hover:bg-muted/50 transition-colors" data-testid={`row-product-${product.id}`}>
                        <TableCell>
                          {product.image ? (
                            <img
                              src={product.image}
                              alt={product.name}
                              className="w-12 h-12 rounded-lg object-cover"
                              data-testid={`img-product-${product.id}`}
                            />
                          ) : (
                            <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                              <span className="text-muted-foreground text-xs">بدون تصویر</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <p className="font-medium text-foreground" data-testid={`text-product-name-${product.id}`}>
                            {product.name}
                          </p>
                        </TableCell>
                        <TableCell className="text-muted-foreground" data-testid={`text-product-category-${product.id}`}>
                          {getCategoryName(product.categoryId)}
                        </TableCell>
                        <TableCell className="text-muted-foreground" data-testid={`text-product-quantity-${product.id}`}>
                          {product.quantity}
                        </TableCell>
                        <TableCell className="text-muted-foreground" data-testid={`text-product-price-before-${product.id}`}>
                          {formatPrice(product.priceBeforeDiscount)}
                        </TableCell>
                        <TableCell className="font-medium text-foreground" data-testid={`text-product-price-after-${product.id}`}>
                          {formatPrice(product.priceAfterDiscount)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2" dir="ltr">
                            <Switch
                              checked={product.isActive}
                              onCheckedChange={() => handleToggleActive(product)}
                              data-testid={`switch-product-active-${product.id}`}
                              className="data-[state=checked]:bg-primary [&>span]:data-[state=checked]:translate-x-5 [&>span]:data-[state=unchecked]:translate-x-0"
                            />
                            <span className={`text-sm ${product.isActive ? 'text-foreground' : 'text-muted-foreground'}`} dir="rtl">
                              {product.isActive ? 'فعال' : 'غیرفعال'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2 space-x-reverse">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-primary hover:text-primary/80"
                              data-testid={`button-edit-product-${product.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(product.id)}
                              className="text-destructive hover:text-destructive/80"
                              data-testid={`button-delete-product-${product.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
