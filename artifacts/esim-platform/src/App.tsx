import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { I18nProvider } from "@/lib/i18n";
import { AuthProvider, useAuth } from "@/lib/auth";
import NotFound from "@/pages/not-found";
import { AppLayout } from "@/components/layout/app-layout";

import Home from "@/pages/home";
import MyEsims from "@/pages/my-esims";
import Wallet from "@/pages/wallet";
import Family from "@/pages/family";
import Referral from "@/pages/referral";
import Redeem from "@/pages/redeem";
import Support from "@/pages/support";
import Settings from "@/pages/settings";
import Admin from "@/pages/admin";
import Login from "@/pages/login";
import { useEffect } from "react";

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component, adminOnly = false }: { component: any, adminOnly?: boolean }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    } else if (!isLoading && user && adminOnly && user.role !== "admin") {
      setLocation("/");
    }
  }, [user, isLoading, adminOnly, setLocation]);

  if (isLoading || !user) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (adminOnly && user.role !== "admin") return null;

  return (
    <AppLayout>
      <Component />
    </AppLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" render={() => <ProtectedRoute component={Home} />} />
      <Route path="/my-esims" render={() => <ProtectedRoute component={MyEsims} />} />
      <Route path="/wallet" render={() => <ProtectedRoute component={Wallet} />} />
      <Route path="/family" render={() => <ProtectedRoute component={Family} />} />
      <Route path="/referral" render={() => <ProtectedRoute component={Referral} />} />
      <Route path="/redeem" render={() => <ProtectedRoute component={Redeem} />} />
      <Route path="/support" render={() => <ProtectedRoute component={Support} />} />
      <Route path="/settings" render={() => <ProtectedRoute component={Settings} />} />
      <Route path="/admin" render={() => <ProtectedRoute component={Admin} adminOnly />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
        <I18nProvider>
          <AuthProvider>
            <TooltipProvider>
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <Router />
              </WouterRouter>
              <Toaster />
            </TooltipProvider>
          </AuthProvider>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
