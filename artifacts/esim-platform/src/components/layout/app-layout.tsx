import React from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import {
  Home,
  Smartphone,
  Wallet,
  Users,
  Share2,
  Gift,
  LifeBuoy,
  Settings,
  Shield,
  LogOut,
  Menu,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const navItems = [
    { href: "/", icon: Home, label: t("nav.home") },
    { href: "/my-esims", icon: Smartphone, label: t("nav.my_esims") },
    { href: "/wallet", icon: Wallet, label: t("nav.wallet") },
    { href: "/family", icon: Users, label: t("nav.family") },
    { href: "/referral", icon: Share2, label: t("nav.referral") },
    { href: "/redeem", icon: Gift, label: t("nav.redeem") },
    { href: "/support", icon: LifeBuoy, label: t("nav.support") },
    { href: "/settings", icon: Settings, label: t("nav.settings") },
  ];

  if (user?.role === "admin") {
    navItems.push({ href: "/admin", icon: Shield, label: t("nav.admin") });
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-card border-r border-border">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-primary">eSIM Platform</h1>
      </div>
      <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`} onClick={() => setIsMobileMenuOpen(false)}>
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 px-4 py-3 mb-2 rounded-lg bg-secondary text-secondary-foreground">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
            {user?.displayName?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.displayName}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground" onClick={logout}>
          <LogOut className="w-5 h-5 mr-3" />
          {t("nav.logout")}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-card border-b border-border sticky top-0 z-20">
        <h1 className="text-xl font-bold text-primary">eSIM Platform</h1>
        <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </Button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-10 bg-background/80 backdrop-blur-sm top-[65px]">
          <div className="h-full">
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden md:block w-72 h-screen sticky top-0 shrink-0">
        <SidebarContent />
      </div>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}