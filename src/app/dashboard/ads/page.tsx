"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Image as ImageIcon,
  Pause,
  Play,
  Plus,
  X,
  Loader2,
  Trash2,
} from "lucide-react";

interface AdAccountRef {
  _id: string;
  platform: "meta" | "google" | "tiktok";
  accountName: string;
  accountId: string;
}

interface CampaignRef {
  _id: string;
  name: string;
  adAccount: AdAccountRef;
}

interface AdSetRef {
  _id: string;
  name: string;
}

interface Ad {
  _id: string;
  name: string;
  status: "active" | "paused" | "deleted" | "archived";
  platformAdId: string;
  creative?: {
    title?: string;
    body?: string;
    imageUrl?: string;
    linkUrl?: string;
  };
  campaign: {
    _id: string;
    name: string;
  };
  adAccount: {
    _id: string;
    platform: "meta" | "google" | "tiktok";
    accountName: string;
  };
  adSet: {
    _id: string;
    name: string;
  };
  metrics: {
    spend: number;
    impressions: number;
    clicks: number;
    ctr: number;
    cpc: number;
    conversions: number;
    roas: number;
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
  deleted: "bg-red-500/20 text-red-400",
};

function formatCurrency(value: number) {
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function AdsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [platformFilter, setPlatformFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [campaigns, setCampaigns] = useState<CampaignRef[]>([]);
  const [adSets, setAdSets] = useState<AdSetRef[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [selectedAdSetId, setSelectedAdSetId] = useState("");
  const [adName, setAdName] = useState("");
  const [creativeImageUrl, setCreativeImageUrl] = useState("");
  const [creativeTitle, setCreativeTitle] = useState("");
  const [creativeBody, setCreativeBody] = useState("");
  const [creativeLinkUrl, setCreativeLinkUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const fetchAds = useCallback(async () => {
    try {
      const res = await fetch("/api/ads");
      if (res.ok) {
        const data = await res.json();
        setAds(data);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCampaigns = useCallback(async () => {
    try {
      const res = await fetch("/api/campaigns");
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data);
      }
    } catch {
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      fetchAds();
      fetchCampaigns();
    }
  }, [status, fetchAds, fetchCampaigns]);

  // Fetch ad sets when campaign changes
  useEffect(() => {
    if (!selectedCampaignId) {
      setAdSets([]);
      setSelectedAdSetId("");
      return;
    }

    async function loadAdSets() {
      try {
        const res = await fetch(`/api/campaigns/${selectedCampaignId}`);
        if (res.ok) {
          // Fetch adsets for this campaign's ad account
          const campaign = campaigns.find((c) => c._id === selectedCampaignId);
          if (campaign?.adAccount?._id) {
            const adSetRes = await fetch(
              `/api/ads?campaign=${selectedCampaignId}`
            );
            if (adSetRes.ok) {
              // We'll use a dedicated fetch for adsets
            }
          }
        }
      } catch {
      }
    }

    // Try fetching adsets directly
    fetch(`/api/campaigns/${selectedCampaignId}`)
      .then((r) => r.json())
      .then(() => {
        // For simplicity, list available ad sets from existing ads or let user type adSetId
        // We'll list ad sets by looking at the campaign
        loadAdSets();
      })
      .catch(() => {});
  }, [selectedCampaignId, campaigns]);

  async function handleToggleStatus(ad: Ad) {
    setActionLoading(ad._id);
    const action = ad.status === "active" ? "pause" : "activate";

    try {
      const res = await fetch(`/api/ads/${ad._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (res.ok) {
        const updated = await res.json();
        setAds((prev) =>
          prev.map((a) => (a._id === updated._id ? updated : a))
        );
      }
    } catch {
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(adId: string) {
    if (!confirm("Tem certeza que deseja excluir este anuncio?")) return;

    setActionLoading(adId);
    try {
      const res = await fetch(`/api/ads/${adId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setAds((prev) => prev.filter((a) => a._id !== adId));
      }
    } catch {
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCreateAd() {
    if (!selectedCampaignId || !adName) {
      setFormError("Selecione uma campanha e informe o nome do anuncio.");
      return;
    }

    setSubmitting(true);
    setFormError("");

    const campaign = campaigns.find((c) => c._id === selectedCampaignId);

    try {
      const res = await fetch("/api/ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adAccountId: campaign?.adAccount?._id,
          campaignId: selectedCampaignId,
          adSetId: selectedAdSetId || selectedCampaignId, // fallback
          name: adName,
          creative: {
            imageUrl: creativeImageUrl || undefined,
            title: creativeTitle || undefined,
            body: creativeBody || undefined,
            linkUrl: creativeLinkUrl || undefined,
          },
          platform: campaign?.adAccount?.platform,
        }),
      });

      if (res.ok) {
        const newAd = await res.json();
        setAds((prev) => [newAd, ...prev]);
        resetForm();
        setShowModal(false);
      } else {
        const err = await res.json();
        setFormError(err.error || "Erro ao criar anuncio");
      }
    } catch {
      setFormError("Erro de conexao");
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setSelectedCampaignId("");
    setSelectedAdSetId("");
    setAdName("");
    setCreativeImageUrl("");
    setCreativeTitle("");
    setCreativeBody("");
    setCreativeLinkUrl("");
    setFormError("");
  }

  const filtered = ads.filter((a) => {
    if (platformFilter !== "all" && a.adAccount?.platform !== platformFilter)
      return false;
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
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
          <ImageIcon className="w-7 h-7 text-blue-600" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-gray-100">Anuncios</h1>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Anuncio
        </button>
      </div>

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
          <option value="active">Ativos</option>
          <option value="paused">Pausados</option>
        </select>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl">
        {loading ? (
          <div className="p-8 text-center text-slate-400 dark:text-gray-500">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-400 dark:text-gray-500">
            Nenhum anuncio encontrado. Crie seu primeiro anuncio clicando em
            &quot;Novo Anuncio&quot;.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-slate-400 dark:text-gray-500 uppercase border-b border-slate-200 dark:border-gray-800">
                  <th className="px-5 py-3 font-medium">Criativo</th>
                  <th className="px-5 py-3 font-medium">Nome</th>
                  <th className="px-5 py-3 font-medium">Campanha</th>
                  <th className="px-5 py-3 font-medium">Plataforma</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium text-right">Impressoes</th>
                  <th className="px-5 py-3 font-medium text-right">Cliques</th>
                  <th className="px-5 py-3 font-medium text-right">Gasto</th>
                  <th className="px-5 py-3 font-medium text-center">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((ad) => (
                  <tr
                    key={ad._id}
                    className="border-b border-slate-100 dark:border-gray-800/50 last:border-0 hover:bg-slate-50 dark:hover:bg-gray-800/30"
                  >
                    <td className="px-5 py-3.5">
                      {ad.creative?.imageUrl ? (
                        <img
                          src={ad.creative.imageUrl}
                          alt={ad.name}
                          className="w-10 h-10 rounded object-cover bg-slate-100 dark:bg-gray-800"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-slate-100 dark:bg-gray-800 flex items-center justify-center">
                          <ImageIcon className="w-4 h-4 text-slate-400 dark:text-gray-600" />
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-900 dark:text-gray-100">
                      <div>{ad.name}</div>
                      {ad.creative?.title && (
                        <div className="text-xs text-slate-400 dark:text-gray-500 mt-0.5 truncate max-w-[200px]">
                          {ad.creative.title}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-500 dark:text-gray-400">
                      {ad.campaign?.name || "-"}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${platformBadge[ad.adAccount?.platform] || ""}`}
                      >
                        {ad.adAccount?.platform || "-"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${statusBadge[ad.status] || ""}`}
                      >
                        {ad.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-700 dark:text-gray-300 text-right">
                      {(ad.metrics?.impressions || 0).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-700 dark:text-gray-300 text-right">
                      {(ad.metrics?.clicks || 0).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-700 dark:text-gray-300 text-right">
                      {formatCurrency(ad.metrics?.spend || 0)}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleToggleStatus(ad)}
                          disabled={
                            actionLoading === ad._id ||
                            ad.status === "archived" ||
                            ad.status === "deleted"
                          }
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title={
                            ad.status === "active" ? "Pausar" : "Ativar"
                          }
                        >
                          {actionLoading === ad._id ? (
                            <Loader2 className="w-4 h-4 text-slate-500 dark:text-gray-400 animate-spin" />
                          ) : ad.status === "active" ? (
                            <Pause className="w-4 h-4 text-amber-400" />
                          ) : (
                            <Play className="w-4 h-4 text-emerald-400" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(ad._id)}
                          disabled={actionLoading === ad._id}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal - Novo Anuncio */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-gray-100">
                Novo Anuncio
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="p-1 text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
                  Campanha
                </label>
                <select
                  value={selectedCampaignId}
                  onChange={(e) => setSelectedCampaignId(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-100 dark:bg-gray-800 border border-slate-300 dark:border-gray-700 rounded-lg text-slate-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">Selecione uma campanha</option>
                  {campaigns.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}{" "}
                      {c.adAccount?.platform
                        ? `(${c.adAccount.platform})`
                        : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
                  Conjunto de Anuncios (Ad Set ID)
                </label>
                <input
                  type="text"
                  value={selectedAdSetId}
                  onChange={(e) => setSelectedAdSetId(e.target.value)}
                  placeholder="ID do conjunto de anuncios"
                  className="w-full px-4 py-2 bg-slate-100 dark:bg-gray-800 border border-slate-300 dark:border-gray-700 rounded-lg text-slate-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 placeholder-slate-400 dark:placeholder-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
                  Nome do Anuncio
                </label>
                <input
                  type="text"
                  value={adName}
                  onChange={(e) => setAdName(e.target.value)}
                  placeholder="Ex: Anuncio Principal - Maio"
                  className="w-full px-4 py-2 bg-slate-100 dark:bg-gray-800 border border-slate-300 dark:border-gray-700 rounded-lg text-slate-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 placeholder-slate-400 dark:placeholder-gray-600"
                />
              </div>

              <div className="border-t border-slate-200 dark:border-gray-800 pt-4">
                <h3 className="text-sm font-medium text-slate-700 dark:text-gray-300 mb-3">
                  Criativo
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-slate-400 dark:text-gray-500 mb-1">
                      URL da Imagem
                    </label>
                    <input
                      type="url"
                      value={creativeImageUrl}
                      onChange={(e) => setCreativeImageUrl(e.target.value)}
                      placeholder="https://exemplo.com/imagem.jpg"
                      className="w-full px-4 py-2 bg-slate-100 dark:bg-gray-800 border border-slate-300 dark:border-gray-700 rounded-lg text-slate-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 placeholder-slate-400 dark:placeholder-gray-600"
                    />
                    {creativeImageUrl && (
                      <div className="mt-2">
                        <img
                          src={creativeImageUrl}
                          alt="Preview"
                          className="w-20 h-20 rounded object-cover bg-slate-100 dark:bg-gray-800"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 dark:text-gray-500 mb-1">
                      Titulo
                    </label>
                    <input
                      type="text"
                      value={creativeTitle}
                      onChange={(e) => setCreativeTitle(e.target.value)}
                      placeholder="Titulo do anuncio"
                      className="w-full px-4 py-2 bg-slate-100 dark:bg-gray-800 border border-slate-300 dark:border-gray-700 rounded-lg text-slate-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 placeholder-slate-400 dark:placeholder-gray-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 dark:text-gray-500 mb-1">
                      Texto do Anuncio
                    </label>
                    <textarea
                      value={creativeBody}
                      onChange={(e) => setCreativeBody(e.target.value)}
                      placeholder="Texto principal do anuncio"
                      rows={3}
                      className="w-full px-4 py-2 bg-slate-100 dark:bg-gray-800 border border-slate-300 dark:border-gray-700 rounded-lg text-slate-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 placeholder-slate-400 dark:placeholder-gray-600 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 dark:text-gray-500 mb-1">
                      URL de Destino
                    </label>
                    <input
                      type="url"
                      value={creativeLinkUrl}
                      onChange={(e) => setCreativeLinkUrl(e.target.value)}
                      placeholder="https://seusite.com/oferta"
                      className="w-full px-4 py-2 bg-slate-100 dark:bg-gray-800 border border-slate-300 dark:border-gray-700 rounded-lg text-slate-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 placeholder-slate-400 dark:placeholder-gray-600"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-5 border-t border-slate-200 dark:border-gray-800">
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="px-4 py-2 text-sm font-medium text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateAd}
                disabled={submitting}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                {submitting ? "Criando..." : "Criar Anuncio"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
