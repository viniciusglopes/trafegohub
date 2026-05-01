"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Megaphone,
  Activity,
  Link2,
  DollarSign,
} from "lucide-react";

interface Campaign {
  _id: string;
  name: string;
  status: "active" | "paused" | "deleted" | "archived";
  adAccount: {
    platform: "meta" | "google" | "tiktok";
    accountName: string;
  };
  metrics: {
    spend: number;
    impressions: number;
    clicks: number;
    ctr: number;
    cpc: number;
  };
}

interface AdAccount {
  _id: string;
}

const planColors: Record<string, string> = {
  free: "bg-gray-700 text-gray-300",
  starter: "bg-blue-600/20 text-blue-400",
  pro: "bg-purple-600/20 text-purple-400",
  agency: "bg-amber-600/20 text-amber-400",
};

const platformBadge: Record<string, string> = {
  meta: "bg-blue-600/20 text-blue-400",
  google: "bg-red-600/20 text-red-400",
  tiktok: "bg-pink-600/20 text-pink-400",
};

const statusBadge: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-400",
  paused: "bg-amber-500/20 text-amber-400",
  archived: "bg-gray-700 text-gray-400",
};

function formatCurrency(value: number) {
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [accountCount, setAccountCount] = useState(0);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;

    async function fetchData() {
      try {
        const [campaignsRes, accountsRes] = await Promise.all([
          fetch("/api/campaigns"),
          fetch("/api/ad-accounts"),
        ]);

        if (campaignsRes.ok) {
          const data = await campaignsRes.json();
          setCampaigns(data);
        }

        if (accountsRes.ok) {
          const data: AdAccount[] = await accountsRes.json();
          setAccountCount(data.length);
        }
      } catch {
      } finally {
        setLoadingData(false);
      }
    }

    fetchData();
  }, [status]);

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const user = session!.user;
  const activeCampaigns = campaigns.filter((c) => c.status === "active");
  const totalSpend = campaigns.reduce((sum, c) => sum + (c.metrics?.spend || 0), 0);
  const recentCampaigns = campaigns.slice(0, 5);

  const stats = [
    {
      label: "Total de Campanhas",
      value: campaigns.length,
      icon: Megaphone,
      color: "text-blue-400",
    },
    {
      label: "Campanhas Ativas",
      value: activeCampaigns.length,
      icon: Activity,
      color: "text-emerald-400",
    },
    {
      label: "Contas Conectadas",
      value: accountCount,
      icon: Link2,
      color: "text-purple-400",
    },
    {
      label: "Gasto Total",
      value: formatCurrency(totalSpend),
      icon: DollarSign,
      color: "text-amber-400",
    },
  ];

  return (
    <div className="bg-gray-950 min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="w-7 h-7 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-100">Dashboard</h1>
            <p className="text-gray-400 text-sm">
              Ola, {user.name?.split(" ")[0]}
            </p>
          </div>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${planColors[user.plan] || planColors.free}`}
        >
          {user.plan}
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-gray-900 border border-gray-800 rounded-xl p-5"
          >
            <div className="flex items-center gap-2 mb-3">
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
              <span className="text-sm text-gray-400">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-gray-100">
              {loadingData ? "-" : stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-gray-100">
            Campanhas Recentes
          </h2>
          <Link
            href="/dashboard/campaigns"
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            Ver todas &rarr;
          </Link>
        </div>

        {recentCampaigns.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {loadingData
              ? "Carregando..."
              : "Nenhuma campanha encontrada."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-800">
                  <th className="px-5 py-3 font-medium">Nome</th>
                  <th className="px-5 py-3 font-medium">Plataforma</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium text-right">Gasto</th>
                  <th className="px-5 py-3 font-medium text-right">Cliques</th>
                  <th className="px-5 py-3 font-medium text-right">CTR</th>
                </tr>
              </thead>
              <tbody>
                {recentCampaigns.map((campaign) => (
                  <tr
                    key={campaign._id}
                    className="border-b border-gray-800/50 last:border-0 hover:bg-gray-800/30"
                  >
                    <td className="px-5 py-3.5 text-sm text-gray-100">
                      {campaign.name}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${platformBadge[campaign.adAccount?.platform] || ""}`}
                      >
                        {campaign.adAccount?.platform || "-"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${statusBadge[campaign.status] || ""}`}
                      >
                        {campaign.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-300 text-right">
                      {formatCurrency(campaign.metrics?.spend || 0)}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-300 text-right">
                      {campaign.metrics?.clicks?.toLocaleString("pt-BR") || 0}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-300 text-right">
                      {(campaign.metrics?.ctr || 0).toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
