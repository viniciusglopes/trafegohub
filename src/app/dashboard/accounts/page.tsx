"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Link2, Plus, X, Trash2 } from "lucide-react";

interface AdAccount {
  _id: string;
  platform: "meta" | "google" | "tiktok";
  accountId: string;
  accountName: string;
  status: "connected" | "expired" | "error";
  lastSync?: string;
  createdAt: string;
}

const platformConfig: Record<
  string,
  { label: string; badge: string; color: string }
> = {
  meta: {
    label: "Meta",
    badge: "bg-blue-600/20 text-blue-400",
    color: "border-blue-600",
  },
  google: {
    label: "Google",
    badge: "bg-red-600/20 text-red-400",
    color: "border-red-600",
  },
  tiktok: {
    label: "TikTok",
    badge: "bg-pink-600/20 text-pink-400",
    color: "border-pink-600",
  },
};

const statusConfig: Record<string, { label: string; dot: string }> = {
  connected: { label: "Conectada", dot: "bg-emerald-500" },
  expired: { label: "Expirada", dot: "bg-red-500" },
  error: { label: "Erro", dot: "bg-red-500" },
};

export default function AccountsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formPlatform, setFormPlatform] = useState<
    "meta" | "google" | "tiktok"
  >("meta");
  const [formAccountId, setFormAccountId] = useState("");
  const [formAccountName, setFormAccountName] = useState("");
  const [formAccessToken, setFormAccessToken] = useState("");
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [metaConnected, setMetaConnected] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [tiktokConnected, setTiktokConnected] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const search = window.location.search;
    if (search.includes("connected=meta")) {
      setMetaConnected(true);
      const timer = setTimeout(() => setMetaConnected(false), 5000);
      return () => clearTimeout(timer);
    }
    if (search.includes("connected=google")) {
      setGoogleConnected(true);
      const timer = setTimeout(() => setGoogleConnected(false), 5000);
      return () => clearTimeout(timer);
    }
    if (search.includes("connected=tiktok")) {
      setTiktokConnected(true);
      const timer = setTimeout(() => setTiktokConnected(false), 5000);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/ad-accounts");
      if (res.ok) {
        const data = await res.json();
        setAccounts(data);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      fetchAccounts();
    }
  }, [status, fetchAccounts]);

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!formAccountId || !formAccountName) {
      setFormError("Preencha todos os campos obrigatorios.");
      return;
    }

    setFormLoading(true);

    try {
      const res = await fetch("/api/ad-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: formPlatform,
          accountId: formAccountId,
          accountName: formAccountName,
          credentials: {
            accessToken: formAccessToken,
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setFormError(data.error || "Erro ao conectar conta.");
        setFormLoading(false);
        return;
      }

      const newAccount = await res.json();
      setAccounts((prev) => [newAccount, ...prev]);
      setShowModal(false);
      setFormAccountId("");
      setFormAccountName("");
      setFormAccessToken("");
      setFormPlatform("meta");
    } catch {
      setFormError("Erro de conexao. Tente novamente.");
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleteLoading(id);

    try {
      const res = await fetch(`/api/ad-accounts/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setAccounts((prev) => prev.filter((a) => a._id !== id));
      }
    } catch {
    } finally {
      setDeleteLoading(null);
    }
  }

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-gray-950 min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Link2 className="w-7 h-7 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-100">
            Contas de Anuncio
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/api/meta/oauth"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2.04C6.5 2.04 2 6.53 2 12.06C2 17.06 5.66 21.21 10.44 21.96V14.96H7.9V12.06H10.44V9.85C10.44 7.34 11.93 5.96 14.22 5.96C15.31 5.96 16.45 6.15 16.45 6.15V8.62H15.19C13.95 8.62 13.56 9.39 13.56 10.18V12.06H16.34L15.89 14.96H13.56V21.96A10 10 0 0 0 22 12.06C22 6.53 17.5 2.04 12 2.04Z" />
            </svg>
            Conectar Meta Ads
          </a>
          <a
            href="/api/google-ads/oauth"
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Conectar Google Ads
          </a>
          <a
            href="/api/tiktok/oauth"
            className="flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.88-2.88 2.89 2.89 0 0 1 2.88-2.88c.28 0 .56.04.81.11v-3.5a6.37 6.37 0 0 0-.81-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.71a8.21 8.21 0 0 0 4.76 1.52V6.81a4.83 4.83 0 0 1-1-.12z" />
            </svg>
            Conectar TikTok Ads
          </a>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-100 text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Conectar Manual
          </button>
        </div>
      </div>

      {metaConnected && (
        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-sm">
          Contas do Meta Ads conectadas com sucesso!
        </div>
      )}

      {googleConnected && (
        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-sm">
          Contas do Google Ads conectadas com sucesso!
        </div>
      )}

      {tiktokConnected && (
        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-sm">
          Contas do TikTok Ads conectadas com sucesso!
        </div>
      )}

      {loading ? (
        <div className="text-center text-gray-500 py-12">Carregando...</div>
      ) : accounts.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <Link2 className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-500">
            Nenhuma conta conectada. Clique em &quot;Conectar Conta&quot; para
            comecar.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account) => {
            const platform = platformConfig[account.platform];
            const statusInfo = statusConfig[account.status];

            return (
              <div
                key={account._id}
                className={`bg-gray-900 border border-gray-800 rounded-xl p-5 border-l-4 ${platform?.color || ""}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <span
                    className={`px-2.5 py-1 rounded text-xs font-medium ${platform?.badge || ""}`}
                  >
                    {platform?.label || account.platform}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <div
                      className={`w-2 h-2 rounded-full ${statusInfo?.dot || ""}`}
                    />
                    <span className="text-xs text-gray-500">
                      {statusInfo?.label || account.status}
                    </span>
                  </div>
                </div>

                <h3 className="text-gray-100 font-medium mb-1">
                  {account.accountName}
                </h3>
                <p className="text-gray-500 text-sm mb-4">
                  ID: {account.accountId}
                </p>

                <button
                  onClick={() => handleDelete(account._id)}
                  disabled={deleteLoading === account._id}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-red-500/30 text-red-500 hover:bg-red-500/10 rounded-lg text-sm transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {deleteLoading === account._id
                    ? "Removendo..."
                    : "Desconectar"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowModal(false)}
          />
          <div className="relative bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-100">
                Conectar Conta
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-gray-500 hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm text-center">
                {formError}
              </div>
            )}

            <form onSubmit={handleConnect} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Plataforma
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["meta", "google", "tiktok"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setFormPlatform(p)}
                      className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                        formPlatform === p
                          ? `${platformConfig[p].badge} ring-2 ring-offset-1 ring-offset-gray-900 ring-blue-600`
                          : "bg-gray-800 text-gray-400 hover:text-gray-300"
                      }`}
                    >
                      {platformConfig[p].label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">
                  ID da Conta
                </label>
                <input
                  type="text"
                  value={formAccountId}
                  onChange={(e) => setFormAccountId(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  placeholder="Ex: act_123456789"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">
                  Nome da Conta
                </label>
                <input
                  type="text"
                  value={formAccountName}
                  onChange={(e) => setFormAccountName(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  placeholder="Minha conta de anuncios"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">
                  Access Token
                </label>
                <textarea
                  value={formAccessToken}
                  onChange={(e) => setFormAccessToken(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent resize-none"
                  placeholder="Cole seu access token aqui"
                />
              </div>

              <button
                type="submit"
                disabled={formLoading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {formLoading ? "Conectando..." : "Conectar"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
