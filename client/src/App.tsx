import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import UserManagement from "@/pages/admin/user-management";
import TicketManagement from "@/pages/admin/ticket-management";
import Subscriptions from "@/pages/admin/subscriptions";
import WhatsappSettings from "@/pages/admin/whatsapp-settings";
import Profile from "@/pages/user/profile";
import SendTicket from "@/pages/user/send-ticket";
import AddProduct from "@/pages/user/add-product";
import ProductList from "@/pages/user/product-list";
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

function Router() {
  const { user } = useAuth();
  
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/" component={() => user ? <ProtectedRoute component={Dashboard} /> : <Login />} />
      <Route path="/users" component={() => <AdminRoute component={UserManagement} />} />
      <Route path="/tickets" component={() => <AdminRoute component={TicketManagement} />} />
      <Route path="/subscriptions" component={() => <AdminRoute component={Subscriptions} />} />
      <Route path="/whatsapp-settings" component={() => <AdminRoute component={WhatsappSettings} />} />
      <Route path="/profile" component={() => <ProtectedRoute component={Profile} />} />
      <Route path="/send-ticket" component={() => <ProtectedRoute component={SendTicket} />} />
      <Route path="/add-product" component={() => <ProtectedRoute component={AddProduct} />} />
      <Route path="/products" component={() => <ProtectedRoute component={ProductList} />} />
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
