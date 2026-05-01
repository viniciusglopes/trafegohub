"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Megaphone,
  Pause,
  Play,
  Pencil,
  Check,
  X,
  RefreshCw,
} from "lucide-react";

interface AdAccountRef {
  _id: string;
  platform: "meta" | "google" | "tiktok";
  accountName: string;
}

interface Campaign {
  _id: string;
  name: string;
  status: "active" | "paused" | "deleted" | "archived";
  dailyBudget?: number;
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

const platformBadge: Record<string, string> = {
  meta: "bg-blue-600/20 text-blue-400",
  google: "bg-red-600/20 text-red-400",
  tiktok: "bg-pink-600/20 text-pink-400",
};

const statusBadge: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-400",
  paused: "bg-amber-500/20 text-amber-400",
  archived: "bg-slate-200 dark:bg-gray-700 text-slate-500 dark:text-gray-400",
};

function formatCurrency(value: number) {
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function CampaignsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [platformFilter, setPlatformFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingBudget, setEditingBudget] = useState<string | null>(null);
  const [budgetValue, setBudgetValue] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [metaAccounts, setMetaAccounts] = useState<AdAccountRef[]>([]);
  const [googleAccounts, setGoogleAccounts] = useState<AdAccountRef[]>([]);
  const [tiktokAccounts, setTiktokAccounts] = useState<AdAccountRef[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const fetchCampaigns = useCallback(async () => {
    try {
      const res = await fetch("/api/campaigns");
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMetaAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/ad-accounts?platform=meta");
      if (res.ok) {
        const data = await res.json();
        setMetaAccounts(data);
      }
    } catch {
    }
  }, []);

  const fetchGoogleAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/ad-accounts?platform=google");
      if (res.ok) {
        const data = await res.json();
        setGoogleAccounts(data);
      }
    } catch {
    }
  }, []);

  const fetchTiktokAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/ad-accounts?platform=tiktok");
      if (res.ok) {
        const data = await res.json();
        setTiktokAccounts(data);
      }
    } catch {
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      fetchCampaigns();
      fetchMetaAccounts();
      fetchGoogleAccounts();
      fetchTiktokAccounts();
    }
  }, [status, fetchCampaigns, fetchMetaAccounts, fetchGoogleAccounts, fetchTiktokAccounts]);

  async function handleSync() {
    const hasAccounts = metaAccounts.length > 0 || googleAccounts.length > 0 || tiktokAccounts.length > 0;
    if (!hasAccounts) return;

    setSyncing(true);
    setSyncResult(null);

    let totalSynced = 0;

    try {
      for (const account of metaAccounts) {
        const res = await fetch("/api/meta/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ adAccountId: account._id }),
        });

        if (res.ok) {
          const data = await res.json();
          totalSynced += data.synced;
        }
      }

      for (const account of googleAccounts) {
        const res = await fetch("/api/google-ads/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ adAccountId: account._id }),
        });

        if (res.ok) {
          const data = await res.json();
          totalSynced += data.synced;
        }
      }

      for (const account of tiktokAccounts) {
        const res = await fetch("/api/tiktok/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ adAccountId: account._id }),
        });

        if (res.ok) {
          const data = await res.json();
          totalSynced += data.synced;
        }
      }

      setSyncResult(`${totalSynced} campanha${totalSynced !== 1 ? "s" : ""} sincronizada${totalSynced !== 1 ? "s" : ""}`);
      await fetchCampaigns();
    } catch {
      setSyncResult("Erro ao sincronizar");
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncResult(null), 5000);
    }
  }

  async function handleToggleStatus(campaign: Campaign) {
    setActionLoading(campaign._id);
    const action = campaign.status === "active" ? "pause" : "activate";

    try {
      const res = await fetch(`/api/campaigns/${campaign._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (res.ok) {
        const updated = await res.json();
        setCampaigns((prev) =>
          prev.map((c) => (c._id === updated._id ? updated : c))
        );
      }
    } catch {
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSaveBudget(campaignId: string) {
    const value = parseFloat(budgetValue);
    if (isNaN(value) || value < 0) return;

    setActionLoading(campaignId);

    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateBudget", dailyBudget: value }),
      });

      if (res.ok) {
        const updated = await res.json();
        setCampaigns((prev) =>
          prev.map((c) => (c._id === updated._id ? updated : c))
        );
      }
    } catch {
    } finally {
      setEditingBudget(null);
      setBudgetValue("");
      setActionLoading(null);
    }
  }

  const filtered = campaigns.filter((c) => {
    if (platformFilter !== "all" && c.adAccount?.platform !== platformFilter)
      return false;
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    return true;
  });

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-slate-50 dark:bg-gray-950 min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Megaphone className="w-7 h-7 text-blue-600" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-gray-100">Campanhas</h1>
        </div>
        {(metaAccounts.length > 0 || googleAccounts.length > 0 || tiktokAccounts.length > 0) && (
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Sincronizando..." : "Sincronizar"}
          </button>
        )}
      </div>

      {syncResult && (
        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-sm">
          {syncResult}
        </div>
      )}

      <div className="flex gap-3 mb-6">
        <select
          value={platformFilter}
          onChange={(e) => setPlatformFilter(e.target.value)}
          className="px-4 py-2 bg-slate-100 dark:bg-gray-800 border border-slate-300 dark:border-gray-700 rounded-lg text-slate-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
        >
          <option value="all">Todas as plataformas</option>
          <option value="meta">Meta</option>
          <option value="google">Google</option>
          <option value="tiktok">TikTok</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-slate-100 dark:bg-gray-800 border border-slate-300 dark:border-gray-700 rounded-lg text-slate-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
        >
          <option value="all">Todos os status</option>
          <option value="active">Ativas</option>
          <option value="paused">Pausadas</option>
          <option value="archived">Arquivadas</option>
        </select>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl">
        {loading ? (
          <div className="p-8 text-center text-slate-400 dark:text-gray-500">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-400 dark:text-gray-500">
            Nenhuma campanha encontrada. Conecte uma conta de anuncio para
            sincronizar suas campanhas.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-slate-400 dark:text-gray-500 uppercase border-b border-slate-200 dark:border-gray-800">
                  <th className="px-5 py-3 font-medium">Nome</th>
                  <th className="px-5 py-3 font-medium">Conta</th>
                  <th className="px-5 py-3 font-medium">Plataforma</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium text-right">
                    Orcamento Diario
                  </th>
                  <th className="px-5 py-3 font-medium text-right">Gasto</th>
                  <th className="px-5 py-3 font-medium text-right">
                    Impressoes
                  </th>
                  <th className="px-5 py-3 font-medium text-right">Cliques</th>
                  <th className="px-5 py-3 font-medium text-right">CTR</th>
                  <th className="px-5 py-3 font-medium text-right">CPC</th>
                  <th className="px-5 py-3 font-medium text-center">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((campaign) => (
                  <tr
                    key={campaign._id}
                    className="border-b border-slate-100 dark:border-gray-800/50 last:border-0 hover:bg-slate-50 dark:hover:bg-gray-800/30"
                  >
                    <td className="px-5 py-3.5 text-sm text-slate-900 dark:text-gray-100">
                      {campaign.name}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-500 dark:text-gray-400">
                      {campaign.adAccount?.accountName || "-"}
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
                    <td className="px-5 py-3.5 text-sm text-slate-700 dark:text-gray-300 text-right">
                      {editingBudget === campaign._id ? (
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number"
                            value={budgetValue}
                            onChange={(e) => setBudgetValue(e.target.value)}
                            className="w-24 px-2 py-1 bg-slate-100 dark:bg-gray-800 border border-slate-300 dark:border-gray-700 rounded text-sm text-slate-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-600"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter")
                                handleSaveBudget(campaign._id);
                              if (e.key === "Escape") {
                                setEditingBudget(null);
                                setBudgetValue("");
                              }
                            }}
                          />
                          <button
                            onClick={() => handleSaveBudget(campaign._id)}
                            className="p-1 text-emerald-400 hover:text-emerald-300"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingBudget(null);
                              setBudgetValue("");
                            }}
                            className="p-1 text-slate-400 dark:text-gray-500 hover:text-slate-500 dark:hover:text-gray-400"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingBudget(campaign._id);
                            setBudgetValue(
                              campaign.dailyBudget?.toString() || "0"
                            );
                          }}
                          className="inline-flex items-center gap-1 text-slate-700 dark:text-gray-300 hover:text-slate-900 dark:hover:text-gray-100 group"
                        >
                          {formatCurrency(campaign.dailyBudget || 0)}
                          <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                        </button>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-700 dark:text-gray-300 text-right">
                      {formatCurrency(campaign.metrics?.spend || 0)}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-700 dark:text-gray-300 text-right">
                      {(campaign.metrics?.impressions || 0).toLocaleString(
                        "pt-BR"
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-700 dark:text-gray-300 text-right">
                      {(campaign.metrics?.clicks || 0).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-700 dark:text-gray-300 text-right">
                      {(campaign.metrics?.ctr || 0).toFixed(2)}%
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-700 dark:text-gray-300 text-right">
                      {formatCurrency(campaign.metrics?.cpc || 0)}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <button
                        onClick={() => handleToggleStatus(campaign)}
                        disabled={
                          actionLoading === campaign._id ||
                          campaign.status === "archived"
                        }
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title={
                          campaign.status === "active" ? "Pausar" : "Ativar"
                        }
                      >
                        {campaign.status === "active" ? (
                          <Pause className="w-4 h-4 text-amber-400" />
                        ) : (
                          <Play className="w-4 h-4 text-emerald-400" />
                        )}
                      </button>
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
