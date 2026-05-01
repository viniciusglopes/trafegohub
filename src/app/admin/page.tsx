"use client";

import { useEffect, useState } from "react";
import {
  Shield,
  Users,
  UserCheck,
  Clock,
  CreditCard,
  UserX,
  DollarSign,
} from "lucide-react";

interface Stats {
  totalUsers: number;
  activeUsers: number;
  trialUsers: number;
  paidUsers: number;
  canceledUsers: number;
  mrr: number;
  planDistribution: Record<string, number>;
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-red-500">Erro ao carregar estatisticas.</p>
      </div>
    );
  }

  const cards = [
    {
      label: "Total Usuarios",
      value: stats.totalUsers,
      icon: Users,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      label: "Usuarios Ativos",
      value: stats.activeUsers,
      icon: UserCheck,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Em Trial",
      value: stats.trialUsers,
      icon: Clock,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      label: "Pagantes",
      value: stats.paidUsers,
      icon: CreditCard,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
    {
      label: "Cancelados",
      value: stats.canceledUsers,
      icon: UserX,
      color: "text-red-500",
      bg: "bg-red-500/10",
    },
    {
      label: "MRR",
      value: formatCurrency(stats.mrr),
      icon: DollarSign,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
  ];

  const planConfig: Record<string, { label: string; color: string }> = {
    free: { label: "Free", color: "bg-gray-500" },
    starter: { label: "Starter", color: "bg-blue-500" },
    pro: { label: "Pro", color: "bg-purple-500" },
    agency: { label: "Agency", color: "bg-amber-500" },
  };

  const totalForDistribution = Object.values(stats.planDistribution).reduce(
    (sum, count) => sum + count,
    0
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-blue-500" />
        <h1 className="text-3xl font-bold text-gray-100">
          Painel Administrativo
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card) => (
          <div
            key={card.label}
            className="bg-gray-900 border border-gray-800 rounded-xl p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">{card.label}</p>
                <p className="text-2xl font-bold text-gray-100 mt-1">
                  {card.value}
                </p>
              </div>
              <div className={`${card.bg} p-3 rounded-lg`}>
                <card.icon className={`h-6 w-6 ${card.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-gray-100 mb-6">
          Distribuicao por Plano
        </h2>
        <div className="space-y-4">
          {Object.entries(planConfig).map(([key, config]) => {
            const count = stats.planDistribution[key] ?? 0;
            const percentage =
              totalForDistribution > 0
                ? (count / totalForDistribution) * 100
                : 0;

            return (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-100 font-medium">
                    {config.label}
                  </span>
                  <span className="text-gray-400">
                    {count} usuarios ({percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-3">
                  <div
                    className={`${config.color} h-3 rounded-full transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
