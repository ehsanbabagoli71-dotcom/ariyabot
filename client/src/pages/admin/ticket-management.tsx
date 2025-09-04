import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Reply, Trash2, User, Paperclip } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createAuthenticatedRequest } from "@/lib/auth";
import type { Ticket, User as UserType } from "@shared/schema";

interface TicketWithUser extends Ticket {
  user?: UserType;
}

export default function TicketManagement() {
  const [filter, setFilter] = useState("all");
  const [replyingTicket, setReplyingTicket] = useState<Ticket | null>(null);
  const [isReplyDialogOpen, setIsReplyDialogOpen] = useState(false);
  const [adminReply, setAdminReply] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tickets = [], isLoading } = useQuery<Ticket[]>({
    queryKey: ["/api/tickets"],
    queryFn: async () => {
      const response = await createAuthenticatedRequest("/api/tickets");
      if (!response.ok) throw new Error("خطا در دریافت تیکت‌ها");
      return response.json();
    },
  });

  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const response = await createAuthenticatedRequest("/api/users");
      if (!response.ok) throw new Error("خطا در دریافت کاربران");
      return response.json();
    },
  });

  const replyMutation = useMutation({
    mutationFn: async ({ ticketId, reply }: { ticketId: string; reply: string }) => {
      const response = await createAuthenticatedRequest(`/api/tickets/${ticketId}/reply`, {
        method: "PUT",
        body: JSON.stringify({ adminReply: reply }),
      });
      if (!response.ok) throw new Error("خطا در پاسخ به تیکت");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      setIsReplyDialogOpen(false);
      setReplyingTicket(null);
      setAdminReply("");
      toast({
        title: "موفقیت",
        description: "پاسخ با موفقیت ارسال شد",
      });
    },
    onError: () => {
      toast({
        title: "خطا",
        description: "خطا در ارسال پاسخ",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      const response = await createAuthenticatedRequest(`/api/tickets/${ticketId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("خطا در حذف تیکت");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      toast({
        title: "موفقیت",
        description: "تیکت با موفقیت حذف شد",
      });
    },
    onError: () => {
      toast({
        title: "خطا",
        description: "خطا در حذف تیکت",
        variant: "destructive",
      });
    },
  });

  const filteredTickets = tickets.filter(ticket => {
    if (filter === "all") return true;
    return ticket.status === filter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "unread":
        return <Badge variant="destructive">خوانده نشده</Badge>;
      case "read":
        return <Badge variant="secondary">خوانده شده</Badge>;
      case "closed":
        return <Badge variant="outline">بسته شده</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent":
        return <Badge variant="destructive">فوری</Badge>;
      case "high":
        return <Badge variant="destructive">بالا</Badge>;
      case "medium":
        return <Badge variant="secondary">متوسط</Badge>;
      case "low":
        return <Badge variant="outline">کم</Badge>;
      default:
        return <Badge variant="secondary">{priority}</Badge>;
    }
  };

  const getUserForTicket = (userId: string) => {
    return users.find(user => user.id === userId);
  };

  const handleReply = (ticket: Ticket) => {
    setReplyingTicket(ticket);
    setIsReplyDialogOpen(true);
  };

  const handleSubmitReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyingTicket || !adminReply.trim()) return;

    replyMutation.mutate({
      ticketId: replyingTicket.id,
      reply: adminReply,
    });
  };

  const handleDelete = (ticketId: string) => {
    if (confirm("آیا از حذف این تیکت اطمینان دارید؟")) {
      deleteMutation.mutate(ticketId);
    }
  };

  return (
    <DashboardLayout title="مدیریت تیکت‌ها">
      <div className="space-y-6" data-testid="page-ticket-management">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground">مدیریت تیکت‌ها</h2>
          <p className="text-muted-foreground">مشاهده و پاسخ به تیکت‌های کاربران</p>
        </div>

        {/* Ticket Filters */}
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center space-x-4 space-x-reverse">
            <Button
              variant={filter === "all" ? "default" : "ghost"}
              onClick={() => setFilter("all")}
              data-testid="button-filter-all"
            >
              همه تیکت‌ها
            </Button>
            <Button
              variant={filter === "unread" ? "default" : "ghost"}
              onClick={() => setFilter("unread")}
              data-testid="button-filter-unread"
            >
              خوانده نشده
            </Button>
            <Button
              variant={filter === "read" ? "default" : "ghost"}
              onClick={() => setFilter("read")}
              data-testid="button-filter-read"
            >
              خوانده شده
            </Button>
            <Button
              variant={filter === "closed" ? "default" : "ghost"}
              onClick={() => setFilter("closed")}
              data-testid="button-filter-closed"
            >
              بسته شده
            </Button>
          </div>
        </div>

        {/* Tickets List */}
        {isLoading ? (
          <div className="text-center py-8">در حال بارگذاری...</div>
        ) : (
          <div className="space-y-4">
            {filteredTickets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                تیکتی یافت نشد
              </div>
            ) : (
              filteredTickets.map((ticket) => {
                const user = getUserForTicket(ticket.userId);
                return (
                  <div key={ticket.id} className="bg-card rounded-lg border border-border p-6 hover-lift" data-testid={`card-ticket-${ticket.id}`}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3 space-x-reverse">
                        <Avatar data-testid={`img-ticket-user-${ticket.id}`}>
                          <AvatarImage src={user?.profilePicture || undefined} />
                          <AvatarFallback>
                            <User className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-medium text-foreground" data-testid={`text-ticket-user-name-${ticket.id}`}>
                            {user ? `${user.firstName} ${user.lastName}` : 'کاربر ناشناس'}
                          </h4>
                          <p className="text-sm text-muted-foreground" data-testid={`text-ticket-user-email-${ticket.id}`}>
                            {user?.email || 'ایمیل نامشخص'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 space-x-reverse">
                        {getStatusBadge(ticket.status)}
                        {getPriorityBadge(ticket.priority)}
                        <span className="text-sm text-muted-foreground" data-testid={`text-ticket-date-${ticket.id}`}>
                          {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString('fa-IR') : '-'}
                        </span>
                      </div>
                    </div>

                    <h3 className="text-lg font-semibold text-foreground mb-2" data-testid={`text-ticket-subject-${ticket.id}`}>
                      {ticket.subject}
                    </h3>
                    <p className="text-muted-foreground mb-4" data-testid={`text-ticket-message-${ticket.id}`}>
                      {ticket.message}
                    </p>

                    {ticket.attachments && ticket.attachments.length > 0 && (
                      <div className="flex items-center space-x-2 space-x-reverse mb-4">
                        <Paperclip className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground" data-testid={`text-ticket-attachments-${ticket.id}`}>
                          {ticket.attachments.length} فایل ضمیمه
                        </span>
                      </div>
                    )}

                    {ticket.adminReply && (
                      <div className="bg-muted p-3 rounded-lg mb-4">
                        <div className="flex items-center space-x-2 space-x-reverse mb-2">
                          <Reply className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium text-foreground">پاسخ مدیر:</span>
                        </div>
                        <p className="text-sm text-muted-foreground" data-testid={`text-ticket-reply-${ticket.id}`}>
                          {ticket.adminReply}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <Button
                          onClick={() => handleReply(ticket)}
                          className="flex items-center"
                          data-testid={`button-reply-ticket-${ticket.id}`}
                        >
                          <Reply className="h-4 w-4 ml-2" />
                          پاسخ
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(ticket.id)}
                        className="text-destructive hover:text-destructive/80"
                        data-testid={`button-delete-ticket-${ticket.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Reply Dialog */}
        <Dialog open={isReplyDialogOpen} onOpenChange={setIsReplyDialogOpen}>
          <DialogContent data-testid="dialog-reply-ticket">
            <DialogHeader>
              <DialogTitle>پاسخ به تیکت</DialogTitle>
            </DialogHeader>
            {replyingTicket && (
              <form onSubmit={handleSubmitReply} className="space-y-4">
                <div>
                  <Label>موضوع تیکت:</Label>
                  <p className="text-sm text-muted-foreground" data-testid="text-reply-subject">
                    {replyingTicket.subject}
                  </p>
                </div>
                <div>
                  <Label htmlFor="adminReply">پاسخ شما:</Label>
                  <Textarea
                    id="adminReply"
                    value={adminReply}
                    onChange={(e) => setAdminReply(e.target.value)}
                    placeholder="پاسخ خود را اینجا بنویسید..."
                    rows={4}
                    required
                    data-testid="textarea-admin-reply"
                  />
                </div>
                <div className="flex justify-end space-x-2 space-x-reverse">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsReplyDialogOpen(false)}
                    data-testid="button-cancel-reply"
                  >
                    لغو
                  </Button>
                  <Button
                    type="submit"
                    disabled={replyMutation.isPending}
                    data-testid="button-send-reply"
                  >
                    {replyMutation.isPending ? "در حال ارسال..." : "ارسال پاسخ"}
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
