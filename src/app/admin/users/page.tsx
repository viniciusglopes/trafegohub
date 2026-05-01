"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  X,
  Users,
} from "lucide-react";

interface User {
  _id: string;
  name: string;
  email: string;
  plan: string;
  status: string;
  role: string;
  createdAt: string;
  lastLoginAt: string | null;
}

interface EditForm {
  plan: string;
  status: string;
  role: string;
}

const plans = ["free", "starter", "pro", "agency"] as const;
const statuses = ["active", "trial", "past_due", "canceled"] as const;
const roles = ["user", "admin"] as const;

const planLabels: Record<string, string> = {
  free: "Free",
  starter: "Starter",
  pro: "Pro",
  agency: "Agency",
};

const statusLabels: Record<string, string> = {
  active: "Ativo",
  trial: "Trial",
  past_due: "Inadimplente",
  canceled: "Cancelado",
};

const planBadgeColors: Record<string, string> = {
  free: "bg-gray-500/20 text-slate-700 dark:text-gray-300",
  starter: "bg-blue-500/20 text-blue-400",
  pro: "bg-purple-500/20 text-purple-400",
  agency: "bg-amber-500/20 text-amber-400",
};

const statusBadgeColors: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-400",
  trial: "bg-amber-500/20 text-amber-400",
  past_due: "bg-red-500/20 text-red-400",
  canceled: "bg-gray-500/20 text-slate-500 dark:text-gray-400",
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [page, setPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    plan: "",
    status: "",
    role: "",
  });
  const [saving, setSaving] = useState(false);
  const limit = 20;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    if (filterPlan) params.set("plan", filterPlan);
    if (filterStatus) params.set("status", filterStatus);
    if (search) params.set("search", search);

    try {
      const res = await fetch(`/api/users?${params.toString()}`);
      const data = await res.json();
      setUsers(data.users ?? data);
      setTotalUsers(data.total ?? data.length ?? 0);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [page, filterPlan, filterStatus, search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    setPage(1);
  }, [search, filterPlan, filterStatus]);

  function openEdit(user: User) {
    setEditingUser(user);
    setEditForm({ plan: user.plan, status: user.status, role: user.role });
  }

  async function handleSave() {
    if (!editingUser) return;
    setSaving(true);
    try {
      await fetch(`/api/users/${editingUser._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      setEditingUser(null);
      fetchUsers();
    } catch {
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(user: User) {
    if (!confirm(`Tem certeza que deseja cancelar o usuario ${user.name}?`))
      return;
    try {
      await fetch(`/api/users/${user._id}`, { method: "DELETE" });
      fetchUsers();
    } catch {}
  }

  const totalPages = Math.max(1, Math.ceil(totalUsers / limit));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Users className="h-8 w-8 text-blue-500" />
        <h1 className="text-3xl font-bold text-slate-900 dark:text-gray-100">
          Gerenciar Usuarios
        </h1>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-lg text-slate-900 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:border-blue-600"
          />
        </div>
        <select
          value={filterPlan}
          onChange={(e) => setFilterPlan(e.target.value)}
          className="px-4 py-2.5 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-lg text-slate-900 dark:text-gray-100 focus:outline-none focus:border-blue-600"
        >
          <option value="">Todos os planos</option>
          {plans.map((p) => (
            <option key={p} value={p}>
              {planLabels[p]}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2.5 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-lg text-slate-900 dark:text-gray-100 focus:outline-none focus:border-blue-600"
        >
          <option value="">Todos os status</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {statusLabels[s]}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-gray-800">
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-500 dark:text-gray-400">
                  Nome
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-500 dark:text-gray-400">
                  Email
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-500 dark:text-gray-400">
                  Plano
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-500 dark:text-gray-400">
                  Status
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-500 dark:text-gray-400">
                  Role
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-500 dark:text-gray-400">
                  Criado em
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-500 dark:text-gray-400">
                  Ultimo login
                </th>
                <th className="text-right px-6 py-4 text-sm font-medium text-slate-500 dark:text-gray-400">
                  Acoes
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-12 text-center text-slate-400 dark:text-gray-500"
                  >
                    Nenhum usuario encontrado.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user._id}
                    className="border-b border-slate-200 dark:border-gray-800 last:border-0 hover:bg-slate-50 dark:hover:bg-gray-800/50"
                  >
                    <td className="px-6 py-4 text-sm text-slate-900 dark:text-gray-100">
                      {user.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-gray-400">
                      {user.email}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full ${planBadgeColors[user.plan] ?? "bg-gray-500/20 text-slate-700 dark:text-gray-300"}`}
                      >
                        {planLabels[user.plan] ?? user.plan}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full ${statusBadgeColors[user.status] ?? "bg-gray-500/20 text-slate-700 dark:text-gray-300"}`}
                      >
                        {statusLabels[user.status] ?? user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-gray-400 capitalize">
                      {user.role}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-gray-400">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-gray-400">
                      {formatDate(user.lastLoginAt)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(user)}
                          className="p-2 text-slate-400 dark:text-gray-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(user)}
                          className="p-2 text-slate-400 dark:text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-gray-800">
          <p className="text-sm text-slate-500 dark:text-gray-400">
            {totalUsers > 0
              ? `${(page - 1) * limit + 1}-${Math.min(page * limit, totalUsers)} de ${totalUsers} usuarios`
              : "0 usuarios"}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-2 text-slate-400 dark:text-gray-400 hover:text-slate-900 dark:hover:text-gray-100 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`min-w-[36px] h-9 rounded-lg text-sm font-medium transition-colors ${
                    page === pageNum
                      ? "bg-blue-600 text-white"
                      : "text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-gray-100 hover:bg-slate-100 dark:hover:bg-gray-800"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-2 text-slate-400 dark:text-gray-400 hover:text-slate-900 dark:hover:text-gray-100 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl w-full max-w-md p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-gray-100">
                Editar Usuario
              </h2>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1 text-slate-400 dark:text-gray-400 hover:text-slate-900 dark:hover:text-gray-100 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-500 dark:text-gray-400 mb-1">
                  Nome
                </label>
                <p className="px-4 py-2.5 bg-slate-100 dark:bg-gray-800 border border-slate-300 dark:border-gray-700 rounded-lg text-slate-700 dark:text-gray-300">
                  {editingUser.name}
                </p>
              </div>
              <div>
                <label className="block text-sm text-slate-500 dark:text-gray-400 mb-1">
                  Email
                </label>
                <p className="px-4 py-2.5 bg-slate-100 dark:bg-gray-800 border border-slate-300 dark:border-gray-700 rounded-lg text-slate-700 dark:text-gray-300">
                  {editingUser.email}
                </p>
              </div>
              <div>
                <label className="block text-sm text-slate-500 dark:text-gray-400 mb-1">
                  Plano
                </label>
                <select
                  value={editForm.plan}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, plan: e.target.value }))
                  }
                  className="w-full px-4 py-2.5 bg-slate-100 dark:bg-gray-800 border border-slate-300 dark:border-gray-700 rounded-lg text-slate-900 dark:text-gray-100 focus:outline-none focus:border-blue-600"
                >
                  {plans.map((p) => (
                    <option key={p} value={p}>
                      {planLabels[p]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-500 dark:text-gray-400 mb-1">
                  Status
                </label>
                <select
                  value={editForm.status}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, status: e.target.value }))
                  }
                  className="w-full px-4 py-2.5 bg-slate-100 dark:bg-gray-800 border border-slate-300 dark:border-gray-700 rounded-lg text-slate-900 dark:text-gray-100 focus:outline-none focus:border-blue-600"
                >
                  {statuses.map((s) => (
                    <option key={s} value={s}>
                      {statusLabels[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-500 dark:text-gray-400 mb-1">
                  Role
                </label>
                <select
                  value={editForm.role}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, role: e.target.value }))
                  }
                  className="w-full px-4 py-2.5 bg-slate-100 dark:bg-gray-800 border border-slate-300 dark:border-gray-700 rounded-lg text-slate-900 dark:text-gray-100 focus:outline-none focus:border-blue-600"
                >
                  {roles.map((r) => (
                    <option key={r} value={r}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 py-2.5 text-sm font-medium text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-gray-100 bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
