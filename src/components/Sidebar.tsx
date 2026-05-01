"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Megaphone,
  Link2,
  BarChart3,
  CreditCard,
  Bell,
  Shield,
  Users,
  LogOut,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/campaigns", label: "Campanhas", icon: Megaphone },
  { href: "/dashboard/accounts", label: "Contas de Anuncio", icon: Link2 },
  { href: "/dashboard/reports", label: "Relatorios", icon: BarChart3 },
  { href: "/dashboard/plans", label: "Planos", icon: CreditCard },
  { href: "/dashboard/alerts", label: "Alertas", icon: Bell },
];

const adminItems = [
  { href: "/admin", label: "Admin", icon: Shield },
  { href: "/admin/users", label: "Usuarios", icon: Users },
];

const planLabels: Record<string, string> = {
  free: "Free",
  starter: "Starter",
  pro: "Pro",
  agency: "Agency",
};

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [unreadAlerts, setUnreadAlerts] = useState(0);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/alerts?unread=true&limit=1")
      .then((r) => r.json())
      .then((d) => setUnreadAlerts(d.unreadCount || 0))
      .catch(() => {});
    const interval = setInterval(() => {
      fetch("/api/alerts?unread=true&limit=1")
        .then((r) => r.json())
        .then((d) => setUnreadAlerts(d.unreadCount || 0))
        .catch(() => {});
    }, 60000);
    return () => clearInterval(interval);
  }, [status]);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
      <div className="p-6">
        <h1 className="text-xl font-bold text-blue-600">TrafegoHub</h1>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-blue-600/10 text-blue-600"
                  : "text-gray-400 hover:text-gray-100 hover:bg-gray-800"
              }`}
            >
              <Icon size={18} />
              <span className="flex-1">{item.label}</span>
              {item.label === "Alertas" && unreadAlerts > 0 && (
                <span className="px-1.5 py-0.5 text-xs font-bold rounded-full bg-red-500 text-white min-w-[20px] text-center">
                  {unreadAlerts > 99 ? "99+" : unreadAlerts}
                </span>
              )}
            </Link>
          );
        })}

        {session?.user?.role === "admin" && (
          <>
            <div className="my-3 border-t border-gray-800" />
            {adminItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? "bg-blue-600/10 text-blue-600"
                      : "text-gray-400 hover:text-gray-100 hover:bg-gray-800"
                  }`}
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {session?.user && (
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3">
            {session.user.image ? (
              <img
                src={session.user.image}
                alt={session.user.name}
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm font-medium text-gray-300">
                {session.user.name?.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-100 truncate">
                {session.user.name}
              </p>
              <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-blue-600/10 text-blue-500">
                {planLabels[session.user.plan] || session.user.plan}
              </span>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="mt-3 flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-400 hover:text-gray-100 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      )}
    </aside>
  );
}
