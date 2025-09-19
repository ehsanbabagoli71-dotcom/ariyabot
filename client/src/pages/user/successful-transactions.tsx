import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { 
  CheckCircle, 
  XCircle, 
  Clock,
  DollarSign,
  Filter,
  Calendar,
  User,
  Hash,
  TrendingUp,
  TrendingDown,
  Search
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type Transaction } from "@shared/schema";

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
  completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
  failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
};

const statusLabels = {
  pending: "در انتظار بررسی",
  completed: "تکمیل شده",
  failed: "رد شده"
};

const transactionColors = {
  deposit: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
  withdraw: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
  order_payment: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
  commission: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100"
};

const transactionLabels = {
  deposit: "درخواست واریز",
  withdraw: "درخواست برداشت",
  order_payment: "پرداخت سفارش",
  commission: "کمیسیون"
};

export default function SuccessfulTransactionsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState("");

  // Fetch all transactions for management
  const { data: transactions = [], isLoading } = useQuery<Transaction[]>({
    queryKey: ['/api/transactions/all']
  });

  // Update transaction status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ transactionId, status }: { transactionId: string; status: string }) => {
      const response = await apiRequest(`/api/transactions/${transactionId}/status`, 'PUT', { status });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions/all'] });
      setDialogOpen(false);
      setSelectedTransaction(null);
      setNewStatus("");
      toast({
        title: "موفق",
        description: "وضعیت تراکنش به‌روزرسانی شد"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطا",
        description: "خطا در به‌روزرسانی وضعیت",
        variant: "destructive"
      });
    }
  });

  // Filter transactions
  const filteredTransactions = transactions.filter(transaction => {
    const matchesStatus = statusFilter === "all" || transaction.status === statusFilter;
    const matchesType = typeFilter === "all" || transaction.type === typeFilter;
    const matchesSearch = !searchTerm || 
      transaction.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.referenceId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.paymentMethod?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesType && matchesSearch;
  });

  // Statistics
  const stats = {
    total: transactions.length,
    pending: transactions.filter(t => t.status === 'pending').length,
    completed: transactions.filter(t => t.status === 'completed').length,
    failed: transactions.filter(t => t.status === 'failed').length,
    totalAmount: transactions
      .filter(t => t.status === 'completed')
      .reduce((acc, t) => acc + Number(t.amount), 0)
  };

  const handleStatusChange = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setNewStatus(transaction.status);
    setDialogOpen(true);
  };

  const handleStatusUpdate = () => {
    if (selectedTransaction && newStatus && newStatus !== selectedTransaction.status) {
      updateStatusMutation.mutate({
        transactionId: selectedTransaction.id,
        status: newStatus
      });
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fa-IR').format(price) + ' تومان';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          <div className="grid gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100" data-testid="heading-transactions">
            مدیریت تراکنش‌ها
          </h1>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    کل تراکنش‌ها
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2" data-testid="stat-total">
                    {stats.total}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                  <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    در انتظار
                  </p>
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-2" data-testid="stat-pending">
                    {stats.pending}
                  </p>
                </div>
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-full">
                  <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    تکمیل شده
                  </p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2" data-testid="stat-completed">
                    {stats.completed}
                  </p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    رد شده
                  </p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-2" data-testid="stat-failed">
                    {stats.failed}
                  </p>
                </div>
                <div className="p-3 bg-red-100 dark:bg-red-900 rounded-full">
                  <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    مجموع مبلغ
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2" data-testid="stat-amount">
                    {formatPrice(stats.totalAmount)}
                  </p>
                </div>
                <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full">
                  <TrendingUp className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              فیلترها
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>جستجو</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="جستجو در توضیحات، شماره پیگیری..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    data-testid="input-search"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>وضعیت</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger data-testid="select-status-filter">
                    <SelectValue placeholder="انتخاب وضعیت" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">همه</SelectItem>
                    <SelectItem value="pending">در انتظار</SelectItem>
                    <SelectItem value="completed">تکمیل شده</SelectItem>
                    <SelectItem value="failed">رد شده</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>نوع تراکنش</Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger data-testid="select-type-filter">
                    <SelectValue placeholder="انتخاب نوع" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">همه</SelectItem>
                    <SelectItem value="deposit">واریز</SelectItem>
                    <SelectItem value="withdraw">برداشت</SelectItem>
                    <SelectItem value="order_payment">پرداخت سفارش</SelectItem>
                    <SelectItem value="commission">کمیسیون</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setStatusFilter("all");
                    setTypeFilter("all");
                    setSearchTerm("");
                  }}
                  data-testid="button-clear-filters"
                  className="w-full"
                >
                  پاک کردن فیلترها
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transactions List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              لیست تراکنش‌ها ({filteredTransactions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <DollarSign className="w-16 h-16 text-gray-400 dark:text-gray-600 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  تراکنشی یافت نشد
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-center">
                  با فیلترهای انتخاب شده تراکنشی موجود نیست
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                    data-testid={`transaction-${transaction.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-full ${transactionColors[transaction.type as keyof typeof transactionColors]}`}>
                        {transaction.type === 'deposit' && <TrendingUp className="w-4 h-4" />}
                        {transaction.type === 'withdraw' && <TrendingDown className="w-4 h-4" />}
                        {transaction.type === 'order_payment' && <DollarSign className="w-4 h-4" />}
                        {transaction.type === 'commission' && <DollarSign className="w-4 h-4" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-gray-900 dark:text-gray-100">
                            {transactionLabels[transaction.type as keyof typeof transactionLabels]}
                          </h4>
                          <Badge className={statusColors[transaction.status as keyof typeof statusColors]}>
                            {statusLabels[transaction.status as keyof typeof statusLabels]}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                          {transaction.description}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {transaction.userId && (
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              کاربر: {transaction.userId.substring(0, 8)}
                            </div>
                          )}
                          {transaction.referenceId && (
                            <div className="flex items-center gap-1">
                              <Hash className="w-3 h-3" />
                              رف: {transaction.referenceId}
                            </div>
                          )}
                          {transaction.createdAt && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(transaction.createdAt).toLocaleDateString('fa-IR')}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-left">
                        <p className="text-lg font-bold text-gray-900 dark:text-gray-100" data-testid={`amount-${transaction.id}`}>
                          {formatPrice(Number(transaction.amount))}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {transaction.paymentMethod}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusChange(transaction)}
                        data-testid={`button-edit-${transaction.id}`}
                      >
                        تغییر وضعیت
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Update Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>تغییر وضعیت تراکنش</DialogTitle>
              <DialogDescription>
                وضعیت جدید تراکنش را انتخاب کنید
              </DialogDescription>
            </DialogHeader>

            {selectedTransaction && (
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium">
                      {transactionLabels[selectedTransaction.type as keyof typeof transactionLabels]}
                    </span>
                    <Badge className={transactionColors[selectedTransaction.type as keyof typeof transactionColors]}>
                      {formatPrice(Number(selectedTransaction.amount))}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {selectedTransaction.description}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>وضعیت جدید</Label>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger data-testid="select-new-status">
                      <SelectValue placeholder="انتخاب وضعیت" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">در انتظار بررسی</SelectItem>
                      <SelectItem value="completed">تکمیل شده</SelectItem>
                      <SelectItem value="failed">رد شده</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button 
                    onClick={handleStatusUpdate}
                    disabled={updateStatusMutation.isPending || !newStatus || newStatus === selectedTransaction.status}
                    data-testid="button-confirm-status"
                  >
                    {updateStatusMutation.isPending ? "در حال به‌روزرسانی..." : "تایید"}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setDialogOpen(false)}
                    data-testid="button-cancel-status"
                  >
                    لغو
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}