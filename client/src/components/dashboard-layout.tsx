import { Sidebar } from "@/components/sidebar";
import { Bell, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
}

export function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const { user, logout } = useAuth();

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge variant="default">مدیر</Badge>;
      case "user_level_1":
        return <Badge variant="secondary">کاربر سطح ۱</Badge>;
      case "user_level_2":
        return <Badge variant="outline">کاربر سطح ۲</Badge>;
      default:
        return <Badge variant="secondary">کاربر</Badge>;
    }
  };

  return (
    <div className="flex h-screen bg-background" data-testid="dashboard-layout">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-card border-b border-border p-4 flex items-center justify-between" data-testid="header-topbar">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-foreground" data-testid="text-page-title">{title}</h1>
          </div>
          
          <div className="flex items-center space-x-4 space-x-reverse">
            {/* Notifications */}
            <Button variant="ghost" size="sm" className="relative" data-testid="button-notifications">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -left-1 w-4 h-4 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center" data-testid="text-notification-count">
                3
              </span>
            </Button>
            
            {/* User Info */}
            <div className="flex items-center space-x-3 space-x-reverse" data-testid="section-user-info">
              <Avatar data-testid="img-user-avatar">
                <AvatarImage src={user?.profilePicture || undefined} />
                <AvatarFallback>
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium text-foreground" data-testid="text-user-name">
                  {user?.firstName} {user?.lastName}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="text-muted-foreground hover:text-foreground"
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>
        
        {/* Main Content */}
        <main className="flex-1 p-6 overflow-y-auto custom-scrollbar" data-testid="main-content">
          <div className="fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
