import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Store, 
  Users, 
  Ticket, 
  Crown, 
  User, 
  Send, 
  Warehouse, 
  Plus, 
  List, 
  MessageSquare,
  Settings,
  ChevronDown,
  LogOut,
  BarChart3
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [whatsappOpen, setWhatsappOpen] = useState(false);

  const isActive = (path: string) => location === path;

  const adminMenuItems = [
    { path: "/users", label: "مدیریت کاربران", icon: Users },
    { path: "/tickets", label: "مدیریت تیکت‌ها", icon: Ticket },
    { path: "/subscriptions", label: "اشتراک‌ها", icon: Crown },
  ];

  const userMenuItems = [
    { path: "/profile", label: "اطلاعات کاربری", icon: User },
    { path: "/send-ticket", label: "ارسال تیکت", icon: Send },
  ];

  const inventoryItems = [
    { path: "/add-product", label: "افزودن محصول", icon: Plus },
    { path: "/products", label: "لیست محصولات", icon: List },
  ];

  const whatsappItems = [
    { path: "/whatsapp-settings", label: "تنظیمات واتس‌اپ", icon: Settings, adminOnly: false },
    { path: "/send-message", label: "ارسال پیام", icon: Send, adminOnly: false },
    { path: "/reports", label: "گزارش‌ها", icon: BarChart3, adminOnly: false },
  ];

  return (
    <aside className="w-64 bg-card border-l border-border flex flex-col sidebar-transition" data-testid="sidebar-navigation">
      {/* Logo */}
      <div className="p-6 border-b border-border" data-testid="section-logo">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Store className="text-primary-foreground" />
          </div>
          <h2 className="mr-3 text-lg font-bold text-foreground">پنل مدیریت</h2>
        </div>
      </div>
      
      {/* Navigation Menu */}
      <nav className="flex-1 p-4 custom-scrollbar overflow-y-auto" data-testid="nav-main-menu">
        <ul className="space-y-2">
          {/* Admin Menu Items */}
          {user?.role === "admin" && adminMenuItems.map((item) => (
            <li key={item.path}>
              <Link href={item.path}>
                <Button
                  variant={isActive(item.path) ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start",
                    isActive(item.path) && "bg-primary text-primary-foreground"
                  )}
                  data-testid={`link-${item.path.substring(1)}`}
                >
                  <item.icon className="w-5 h-5 ml-2" />
                  {item.label}
                </Button>
              </Link>
            </li>
          ))}
          
          {/* User Menu Items */}
          {user?.role !== "admin" && userMenuItems.map((item) => (
            <li key={item.path}>
              <Link href={item.path}>
                <Button
                  variant={isActive(item.path) ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start",
                    isActive(item.path) && "bg-primary text-primary-foreground"
                  )}
                  data-testid={`link-${item.path.substring(1)}`}
                >
                  <item.icon className="w-5 h-5 ml-2" />
                  {item.label}
                </Button>
              </Link>
            </li>
          ))}
          
          {/* Inventory Submenu */}
          {user?.role !== "admin" && (
            <li>
              <Collapsible open={inventoryOpen} onOpenChange={setInventoryOpen}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    data-testid="button-inventory-toggle"
                  >
                    <Warehouse className="w-5 h-5 ml-2" />
                    انبار
                    <ChevronDown className={cn(
                      "w-4 h-4 mr-auto transition-transform",
                      inventoryOpen && "rotate-180"
                    )} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mr-6 space-y-1">
                  {inventoryItems.map((item) => (
                    <Link key={item.path} href={item.path}>
                      <Button
                        variant={isActive(item.path) ? "default" : "ghost"}
                        size="sm"
                        className={cn(
                          "w-full justify-start",
                          isActive(item.path) && "bg-primary text-primary-foreground"
                        )}
                        data-testid={`link-${item.path.substring(1)}`}
                      >
                        <item.icon className="w-4 h-4 ml-2" />
                        {item.label}
                      </Button>
                    </Link>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            </li>
          )}
          
          {/* WhatsApp Integration */}
          <li>
            <Collapsible open={whatsappOpen} onOpenChange={setWhatsappOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  data-testid="button-whatsapp-toggle"
                >
                  <MessageSquare className="w-5 h-5 ml-2" />
                  واتس‌اپ
                  <ChevronDown className={cn(
                    "w-4 h-4 mr-auto transition-transform",
                    whatsappOpen && "rotate-180"
                  )} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mr-6 space-y-1">
                {whatsappItems.map((item) => (
                  (!item.adminOnly || user?.role === "admin" || user?.role === "user_level_1") && (
                    <Link key={item.path} href={item.path}>
                      <Button
                        variant={isActive(item.path) ? "default" : "ghost"}
                        size="sm"
                        className={cn(
                          "w-full justify-start",
                          isActive(item.path) && "bg-primary text-primary-foreground"
                        )}
                        data-testid={`link-${item.path.substring(1)}`}
                      >
                        <item.icon className="w-4 h-4 ml-2" />
                        {item.label}
                      </Button>
                    </Link>
                  )
                ))}
              </CollapsibleContent>
            </Collapsible>
          </li>
        </ul>
      </nav>
      
      {/* User Info */}
      <div className="p-4 border-t border-border" data-testid="section-user-profile">
        <div className="flex items-center">
          <Avatar data-testid="img-profile-picture">
            <AvatarImage src={user?.profilePicture || undefined} />
            <AvatarFallback>
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div className="mr-3 flex-1">
            <p className="text-sm font-medium text-foreground" data-testid="text-sidebar-user-name">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-muted-foreground" data-testid="text-sidebar-user-phone">{user?.phone}</p>
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
    </aside>
  );
}
