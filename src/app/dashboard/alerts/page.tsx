"use client";

import { useEffect, useState } from "react";
import { Bell, AlertTriangle, Info, AlertCircle, CheckCheck } from "lucide-react";

interface Alert {
  _id: string;
  type: string;
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  read: boolean;
  campaign?: { name: string };
  adAccount?: { accountName: string; platform: string };
  createdAt: string;
}

const severityConfig: Record<string, { icon: typeof Info; color: string; bg: string }> = {
  info: { icon: Info, color: "text-blue-400", bg: "bg-blue-500/10" },
  warning: { icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10" },
  critical: { icon: AlertCircle, color: "text-red-400", bg: "bg-red-500/10" },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `${minutes}min atras`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h atras`;
  const days = Math.floor(hours / 24);
  return `${days}d atras`;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/alerts?limit=50")
      .then((r) => r.json())
      .then((d) => {
        setAlerts(d.alerts || []);
        setUnreadCount(d.unreadCount || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function markAllRead() {
    await fetch("/api/alerts/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
    setUnreadCount(0);
  }

  async function markRead(alertId: string) {
    await fetch("/api/alerts/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alertId }),
    });
    setAlerts((prev) =>
      prev.map((a) => (a._id === alertId ? { ...a, read: true } : a))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Bell className="w-7 h-7 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-100">Alertas</h1>
            {unreadCount > 0 && (
              <p className="text-sm text-gray-400">
                {unreadCount} nao lido{unreadCount > 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-gray-100 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-lg transition-colors"
          >
            <CheckCheck className="w-4 h-4" />
            Marcar todas como lidas
          </button>
        )}
      </div>

      {alerts.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <Bell className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-500">Nenhum alerta por enquanto.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => {
            const config = severityConfig[alert.severity] || severityConfig.info;
            const Icon = config.icon;

            return (
              <div
                key={alert._id}
                onClick={() => !alert.read && markRead(alert._id)}
                className={`bg-gray-900 border rounded-xl p-4 flex items-start gap-4 transition-colors cursor-pointer hover:bg-gray-800/50 ${
                  alert.read ? "border-gray-800 opacity-60" : "border-gray-700"
                }`}
              >
                <div className={`p-2 rounded-lg ${config.bg}`}>
                  <Icon className={`w-5 h-5 ${config.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-gray-100">
                      {alert.title}
                    </h3>
                    {!alert.read && (
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                    )}
                  </div>
                  <p className="text-sm text-gray-400 mt-1">{alert.message}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    {alert.campaign && <span>{alert.campaign.name}</span>}
                    {alert.adAccount && (
                      <span>
                        {alert.adAccount.accountName} ({alert.adAccount.platform})
                      </span>
                    )}
                    <span>{timeAgo(alert.createdAt)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
