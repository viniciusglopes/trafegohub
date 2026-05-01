"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Users, Plus, X, Trash2, Crown, Copy, Check } from "lucide-react";
import Link from "next/link";

interface TeamMember {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
    image?: string;
  };
  role: "admin" | "editor" | "viewer";
  invitedAt: string;
  joinedAt: string;
}

interface TeamInvite {
  _id: string;
  email: string;
  role: "admin" | "editor" | "viewer";
  token: string;
  expiresAt: string;
  createdAt: string;
}

interface TeamOwner {
  _id: string;
  name: string;
  email: string;
  image?: string;
}

interface Team {
  _id: string;
  owner: TeamOwner;
  name: string;
  members: TeamMember[];
  invites: TeamInvite[];
  createdAt: string;
  updatedAt: string;
}

const roleBadge: Record<string, string> = {
  admin: "bg-blue-600/20 text-blue-400",
  editor: "bg-amber-600/20 text-amber-400",
  viewer: "bg-gray-600/20 text-gray-400",
};

const roleLabel: Record<string, string> = {
  admin: "Admin",
  editor: "Editor",
  viewer: "Visualizador",
};

export default function TeamPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [teamName, setTeamName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "editor" | "viewer">("editor");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [lastInviteToken, setLastInviteToken] = useState("");
  const [copied, setCopied] = useState(false);

  // Role change state
  const [changingRole, setChangingRole] = useState<string | null>(null);

  // Remove state
  const [removing, setRemoving] = useState<string | null>(null);

  // Cancel invite state
  const [cancelingInvite, setCancelingInvite] = useState<string | null>(null);

  const userPlan = (session?.user as Record<string, string> | undefined)?.plan;
  const userId = (session?.user as Record<string, string> | undefined)?.id;

  const fetchTeam = useCallback(async () => {
    try {
      const res = await fetch("/api/team");
      if (res.ok) {
        const data = await res.json();
        setTeam(data.team);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchTeam();
    }
  }, [status, fetchTeam]);

  async function handleCreateTeam(e: React.FormEvent) {
    e.preventDefault();
    setCreateError("");

    if (!teamName.trim()) {
      setCreateError("Nome da equipe e obrigatorio.");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: teamName.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        setCreateError(data.error || "Erro ao criar equipe.");
        return;
      }

      const data = await res.json();
      setTeam(data.team);
      setTeamName("");
    } catch {
      setCreateError("Erro de conexao. Tente novamente.");
    } finally {
      setCreating(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError("");
    setLastInviteToken("");

    if (!inviteEmail.trim()) {
      setInviteError("Email e obrigatorio.");
      return;
    }

    setInviting(true);
    try {
      const res = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });

      const data = await res.json();

      if (!res.ok) {
        setInviteError(data.error || "Erro ao enviar convite.");
        return;
      }

      setLastInviteToken(data.invite.token);
      setInviteEmail("");
      fetchTeam();
    } catch {
      setInviteError("Erro de conexao. Tente novamente.");
    } finally {
      setInviting(false);
    }
  }

  async function handleChangeRole(memberId: string, newRole: string) {
    setChangingRole(memberId);
    try {
      const res = await fetch(`/api/team/members/${memberId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      if (res.ok) {
        const data = await res.json();
        setTeam(data.team);
      }
    } catch {
      // silent
    } finally {
      setChangingRole(null);
    }
  }

  async function handleRemoveMember(memberId: string) {
    setRemoving(memberId);
    try {
      const res = await fetch(`/api/team/members/${memberId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        const data = await res.json();
        setTeam(data.team);
      }
    } catch {
      // silent
    } finally {
      setRemoving(null);
    }
  }

  async function handleCancelInvite(inviteEmail: string) {
    setCancelingInvite(inviteEmail);
    // We'll remove the invite by re-fetching after a direct DB call
    // For now, we need an API. We'll use a workaround: re-invite won't work,
    // but for a proper cancel we'd need another endpoint.
    // Since the spec doesn't include a cancel endpoint, we'll skip the actual API call
    // and just remove from UI state
    // TODO: Add cancel invite API endpoint
    setCancelingInvite(null);
  }

  function copyInviteLink(token: string) {
    const link = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not on agency plan
  if (userPlan !== "agency") {
    return (
      <div className="bg-gray-950 min-h-screen">
        <div className="flex items-center gap-3 mb-8">
          <Users className="w-7 h-7 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-100">Equipe</h1>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center max-w-lg mx-auto">
          <Users className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-100 mb-2">
            Disponivel no plano Agency
          </h2>
          <p className="text-gray-500 mb-6">
            O gerenciamento de equipe esta disponivel exclusivamente no plano Agency (R$249/mes).
            Convide membros da sua equipe para colaborar nas suas campanhas.
          </p>
          <Link
            href="/dashboard/plans"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Ver Planos
          </Link>
        </div>
      </div>
    );
  }

  const isOwner = team?.owner?._id === userId;
  const currentMember = team?.members.find((m) => m.user._id === userId);
  const isAdmin = isOwner || currentMember?.role === "admin";

  return (
    <div className="bg-gray-950 min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Users className="w-7 h-7 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-100">Equipe</h1>
        </div>
        {team && isAdmin && (
          <button
            onClick={() => {
              setShowInviteModal(true);
              setInviteError("");
              setLastInviteToken("");
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Convidar Membro
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-12">Carregando...</div>
      ) : !team ? (
        /* Create team form */
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 max-w-lg mx-auto">
          <h2 className="text-lg font-semibold text-gray-100 mb-2">
            Criar Equipe
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            Crie sua equipe para convidar colaboradores e compartilhar acesso as suas contas e campanhas.
          </p>

          {createError && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm text-center">
              {createError}
            </div>
          )}

          <form onSubmit={handleCreateTeam} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">
                Nome da Equipe
              </label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                placeholder="Ex: Minha Agencia"
              />
            </div>
            <button
              type="submit"
              disabled={creating}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? "Criando..." : "Criar Equipe"}
            </button>
          </form>
        </div>
      ) : (
        /* Team management */
        <div className="space-y-6">
          {/* Team info card */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-100">
                  {team.name}
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                  {team.members.length + 1} membro{team.members.length !== 0 ? "s" : ""} na equipe
                </p>
              </div>
            </div>
          </div>

          {/* Members table */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800">
              <h3 className="text-sm font-semibold text-gray-100">Membros</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nome
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Funcao
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Desde
                    </th>
                    {isAdmin && (
                      <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acoes
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {/* Owner row */}
                  <tr>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {team.owner.image ? (
                          <img
                            src={team.owner.image}
                            alt={team.owner.name}
                            className="w-8 h-8 rounded-full"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm font-medium text-gray-300">
                            {team.owner.name?.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="text-sm text-gray-100 font-medium">
                          {team.owner.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {team.owner.email}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-purple-600/20 text-purple-400">
                        <Crown className="w-3 h-3" />
                        Dono
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(team.createdAt).toLocaleDateString("pt-BR")}
                    </td>
                    {isAdmin && <td className="px-6 py-4" />}
                  </tr>

                  {/* Member rows */}
                  {team.members.map((member) => (
                    <tr key={member._id}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {member.user.image ? (
                            <img
                              src={member.user.image}
                              alt={member.user.name}
                              className="w-8 h-8 rounded-full"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm font-medium text-gray-300">
                              {member.user.name?.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="text-sm text-gray-100 font-medium">
                            {member.user.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {member.user.email}
                      </td>
                      <td className="px-6 py-4">
                        {isAdmin ? (
                          <select
                            value={member.role}
                            onChange={(e) =>
                              handleChangeRole(member.user._id, e.target.value)
                            }
                            disabled={changingRole === member.user._id}
                            className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                          >
                            <option value="admin">Admin</option>
                            <option value="editor">Editor</option>
                            <option value="viewer">Visualizador</option>
                          </select>
                        ) : (
                          <span
                            className={`inline-block px-2.5 py-1 rounded text-xs font-medium ${roleBadge[member.role] || ""}`}
                          >
                            {roleLabel[member.role] || member.role}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(member.joinedAt).toLocaleDateString("pt-BR")}
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleRemoveMember(member.user._id)}
                            disabled={removing === member.user._id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-red-500/30 text-red-500 hover:bg-red-500/10 rounded-lg text-xs transition-colors disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            {removing === member.user._id
                              ? "Removendo..."
                              : "Remover"}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pending invites */}
          {team.invites.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-800">
                <h3 className="text-sm font-semibold text-gray-100">
                  Convites Pendentes
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Funcao
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Expira em
                      </th>
                      <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acoes
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {team.invites.map((invite) => (
                      <tr key={invite._id}>
                        <td className="px-6 py-4 text-sm text-gray-100">
                          {invite.email}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-block px-2.5 py-1 rounded text-xs font-medium ${roleBadge[invite.role] || ""}`}
                          >
                            {roleLabel[invite.role] || invite.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {new Date(invite.expiresAt).toLocaleDateString("pt-BR")}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => copyInviteLink(invite.token)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-700 text-gray-400 hover:text-gray-100 hover:bg-gray-800 rounded-lg text-xs transition-colors"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            Copiar Link
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Invite modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowInviteModal(false)}
          />
          <div className="relative bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-100">
                Convidar Membro
              </h2>
              <button
                onClick={() => setShowInviteModal(false)}
                className="p-1 text-gray-500 hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {inviteError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm text-center">
                {inviteError}
              </div>
            )}

            {lastInviteToken ? (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-sm text-center">
                  Convite criado com sucesso!
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">
                    Link do Convite
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`${typeof window !== "undefined" ? window.location.origin : ""}/invite/${lastInviteToken}`}
                      className="flex-1 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 text-sm focus:outline-none"
                    />
                    <button
                      onClick={() => copyInviteLink(lastInviteToken)}
                      className="px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 hover:text-gray-100 transition-colors"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Compartilhe este link com o membro convidado. O convite expira em 7 dias.
                </p>
                <button
                  onClick={() => {
                    setShowInviteModal(false);
                    setLastInviteToken("");
                  }}
                  className="w-full py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-100 font-medium rounded-lg transition-colors"
                >
                  Fechar
                </button>
              </div>
            ) : (
              <form onSubmit={handleInvite} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                    placeholder="email@exemplo.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Funcao
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["admin", "editor", "viewer"] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setInviteRole(r)}
                        className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                          inviteRole === r
                            ? `${roleBadge[r]} ring-2 ring-offset-1 ring-offset-gray-900 ring-blue-600`
                            : "bg-gray-800 text-gray-400 hover:text-gray-300"
                        }`}
                      >
                        {roleLabel[r]}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={inviting}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {inviting ? "Enviando..." : "Enviar Convite"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
