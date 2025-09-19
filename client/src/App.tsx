import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import UserDashboard from "@/pages/user/dashboard";
import UserManagement from "@/pages/admin/user-management";
import TicketManagement from "@/pages/admin/ticket-management";
import Subscriptions from "@/pages/admin/subscriptions";
import WhatsappSettings from "@/pages/admin/whatsapp-settings";
import AITokenSettings from "@/pages/admin/ai-token";
import Categories from "@/pages/admin/categories";
import Profile from "@/pages/user/profile";
import SendTicket from "@/pages/user/send-ticket";
import MyTickets from "@/pages/user/my-tickets";
import SendMessage from "@/pages/user/send-message";
import AddProduct from "@/pages/user/add-product";
import ProductList from "@/pages/user/product-list";
import Reports from "@/pages/user/reports";
import SubUsers from "@/pages/user/sub-users";
import WelcomeMessage from "@/pages/admin/welcome-message";
import Cart from "@/pages/cart";
import NotFound from "@/pages/not-found";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="text-lg">در حال بارگذاری...</div>
    </div>;
  }
  
  if (!user) {
    return <Login />;
  }
  
  return <Component />;
}

function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="text-lg">در حال بارگذاری...</div>
    </div>;
  }
  
  if (!user) {
    return <Login />;
  }
  
  if (user.role !== "admin") {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="text-lg text-destructive">دسترسی محدود - این صفحه مخصوص مدیران است</div>
    </div>;
  }
  
  return <Component />;
}

function AdminOrLevel1Route({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="text-lg">در حال بارگذاری...</div>
    </div>;
  }
  
  if (!user) {
    return <Login />;
  }
  
  if (user.role !== "admin" && user.role !== "user_level_1") {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="text-lg text-destructive">دسترسی محدود - این صفحه مخصوص مدیران و کاربران سطح ۱ است</div>
    </div>;
  }
  
  return <Component />;
}

function Level1Route({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="text-lg">در حال بارگذاری...</div>
    </div>;
  }
  
  if (!user) {
    return <Login />;
  }
  
  if (user.role !== "user_level_1") {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="text-lg text-destructive">دسترسی محدود - این صفحه مخصوص کاربران سطح ۱ است</div>
    </div>;
  }
  
  return <Component />;
}

function Level2Route({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="text-lg">در حال بارگذاری...</div>
    </div>;
  }
  
  if (!user) {
    return <Login />;
  }
  
  if (user.role !== "user_level_2") {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="text-lg text-destructive">دسترسی محدود - این صفحه مخصوص کاربران سطح ۲ است</div>
    </div>;
  }
  
  return <Component />;
}

function Router() {
  const { user } = useAuth();
  
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/" component={() => user ? 
        user.role === "admin" 
          ? <ProtectedRoute component={Dashboard} /> 
          : <ProtectedRoute component={UserDashboard} />
        : <Login />} />
      <Route path="/users" component={() => <AdminRoute component={UserManagement} />} />
      <Route path="/tickets" component={() => <AdminRoute component={TicketManagement} />} />
      <Route path="/subscriptions" component={() => <AdminRoute component={Subscriptions} />} />
      <Route path="/categories" component={() => <AdminOrLevel1Route component={Categories} />} />
      <Route path="/ai-token" component={() => <AdminRoute component={AITokenSettings} />} />
      <Route path="/admin/welcome-message" component={() => <AdminOrLevel1Route component={WelcomeMessage} />} />
      <Route path="/whatsapp-settings" component={() => <AdminOrLevel1Route component={WhatsappSettings} />} />
      <Route path="/send-message" component={() => <AdminOrLevel1Route component={SendMessage} />} />
      <Route path="/reports" component={() => <AdminOrLevel1Route component={Reports} />} />
      <Route path="/profile" component={() => <ProtectedRoute component={Profile} />} />
      <Route path="/send-ticket" component={() => <ProtectedRoute component={SendTicket} />} />
      <Route path="/my-tickets" component={() => <ProtectedRoute component={MyTickets} />} />
      <Route path="/add-product" component={() => <ProtectedRoute component={AddProduct} />} />
      <Route path="/products" component={() => <ProtectedRoute component={ProductList} />} />
      <Route path="/sub-users" component={() => <Level1Route component={SubUsers} />} />
      <Route path="/cart" component={() => <Level2Route component={Cart} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
