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
  BarChart3,
  Bot,
  Home,
  FolderTree,
  MessageCircle,
  ShoppingCart,
  MapPin,
  Package,
  Wallet,
  DollarSign
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [ticketsOpen, setTicketsOpen] = useState(false);
  const [level2MenuOpen, setLevel2MenuOpen] = useState(false);
  const [level1MenuOpen, setLevel1MenuOpen] = useState(false);

  const isActive = (path: string) => location === path;

  const adminMenuItems = [
    { path: "/users", label: "مدیریت کاربران", icon: Users },
    { path: "/tickets", label: "مدیریت تیکت‌ها", icon: Ticket },
    { path: "/subscriptions", label: "اشتراک‌ها", icon: Crown },
  ];

  const userMenuItems = [
    { path: "/", label: "پیشخوان", icon: Home },
  ];

  const ticketItems = [
    { path: "/send-ticket", label: "ارسال تیکت جدید", icon: Send },
    { path: "/my-tickets", label: "تیکت‌ها", icon: Ticket },
  ];

  const inventoryItems = [
    { path: "/add-product", label: "افزودن محصول", icon: Plus, adminOnly: false },
    { path: "/products", label: "لیست محصولات", icon: List, adminOnly: false },
    { path: "/categories", label: "دسته بندی", icon: FolderTree, adminOnly: true },
  ];

  const whatsappItems = [
    { path: "/whatsapp-settings", label: "تنظیمات واتس‌اپ", icon: Settings, adminOnly: false },
    { path: "/send-message", label: "ارسال پیام", icon: Send, adminOnly: false },
    { path: "/admin/welcome-message", label: "پیام خوش آمدگویی", icon: MessageCircle, adminOnly: false },
    { path: "/reports", label: "گزارش‌ها", icon: BarChart3, adminOnly: false },
  ];

  const settingsItems = [
    { path: "/ai-token", label: "توکن هوش مصنوعی", icon: Bot, adminOnly: true },
    { path: "/profile", label: "اطلاعات کاربری", icon: User, adminOnly: false },
  ];

  const level2MenuItems = [
    { path: "/addresses", label: "آدرس‌ها", icon: MapPin },
    { path: "/orders", label: "سفارشات من", icon: Package },
    { path: "/financial", label: "امور مالی", icon: Wallet },
  ];

  const level1MenuItems = [
    { path: "/received-orders", label: "سفارشات دریافتی", icon: Package },
    { path: "/transactions", label: "مدیریت تراکنش‌ها", icon: DollarSign },
  ];

  return (
    <aside className="w-64 bg-card border-l border-border flex flex-col sidebar-transition" data-testid="sidebar-navigation">
      {/* Logo */}
      <div className="p-6 border-b border-border" data-testid="section-logo">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Store className="text-primary-foreground" />
          </div>
          <h2 className="mr-3 text-lg font-bold text-foreground">
            ربات آریا بات
          </h2>
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
          

          {/* Shopping Cart - Only for user_level_2 */}
          {user?.role === "user_level_2" && (
            <li>
              <Link href="/cart">
                <Button
                  variant={isActive("/cart") ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start",
                    isActive("/cart") && "bg-primary text-primary-foreground"
                  )}
                  data-testid="link-cart"
                >
                  <ShoppingCart className="w-5 h-5 ml-2" />
                  سبد خرید
                </Button>
              </Link>
            </li>
          )}

          {/* Direct Menu Items for user_level_2 - Addresses, Orders, Financial */}
          {user?.role === "user_level_2" && level2MenuItems.map((item) => (
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

          
          {/* Inventory Submenu - Hidden for admin and user_level_2 */}
          {user?.role !== "admin" && user?.role !== "user_level_2" && (
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
                    (!item.adminOnly || user?.role === "user_level_1") && user?.role !== "user_level_2" && (
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
          )}

          {/* WhatsApp Integration - Only for user_level_1 */}
          {user?.role === "user_level_1" && (
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

          {/* Settings Section - After WhatsApp */}
          {(user?.role === "admin" || user?.role === "user_level_1") && (
            <li>
              <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    data-testid="button-settings-toggle"
                  >
                    <Settings className="w-5 h-5 ml-2" />
                    تنظیمات
                    <ChevronDown className={cn(
                      "w-4 h-4 mr-auto transition-transform",
                      settingsOpen && "rotate-180"
                    )} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mr-6 space-y-1">
                  {settingsItems.map((item) => (
                    (!item.adminOnly || user?.role === "admin") && (
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
          )}

          {/* Level 1 Business Menu - Orders, Transactions */}
          {user?.role === "user_level_1" && (
            <li>
              <Collapsible open={level1MenuOpen} onOpenChange={setLevel1MenuOpen}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    data-testid="button-level1-menu-toggle"
                  >
                    <Package className="w-5 h-5 ml-2" />
                    مدیریت کسب‌وکار
                    <ChevronDown className={cn(
                      "w-4 h-4 mr-auto transition-transform",
                      level1MenuOpen && "rotate-180"
                    )} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mr-6 space-y-1">
                  {level1MenuItems.map((item) => (
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

          {/* Users Management - Level 1 Only */}
          {user?.role === "user_level_1" && (
            <li>
              <Link href="/sub-users">
                <Button
                  variant={isActive("/sub-users") ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start",
                    isActive("/sub-users") && "bg-primary text-primary-foreground"
                  )}
                  data-testid="link-sub-users"
                >
                  <Users className="w-5 h-5 ml-2" />
                  مدیریت کاربران
                </Button>
              </Link>
            </li>
          )}


          {/* Tickets Submenu - At the end of menu */}
          {user?.role !== "admin" && (
            <li>
              <Collapsible open={ticketsOpen} onOpenChange={setTicketsOpen}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    data-testid="button-tickets-toggle"
                  >
                    <MessageSquare className="w-5 h-5 ml-2" />
                    تیکت‌ها
                    <ChevronDown className={cn(
                      "w-4 h-4 mr-auto transition-transform",
                      ticketsOpen && "rotate-180"
                    )} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mr-6 space-y-1">
                  {ticketItems.map((item) => (
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

          {/* Logout - After User Profile */}
          {user?.role !== "admin" && (
            <li>
              <Button
                variant="ghost"
                onClick={logout}
                className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                data-testid="button-sidebar-logout"
              >
                <LogOut className="w-5 h-5 ml-2" />
                خروج
              </Button>
            </li>
          )}
        </ul>
      </nav>
    </aside>
  );
}
