"use client";

import { useEffect, useState } from "react";
import { BarChart3, TrendingUp, TrendingDown, DollarSign, MousePointerClick, Eye, Target } from "lucide-react";

interface Report {
  summary: {
    totalCampaigns: number;
    activeCampaigns: number;
    totalSpend: number;
    totalImpressions: number;
    totalClicks: number;
    totalConversions: number;
    avgCtr: number;
    avgCpc: number;
    avgCpa: number;
  };
  byPlatform: Record<string, {
    spend: number;
    clicks: number;
    impressions: number;
    conversions: number;
    campaigns: number;
  }>;
  topCampaigns: Array<{
    name: string;
    platform: string;
    status: string;
    spend: number;
    impressions: number;
    clicks: number;
    ctr: number;
    cpc: number;
    conversions: number;
    roas: number;
  }>;
  accounts: Array<{ id: string; platform: string; name: string }>;
}

const platformBadge: Record<string, string> = {
  meta: "bg-blue-600/20 text-blue-400",
  google: "bg-red-600/20 text-red-400",
  tiktok: "bg-pink-600/20 text-pink-400",
};

function formatCurrency(value: number) {
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatNumber(value: number) {
  return value.toLocaleString("pt-BR");
}

export default function ReportsPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [platformFilter, setPlatformFilter] = useState("all");

  useEffect(() => {
    const params = platformFilter !== "all" ? `?platform=${platformFilter}` : "";
    fetch(`/api/reports${params}`)
      .then((r) => r.json())
      .then((d) => setReport(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [platformFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center text-gray-500 py-12">Erro ao carregar relatorio.</div>
    );
  }

  const { summary } = report;

  const stats = [
    { label: "Gasto Total", value: formatCurrency(summary.totalSpend), icon: DollarSign, color: "text-amber-400" },
    { label: "Impressoes", value: formatNumber(summary.totalImpressions), icon: Eye, color: "text-blue-400" },
    { label: "Cliques", value: formatNumber(summary.totalClicks), icon: MousePointerClick, color: "text-emerald-400" },
    { label: "Conversoes", value: formatNumber(summary.totalConversions), icon: Target, color: "text-purple-400" },
    { label: "CTR Medio", value: `${summary.avgCtr.toFixed(2)}%`, icon: TrendingUp, color: "text-cyan-400" },
    { label: "CPC Medio", value: formatCurrency(summary.avgCpc), icon: TrendingDown, color: "text-orange-400" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-7 h-7 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-100">Relatorios</h1>
        </div>
        <select
          value={platformFilter}
          onChange={(e) => { setLoading(true); setPlatformFilter(e.target.value); }}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
        >
          <option value="all">Todas as plataformas</option>
          <option value="meta">Meta</option>
          <option value="google">Google</option>
          <option value="tiktok">TikTok</option>
        </select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              <span className="text-sm text-gray-400">{stat.label}</span>
            </div>
            <p className="text-xl font-bold text-gray-100">{stat.value}</p>
          </div>
        ))}
      </div>

      {Object.keys(report.byPlatform).length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-100 mb-4">Por Plataforma</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(report.byPlatform).map(([platform, data]) => (
              <div key={platform} className="bg-gray-800/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${platformBadge[platform] || ""}`}>
                    {platform}
                  </span>
                  <span className="text-xs text-gray-500">{data.campaigns} campanhas</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Gasto</span>
                    <span className="text-gray-100">{formatCurrency(data.spend)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Cliques</span>
                    <span className="text-gray-100">{formatNumber(data.clicks)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Impressoes</span>
                    <span className="text-gray-100">{formatNumber(data.impressions)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Conversoes</span>
                    <span className="text-gray-100">{formatNumber(data.conversions)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl">
        <div className="p-5 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-gray-100">Top 10 Campanhas por Gasto</h2>
        </div>
        {report.topCampaigns.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Nenhuma campanha encontrada.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-800">
                  <th className="px-5 py-3 font-medium">Campanha</th>
                  <th className="px-5 py-3 font-medium">Plataforma</th>
                  <th className="px-5 py-3 font-medium text-right">Gasto</th>
                  <th className="px-5 py-3 font-medium text-right">Impressoes</th>
                  <th className="px-5 py-3 font-medium text-right">Cliques</th>
                  <th className="px-5 py-3 font-medium text-right">CTR</th>
                  <th className="px-5 py-3 font-medium text-right">CPC</th>
                  <th className="px-5 py-3 font-medium text-right">Conversoes</th>
                  <th className="px-5 py-3 font-medium text-right">ROAS</th>
                </tr>
              </thead>
              <tbody>
                {report.topCampaigns.map((c, i) => (
                  <tr key={i} className="border-b border-gray-800/50 last:border-0 hover:bg-gray-800/30">
                    <td className="px-5 py-3.5 text-sm text-gray-100">{c.name}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${platformBadge[c.platform] || ""}`}>
                        {c.platform}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-300 text-right">{formatCurrency(c.spend)}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-300 text-right">{formatNumber(c.impressions)}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-300 text-right">{formatNumber(c.clicks)}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-300 text-right">{c.ctr.toFixed(2)}%</td>
                    <td className="px-5 py-3.5 text-sm text-gray-300 text-right">{formatCurrency(c.cpc)}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-300 text-right">{formatNumber(c.conversions)}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-300 text-right">{c.roas.toFixed(2)}x</td>
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
