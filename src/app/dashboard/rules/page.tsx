"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Workflow,
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
} from "lucide-react";

interface CampaignOption {
  _id: string;
  name: string;
}

interface Rule {
  _id: string;
  name: string;
  active: boolean;
  campaign?: { _id: string; name: string };
  adAccount?: { _id: string; platform: string; accountName: string };
  condition: {
    metric: string;
    operator: string;
    value: number;
  };
  action: {
    type: string;
    value?: number;
  };
  frequency: string;
  triggerCount: number;
  lastTriggeredAt?: string;
}

const METRICS = [
  { value: "spend", label: "Gasto (Spend)" },
  { value: "cpc", label: "CPC" },
  { value: "cpa", label: "CPA" },
  { value: "ctr", label: "CTR" },
  { value: "roas", label: "ROAS" },
  { value: "impressions", label: "Impressoes" },
  { value: "clicks", label: "Cliques" },
];

const OPERATORS = [
  { value: "gt", label: ">" },
  { value: "lt", label: "<" },
  { value: "eq", label: "=" },
  { value: "gte", label: ">=" },
  { value: "lte", label: "<=" },
];

const ACTIONS = [
  { value: "pause", label: "Pausar campanha" },
  { value: "activate", label: "Ativar campanha" },
  { value: "alert", label: "Enviar alerta" },
  { value: "adjust_budget", label: "Ajustar budget" },
];

const FREQUENCIES = [
  { value: "hourly", label: "A cada hora" },
  { value: "daily", label: "Diariamente" },
  { value: "weekly", label: "Semanalmente" },
];

const metricLabels: Record<string, string> = {
  spend: "Gasto",
  cpc: "CPC",
  cpa: "CPA",
  ctr: "CTR",
  roas: "ROAS",
  impressions: "Impressoes",
  clicks: "Cliques",
};

const operatorLabels: Record<string, string> = {
  gt: ">",
  lt: "<",
  eq: "=",
  gte: ">=",
  lte: "<=",
};

const actionLabels: Record<string, string> = {
  pause: "Pausar",
  activate: "Ativar",
  alert: "Alerta",
  adjust_budget: "Ajustar budget",
};

const frequencyLabels: Record<string, string> = {
  hourly: "A cada hora",
  daily: "Diariamente",
  weekly: "Semanalmente",
};

function formatMetricValue(metric: string, value: number): string {
  const currencyMetrics = ["spend", "cpc", "cpa"];
  const percentMetrics = ["ctr"];

  if (currencyMetrics.includes(metric)) {
    return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  if (percentMetrics.includes(metric)) {
    return `${value}%`;
  }

  if (metric === "roas") {
    return `${value}x`;
  }

  return value.toLocaleString("pt-BR");
}

interface RuleFormData {
  name: string;
  campaign: string;
  metric: string;
  operator: string;
  value: string;
  actionType: string;
  actionValue: string;
  frequency: string;
}

const initialFormData: RuleFormData = {
  name: "",
  campaign: "",
  metric: "cpc",
  operator: "gt",
  value: "",
  actionType: "pause",
  actionValue: "",
  frequency: "daily",
};

export default function RulesPage() {
  const { status } = useSession();
  const router = useRouter();
  const [rules, setRules] = useState<Rule[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [formData, setFormData] = useState<RuleFormData>(initialFormData);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const fetchRules = useCallback(async () => {
    try {
      const res = await fetch("/api/rules");
      if (res.ok) {
        const data = await res.json();
        setRules(data);
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
        setCampaigns(data.map((c: CampaignOption) => ({ _id: c._id, name: c.name })));
      }
    } catch {
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      fetchRules();
      fetchCampaigns();
    }
  }, [status, fetchRules, fetchCampaigns]);

  function openCreateModal() {
    setEditingRule(null);
    setFormData(initialFormData);
    setShowModal(true);
  }

  function openEditModal(rule: Rule) {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      campaign: rule.campaign?._id || "",
      metric: rule.condition.metric,
      operator: rule.condition.operator,
      value: rule.condition.value.toString(),
      actionType: rule.action.type,
      actionValue: rule.action.value?.toString() || "",
      frequency: rule.frequency,
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!formData.name || !formData.value) return;

    setSaving(true);

    const payload = {
      name: formData.name,
      campaign: formData.campaign || null,
      condition: {
        metric: formData.metric,
        operator: formData.operator,
        value: parseFloat(formData.value),
      },
      action: {
        type: formData.actionType,
        value:
          formData.actionType === "adjust_budget" && formData.actionValue
            ? parseFloat(formData.actionValue)
            : undefined,
      },
      frequency: formData.frequency,
    };

    try {
      if (editingRule) {
        const res = await fetch(`/api/rules/${editingRule._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const updated = await res.json();
          setRules((prev) =>
            prev.map((r) => (r._id === updated._id ? updated : r))
          );
        }
      } else {
        const res = await fetch("/api/rules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const created = await res.json();
          setRules((prev) => [created, ...prev]);
        }
      }
      setShowModal(false);
    } catch {
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(rule: Rule) {
    try {
      const res = await fetch(`/api/rules/${rule._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !rule.active }),
      });
      if (res.ok) {
        const updated = await res.json();
        setRules((prev) =>
          prev.map((r) => (r._id === updated._id ? updated : r))
        );
      }
    } catch {
    }
  }

  async function handleDelete(ruleId: string) {
    setDeleting(ruleId);
    try {
      const res = await fetch(`/api/rules/${ruleId}`, { method: "DELETE" });
      if (res.ok) {
        setRules((prev) => prev.filter((r) => r._id !== ruleId));
      }
    } catch {
    } finally {
      setDeleting(null);
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
          <Workflow className="w-7 h-7 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-100">
            Regras Automaticas
          </h1>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova Regra
        </button>
      </div>

      {loading ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center text-gray-500">
          Carregando...
        </div>
      ) : rules.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <Workflow className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">
            Nenhuma regra criada ainda. Crie regras para automatizar acoes nas
            suas campanhas.
          </p>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Criar primeira regra
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {rules.map((rule) => (
            <div
              key={rule._id}
              className={`bg-gray-900 border rounded-xl p-5 ${
                rule.active ? "border-gray-800" : "border-gray-800/50 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-base font-semibold text-gray-100 truncate">
                      {rule.name}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        rule.active
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-gray-700 text-gray-500"
                      }`}
                    >
                      {rule.active ? "Ativa" : "Inativa"}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                    <span className="text-gray-400">
                      <span className="text-gray-500">Se</span>{" "}
                      <span className="text-blue-400 font-medium">
                        {metricLabels[rule.condition.metric] || rule.condition.metric}
                      </span>{" "}
                      <span className="text-gray-300">
                        {operatorLabels[rule.condition.operator]}
                      </span>{" "}
                      <span className="text-gray-100 font-medium">
                        {formatMetricValue(rule.condition.metric, rule.condition.value)}
                      </span>
                    </span>
                    <span className="text-gray-600">|</span>
                    <span className="text-gray-400">
                      <span className="text-gray-500">Acao:</span>{" "}
                      <span className="text-amber-400 font-medium">
                        {actionLabels[rule.action.type] || rule.action.type}
                      </span>
                      {rule.action.type === "adjust_budget" && rule.action.value != null && (
                        <span className="text-gray-300">
                          {" "}
                          R$ {rule.action.value.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      )}
                    </span>
                    <span className="text-gray-600">|</span>
                    <span className="text-gray-500">
                      {frequencyLabels[rule.frequency] || rule.frequency}
                    </span>
                    {rule.campaign && (
                      <>
                        <span className="text-gray-600">|</span>
                        <span className="text-gray-500">
                          Campanha:{" "}
                          <span className="text-gray-400">
                            {rule.campaign.name}
                          </span>
                        </span>
                      </>
                    )}
                    {!rule.campaign && (
                      <>
                        <span className="text-gray-600">|</span>
                        <span className="text-gray-500">Todas as campanhas</span>
                      </>
                    )}
                  </div>
                  {rule.triggerCount > 0 && (
                    <p className="mt-2 text-xs text-gray-600">
                      Disparada {rule.triggerCount} vez
                      {rule.triggerCount !== 1 ? "es" : ""}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleToggleActive(rule)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      rule.active ? "bg-blue-600" : "bg-gray-700"
                    }`}
                    title={rule.active ? "Desativar" : "Ativar"}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                        rule.active ? "left-5" : "left-0.5"
                      }`}
                    />
                  </button>
                  <button
                    onClick={() => openEditModal(rule)}
                    className="p-1.5 rounded-lg hover:bg-gray-800 transition-colors text-gray-500 hover:text-gray-300"
                    title="Editar"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(rule._id)}
                    disabled={deleting === rule._id}
                    className="p-1.5 rounded-lg hover:bg-gray-800 transition-colors text-gray-500 hover:text-red-400 disabled:opacity-50"
                    title="Excluir"
                  >
                    {deleting === rule._id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowModal(false)}
          />
          <div className="relative bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-100">
                {editingRule ? "Editar Regra" : "Nova Regra"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">
                  Nome da regra
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Ex: Pausar se CPC alto"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">
                  Campanha
                </label>
                <select
                  value={formData.campaign}
                  onChange={(e) =>
                    setFormData({ ...formData, campaign: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                >
                  <option value="">Todas as campanhas</option>
                  {campaigns.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">
                  Condicao
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={formData.metric}
                    onChange={(e) =>
                      setFormData({ ...formData, metric: e.target.value })
                    }
                    className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  >
                    {METRICS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={formData.operator}
                    onChange={(e) =>
                      setFormData({ ...formData, operator: e.target.value })
                    }
                    className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  >
                    {OPERATORS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={formData.value}
                    onChange={(e) =>
                      setFormData({ ...formData, value: e.target.value })
                    }
                    placeholder="Valor"
                    step="any"
                    className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">
                  Acao
                </label>
                <select
                  value={formData.actionType}
                  onChange={(e) =>
                    setFormData({ ...formData, actionType: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                >
                  {ACTIONS.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
                {formData.actionType === "adjust_budget" && (
                  <input
                    type="number"
                    value={formData.actionValue}
                    onChange={(e) =>
                      setFormData({ ...formData, actionValue: e.target.value })
                    }
                    placeholder="Novo budget (R$)"
                    step="any"
                    className="w-full mt-2 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">
                  Frequencia
                </label>
                <select
                  value={formData.frequency}
                  onChange={(e) =>
                    setFormData({ ...formData, frequency: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                >
                  {FREQUENCIES.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-800">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-gray-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formData.name || !formData.value}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingRule ? "Salvar" : "Criar regra"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
