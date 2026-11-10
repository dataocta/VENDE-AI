import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Shield,
  Search,
  RefreshCw,
  ExternalLink,
  UserCheck,
  UserX,
  Clock,
  Phone,
  Mail,
  Copy,
  Check,
  Building2,
  Calendar,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { UserAccount, SubscriptionStatus } from '../types';
import { getAllUsersFirestore, updateUserSubscriptionFirestore } from '../utils/firestoreService';
import { getRegisteredUsers, saveRegisteredUsers } from '../utils/authStorage';
import { formatDateOnlyBR } from '../utils/receipt';

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserEmail?: string;
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  isOpen,
  onClose,
  currentUserEmail,
}) => {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'trial' | 'blocked'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [confirmingBlockUserId, setConfirmingBlockUserId] = useState<string | null>(null);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch from Firestore
      const firestoreUsers = await getAllUsersFirestore();

      // 2. Also check local users
      const localUsers = getRegisteredUsers();

      // Merge by ID / email, preferring firestore data
      const mergedMap = new Map<string, UserAccount>();

      localUsers.forEach((u) => {
        mergedMap.set(u.id, u);
      });

      firestoreUsers.forEach((u) => {
        mergedMap.set(u.id, u);
      });

      const list = Array.from(mergedMap.values());
      // Sort newest first
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

      setUsers(list);
    } catch (err) {
      console.error('Failed to load users for admin panel', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleSetStatus = async (
    targetUser: UserAccount,
    newStatus: SubscriptionStatus,
    days?: number
  ) => {
    setUpdatingUserId(targetUser.id);
    setActionSuccessMessage(null);
    setConfirmingBlockUserId(null);

    const now = new Date();
    let newTrialEnd = targetUser.trialEndsAt;
    if (newStatus === 'trial') {
      newTrialEnd = new Date(now.getTime() + (days || 7) * 24 * 60 * 60 * 1000).toISOString();
    } else if (newStatus === 'blocked' || newStatus === 'expired') {
      newTrialEnd = new Date(Date.now() - 1000 * 60 * 60).toISOString();
    }

    const updatedUser: UserAccount = {
      ...targetUser,
      subscriptionStatus: newStatus,
      trialEndsAt: newTrialEnd,
      blockedAt: newStatus === 'blocked' ? now.toISOString() : undefined,
      subscriptionPaidAt: newStatus === 'active' ? now.toISOString() : targetUser.subscriptionPaidAt,
    };

    // 1. Immediate optimistic UI update
    setUsers((prev) => prev.map((u) => (u.id === targetUser.id ? updatedUser : u)));

    // 2. Update local registered users cache
    const local = getRegisteredUsers();
    const idx = local.findIndex((u) => u.id === targetUser.id || u.email.toLowerCase() === targetUser.email.toLowerCase());
    if (idx >= 0) {
      local[idx] = updatedUser;
    } else {
      local.unshift(updatedUser);
    }
    saveRegisteredUsers(local);

    // 3. Persist to Cloud Firestore database
    try {
      await updateUserSubscriptionFirestore(targetUser.id, newStatus, days);
    } catch (err) {
      console.warn('Non-blocking: could not update Firestore immediately', err);
    }

    const statusLabels: Record<SubscriptionStatus, string> = {
      active: 'Acesso Liberado (Ativo)',
      trial: `Teste Grátis Atualizado (+${days || 7} dias)`,
      expired: 'Acesso Expirado',
      blocked: 'Acesso Bloqueado com Sucesso',
    };

    setActionSuccessMessage(
      `Usuário "${targetUser.name || targetUser.email}": ${statusLabels[newStatus]}!`
    );

    setTimeout(() => setActionSuccessMessage(null), 4000);
    setUpdatingUserId(null);
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const isBlockedOrExpired = u.subscriptionStatus === 'blocked' || u.subscriptionStatus === 'expired';
      if (statusFilter === 'active' && u.subscriptionStatus !== 'active') return false;
      if (statusFilter === 'trial' && u.subscriptionStatus !== 'trial') return false;
      if (statusFilter === 'blocked' && !isBlockedOrExpired) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const mName = (u.name || '').toLowerCase().includes(q);
        const mEmail = (u.email || '').toLowerCase().includes(q);
        const mPhone = (u.phone || '').toLowerCase().includes(q);
        const mBus = (u.businessName || '').toLowerCase().includes(q);
        const mId = (u.id || '').toLowerCase().includes(q);
        return mName || mEmail || mPhone || mBus || mId;
      }
      return true;
    });
  }, [users, statusFilter, searchTerm]);

  const counts = useMemo(() => {
    return {
      all: users.length,
      active: users.filter((u) => u.subscriptionStatus === 'active').length,
      trial: users.filter((u) => u.subscriptionStatus === 'trial').length,
      blocked: users.filter((u) => u.subscriptionStatus === 'blocked' || u.subscriptionStatus === 'expired').length,
    };
  }, [users]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto overscroll-contain">
      <div className="w-full sm:max-w-2xl bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden">
        {/* Header */}
        <div className="shrink-0 bg-slate-900 text-white px-5 py-4 border-b border-slate-800 flex items-center justify-between z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight">Painel do Administrador</h2>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Admin
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Gerencie, libere e bloqueie o acesso de todos os usuários
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadUsers}
              disabled={isLoading}
              title="Recarregar usuários"
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Success Banner */}
        {actionSuccessMessage && (
          <div className="bg-emerald-600 text-white text-xs font-bold px-4 py-2.5 flex items-center justify-between shrink-0 shadow-xs">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{actionSuccessMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionSuccessMessage(null)}
              className="text-white/80 hover:text-white text-xs font-bold px-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* Controls: Search, Filters & Direct DB Link */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 shrink-0 space-y-3">
          {/* Quick Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nome, e-mail, WhatsApp ou ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="text-slate-400 hover:text-slate-600 absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Status Tabs */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                Todos ({counts.all})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === 'active'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                🟢 Liberados ({counts.active})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('trial')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === 'trial'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                🟡 Em Teste ({counts.trial})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('blocked')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === 'blocked'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                🔴 Bloqueados ({counts.blocked})
              </button>
            </div>

            {/* Direct console link */}
            <a
              href="https://console.firebase.google.com/project/articulate-ridge-scf5x/firestore/databases/ai-studio-ruaprovendasdesp-3f16ef07-62a7-449f-8e48-d33ac9c19eb0/data/users"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-bold text-slate-600 hover:text-emerald-700 bg-white border border-slate-200 hover:border-emerald-300 px-2.5 py-1.5 rounded-xl flex items-center gap-1 shrink-0 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Abrir Firebase</span>
            </a>
          </div>
        </div>

        {/* Users List Body */}
        <div className="p-4 space-y-3 overflow-y-auto flex-1 overscroll-contain">
          {isLoading && users.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600" />
              <p>Carregando usuários do banco de dados...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 space-y-2">
              <UserX className="w-8 h-8 mx-auto text-slate-300" />
              <p className="font-bold text-slate-700">Nenhum usuário encontrado</p>
              <p>
                {searchTerm
                  ? 'Nenhum usuário corresponde aos critérios da busca.'
                  : 'Nenhum usuário cadastrado nesta categoria.'}
              </p>
            </div>
          ) : (
            filteredUsers.map((u) => {
              const isAdminUser = u.email.toLowerCase() === 'cosquinha66@gmail.com';
              const cleanPhone = (u.phone || '').replace(/\D/g, '');
              const isUpdating = updatingUserId === u.id;
              const isConfirmingBlock = confirmingBlockUserId === u.id;
              const isBlocked = u.subscriptionStatus === 'blocked' || u.subscriptionStatus === 'expired';

              return (
                <div
                  key={u.id}
                  className={`bg-white border rounded-2xl p-4 shadow-xs space-y-3 transition-all ${
                    isBlocked
                      ? 'border-rose-200 bg-rose-50/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Top line: Name, Badges, Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold text-sm text-slate-900 truncate">
                          {u.name || 'Sem nome'}
                        </span>
                        {isAdminUser && (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 border border-purple-200">
                            Super Admin
                          </span>
                        )}
                      </div>

                      {/* Business & Date */}
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-500">
                        {u.businessName && (
                          <span className="flex items-center gap-1 font-medium">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            <span>{u.businessName}</span>
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>Cadastrado em {formatDateOnlyBR(u.createdAt.split('T')[0])}</span>
                        </span>
                      </div>
                    </div>

                    {/* Status Pill */}
                    <div className="shrink-0">
                      {u.subscriptionStatus === 'active' ? (
                        <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Liberado (Ativo)</span>
                        </span>
                      ) : u.subscriptionStatus === 'trial' ? (
                        <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>Em Teste</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-rose-600 text-white flex items-center gap-1 shadow-xs">
                          <Lock className="w-3.5 h-3.5" />
                          <span>Bloqueado</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Contacts info: Email and WhatsApp */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0 truncate text-slate-700">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate font-medium">{u.email || 'Sem e-mail'}</span>
                      </div>
                      {u.email && (
                        <button
                          type="button"
                          onClick={() => handleCopy(u.email, `email_${u.id}`)}
                          title="Copiar e-mail"
                          className="p-1 text-slate-400 hover:text-slate-600 shrink-0"
                        >
                          {copiedId === `email_${u.id}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0 truncate text-slate-700">
                        <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate font-medium">{u.phone || 'Sem WhatsApp'}</span>
                      </div>
                      {cleanPhone.length >= 10 && (
                        <a
                          href={`https://wa.me/55${cleanPhone}?text=Ol%C3%A1%20${encodeURIComponent(
                            u.name.split(' ')[0]
                          )}%2C%20informamos%20sobre%20sua%20conta%20no%20Vende.ai.`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 transition-colors"
                        >
                          WhatsApp
                        </a>
                      )}
                    </div>
                  </div>

                  {/* INLINE BLOCK CONFIRMATION BANNER */}
                  {isConfirmingBlock && (
                    <div className="p-3 rounded-xl bg-rose-100 border border-rose-300 text-rose-950 text-xs space-y-2">
                      <div className="flex items-center gap-2 font-black text-rose-900">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>Confirmar Bloqueio de Acesso</span>
                      </div>
                      <p className="text-[11px] text-rose-800 leading-relaxed">
                        Tem certeza que deseja bloquear <strong>{u.name || u.email}</strong>? O aplicativo deste usuário será bloqueado imediatamente.
                      </p>
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setConfirmingBlockUserId(null)}
                          className="px-3 py-1.5 rounded-xl bg-white text-slate-700 font-bold hover:bg-slate-50 border border-slate-200 transition-all text-xs"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleSetStatus(u, 'blocked')}
                          className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black transition-all shadow-xs text-xs flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Sim, Bloquear Agora</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons to Release / Approve / Block */}
                  {!isConfirmingBlock && (
                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                      <div className="text-[11px] text-slate-400">
                        {u.subscriptionStatus === 'trial' && u.trialEndsAt && (
                          <span>Teste até: {formatDateOnlyBR(u.trialEndsAt.split('T')[0])}</span>
                        )}
                        {isBlocked && (
                          <span className="text-rose-600 font-bold">Acesso Bloqueado</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* 1. BUTTON: LIBERAR ACESSO (ATIVAR) */}
                        {u.subscriptionStatus !== 'active' ? (
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleSetStatus(u, 'active', 365)}
                            className="px-3 py-1.5 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>{isBlocked ? 'Desbloquear (Ativar)' : 'Liberar Acesso (Ativar)'}</span>
                          </button>
                        ) : null}

                        {/* 2. BUTTON: BLOQUEAR USUÁRIO (available for any unblocked user) */}
                        {!isBlocked && (
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => setConfirmingBlockUserId(u.id)}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center gap-1 transition-all disabled:opacity-50"
                          >
                            <Lock className="w-3.5 h-3.5 text-rose-600" />
                            <span>Bloquear</span>
                          </button>
                        )}

                        {/* 3. BUTTONS: +15 e +30 DIAS DE TESTE */}
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleSetStatus(u, 'trial', 15)}
                          className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 flex items-center gap-1 transition-all disabled:opacity-50"
                        >
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>+15 dias</span>
                        </button>

                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleSetStatus(u, 'trial', 30)}
                          className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 flex items-center gap-1 transition-all disabled:opacity-50"
                        >
                          <Clock className="w-3.5 h-3.5 text-emerald-600" />
                          <span>+30 dias</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Logado como: <strong className="text-slate-800">{currentUserEmail || 'cosquinha66@gmail.com'}</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
