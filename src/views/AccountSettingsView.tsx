import React, { useState } from 'react';
import {
  User,
  Tag,
  Plus,
  Trash2,
  Check,
  Building2,
  Phone,
  QrCode,
  ShieldCheck,
  Download,
  Upload,
  LogOut,
  Shield,
  Edit2,
  ArrowDownRight,
  RotateCcw,
  AlertTriangle,
  Package,
} from 'lucide-react';
import { BusinessSettings, UserAccount, Product, Expense } from '../types';
import { DEFAULT_PRODUCT_CATEGORIES, DEFAULT_EXPENSE_CATEGORIES } from '../utils/storage';
import { getExpenseCategoryIcon, normalizeExpenseCategoryName } from '../utils/expenseCategories';

type SettingsSubTab = 'conta' | 'produtos' | 'despesas' | 'backup';

interface AccountSettingsViewProps {
  settings: BusinessSettings;
  user: UserAccount | null;
  products: Product[];
  expenses?: Expense[];
  onUpdateSettings: (settings: BusinessSettings) => void;
  onUpdateUserAccount?: (updatedUser: Partial<UserAccount>) => void;
  onExportData: () => void;
  onImportData: (jsonStr: string) => void;
  onResetData: () => void;
  onLogout: () => void;
  onOpenAdminPanel?: () => void;
  onOpenSubscriptionModal?: () => void;
}

export const AccountSettingsView: React.FC<AccountSettingsViewProps> = ({
  settings,
  user,
  products,
  expenses = [],
  onUpdateSettings,
  onUpdateUserAccount,
  onExportData,
  onImportData,
  onResetData,
  onLogout,
  onOpenAdminPanel,
  onOpenSubscriptionModal,
}) => {
  // Active sub-tab state (default to 'conta' or 'despesas')
  const [subTab, setSubTab] = useState<SettingsSubTab>('conta');

  // Account details form state
  const [userName, setUserName] = useState(user?.name || settings.sellerName || '');
  const [userPhone, setUserPhone] = useState(user?.phone || settings.phone || '');
  const [businessName, setBusinessName] = useState(user?.businessName || settings.businessName || '');
  const [pixKey, setPixKey] = useState(settings.pixKey || '');
  const [pixKeyType, setPixKeyType] = useState(settings.pixKeyType || 'telefone');
  const [accountSaved, setAccountSaved] = useState(false);

  // Product categories management state
  const currentCategories = settings.categories && settings.categories.length > 0
    ? settings.categories
    : DEFAULT_PRODUCT_CATEGORIES;

  const [newCatName, setNewCatName] = useState('');
  const [editingCatIndex, setEditingCatIndex] = useState<number | null>(null);
  const [editingCatValue, setEditingCatValue] = useState('');
  const [categoriesSaved, setCategoriesSaved] = useState(false);
  const [deletingProductCat, setDeletingProductCat] = useState<string | null>(null);

  // Expense categories management state
  const currentExpenseCategories = settings.expenseCategories && settings.expenseCategories.length > 0
    ? settings.expenseCategories
    : DEFAULT_EXPENSE_CATEGORIES;

  const [newExpenseCatName, setNewExpenseCatName] = useState('');
  const [editingExpenseCatIndex, setEditingExpenseCatIndex] = useState<number | null>(null);
  const [editingExpenseCatValue, setEditingExpenseCatValue] = useState('');
  const [expenseCategoriesSaved, setExpenseCategoriesSaved] = useState(false);
  const [deletingExpenseCat, setDeletingExpenseCat] = useState<string | null>(null);
  const [confirmingResetData, setConfirmingResetData] = useState(false);
  const [confirmingResetExpenseCats, setConfirmingResetExpenseCats] = useState(false);

  // Handle saving account details
  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();

    onUpdateSettings({
      ...settings,
      businessName: businessName.trim() || 'Meu Negócio',
      sellerName: userName.trim() || 'Vendedor',
      phone: userPhone.trim(),
      pixKey: pixKey.trim(),
      pixKeyType,
    });

    if (onUpdateUserAccount) {
      onUpdateUserAccount({
        name: userName.trim(),
        phone: userPhone.trim(),
        businessName: businessName.trim(),
      });
    }

    setAccountSaved(true);
    setTimeout(() => setAccountSaved(false), 2500);
  };

  // Handle adding new product category
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newCatName.trim();
    if (!clean) return;

    if (currentCategories.some((c) => c.toLowerCase() === clean.toLowerCase())) {
      alert('Esta categoria de produto já existe!');
      return;
    }

    const updated = [...currentCategories, clean];
    onUpdateSettings({
      ...settings,
      categories: updated,
    });
    setNewCatName('');
    setCategoriesSaved(true);
    setTimeout(() => setCategoriesSaved(false), 2000);
  };

  // Handle renaming existing product category
  const handleSaveRenameCategory = (index: number) => {
    const clean = editingCatValue.trim();
    if (!clean) return;

    const oldName = currentCategories[index];
    if (oldName === clean) {
      setEditingCatIndex(null);
      return;
    }

    const updated = [...currentCategories];
    updated[index] = clean;

    onUpdateSettings({
      ...settings,
      categories: updated,
    });

    setEditingCatIndex(null);
    setCategoriesSaved(true);
    setTimeout(() => setCategoriesSaved(false), 2000);
  };

  // Handle deleting product category
  const handleConfirmDeleteCategory = (catToDelete: string) => {
    const updated = currentCategories.filter((c) => c !== catToDelete);
    onUpdateSettings({
      ...settings,
      categories: updated.length > 0 ? updated : ['Geral'],
    });
    setDeletingProductCat(null);
    setCategoriesSaved(true);
    setTimeout(() => setCategoriesSaved(false), 2000);
  };

  // --- EXPENSE CATEGORIES HANDLERS ---
  const handleAddExpenseCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newExpenseCatName.trim();
    if (!clean) return;

    if (currentExpenseCategories.some((c) => c.toLowerCase() === clean.toLowerCase())) {
      alert('Esta categoria de despesa já existe!');
      return;
    }

    const updated = [...currentExpenseCategories, clean];
    onUpdateSettings({
      ...settings,
      expenseCategories: updated,
    });
    setNewExpenseCatName('');
    setExpenseCategoriesSaved(true);
    setTimeout(() => setExpenseCategoriesSaved(false), 2000);
  };

  const handleSaveRenameExpenseCategory = (index: number) => {
    const clean = editingExpenseCatValue.trim();
    if (!clean) return;

    const oldName = currentExpenseCategories[index];
    if (oldName === clean) {
      setEditingExpenseCatIndex(null);
      return;
    }

    const updated = [...currentExpenseCategories];
    updated[index] = clean;

    onUpdateSettings({
      ...settings,
      expenseCategories: updated,
    });

    setEditingExpenseCatIndex(null);
    setExpenseCategoriesSaved(true);
    setTimeout(() => setExpenseCategoriesSaved(false), 2000);
  };

  const handleConfirmDeleteExpenseCategory = (catToDelete: string) => {
    const updated = currentExpenseCategories.filter((c) => c !== catToDelete);
    onUpdateSettings({
      ...settings,
      expenseCategories: updated.length > 0 ? updated : ['Outras Despesas'],
    });
    setDeletingExpenseCat(null);
    setExpenseCategoriesSaved(true);
    setTimeout(() => setExpenseCategoriesSaved(false), 2000);
  };

  const handleResetDefaultExpenseCategories = () => {
    onUpdateSettings({
      ...settings,
      expenseCategories: DEFAULT_EXPENSE_CATEGORIES,
    });
    setConfirmingResetExpenseCats(false);
    setExpenseCategoriesSaved(true);
    setTimeout(() => setExpenseCategoriesSaved(false), 2000);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        onImportData(content);
      }
    };
    reader.readAsText(file);
  };

  const isSuperAdmin = user?.email?.toLowerCase() === 'cosquinha66@gmail.com';

  return (
    <div className="space-y-4 pb-28">
      {/* 1. Header Card: User Account & Subscription Status */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white font-black text-lg flex items-center justify-center shadow-xs">
              {(userName || user?.name || 'V')[0].toUpperCase()}
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 leading-tight">
                {userName || user?.name || 'Minha Conta'}
              </h2>
              <p className="text-xs text-slate-500 font-mono truncate">{user?.email || 'Vendedor Vende.ai'}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            title="Sair da Conta (Logout)"
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 font-bold text-xs flex items-center gap-1.5 border border-slate-200 hover:border-rose-200 transition-colors shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair</span>
          </button>
        </div>

        {/* Subscription Status Pill */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Status do Acesso:</span>
            {user?.subscriptionStatus === 'active' ? (
              <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                🟢 Ativo / Liberado
              </span>
            ) : user?.subscriptionStatus === 'trial' ? (
              <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-amber-100 text-amber-800 border border-amber-200">
                🟡 Teste Grátis
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-rose-100 text-rose-800 border border-rose-200">
                🔴 Expirado / Bloqueado
              </span>
            )}
          </div>

          {onOpenSubscriptionModal && user?.subscriptionStatus !== 'active' && !isSuperAdmin && (
            <button
              type="button"
              onClick={onOpenSubscriptionModal}
              className="text-xs font-bold text-emerald-700 hover:underline"
            >
              Ver Plano
            </button>
          )}
        </div>
      </div>

      {/* Super Admin Access Banner (if user is cosquinha66@gmail.com) */}
      {isSuperAdmin && onOpenAdminPanel && (
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700 text-white rounded-3xl p-5 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black tracking-tight">Painel do Administrador</h3>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Super Admin
                  </span>
                </div>
                <p className="text-xs text-slate-400">Ver e gerenciar todos os usuários, liberar e bloquear acessos</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenAdminPanel}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs flex items-center justify-center gap-2 transition-colors shadow-xs shrink-0"
            >
              <ShieldCheck className="w-4 h-4 text-slate-950" />
              <span>Abrir Painel Admin</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. Sub-Tabs Bar: Navigation between Settings sections */}
      <div className="bg-slate-200/70 p-1 rounded-2xl grid grid-cols-4 gap-1">
        <button
          type="button"
          onClick={() => setSubTab('conta')}
          className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1 ${
            subTab === 'conta'
              ? 'bg-white text-emerald-800 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Conta</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('produtos')}
          className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1 ${
            subTab === 'produtos'
              ? 'bg-white text-emerald-800 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span className="truncate">Produtos</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('despesas')}
          className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1 ${
            subTab === 'despesas'
              ? 'bg-white text-rose-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <ArrowDownRight className="w-3.5 h-3.5 text-rose-600" />
          <span className="truncate">Despesas</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('backup')}
          className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1 ${
            subTab === 'backup'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Backup</span>
        </button>
      </div>

      {/* --- TAB 1: DADOS DA CONTA --- */}
      {subTab === 'conta' && (
        <form onSubmit={handleSaveAccount} className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <User className="w-4 h-4 text-emerald-600" />
              <span>Dados da Conta e Negócio</span>
            </h3>
            {accountSaved && (
              <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Salvo!
              </span>
            )}
          </div>

          {/* Business Name */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              Nome do Negócio / Barraca / Ponto
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Ex: Pastel & Caldo de Cana da Esquina"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Name and Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Seu Nome (Vendedor)
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Ex: Carlos Oliveira"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                WhatsApp / Telefone
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  value={userPhone}
                  onChange={(e) => setUserPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Pix Key and Type */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Chave Pix (Sai nos Recibos e Cobranças de Clientes)
              </label>
              <div className="relative">
                <QrCode className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  placeholder="Telefone, CPF, E-mail ou Chave Aleatória"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Tipo da Chave Pix
              </label>
              <select
                value={pixKeyType}
                onChange={(e) => setPixKeyType(e.target.value as any)}
                className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-emerald-500"
              >
                <option value="telefone">Telefone</option>
                <option value="cpf">CPF</option>
                <option value="email">E-mail</option>
                <option value="aleatoria">Aleatória</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="w-full min-h-[46px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 touch-press transition-colors shadow-xs"
          >
            {accountSaved ? (
              <>
                <Check className="w-4 h-4" />
                <span>Dados Salvos com Sucesso!</span>
              </>
            ) : (
              <span>Salvar Alterações da Conta</span>
            )}
          </button>
        </form>
      )}

      {/* --- TAB 2: CATEGORIAS DE PRODUTOS --- */}
      {subTab === 'produtos' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-emerald-600" />
                <span>Categorias de Produtos</span>
              </h3>
              <p className="text-xs text-slate-500">
                Organize seu cardápio e catálogo de mercadorias.
              </p>
            </div>

            {categoriesSaved && (
              <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Atualizado!
              </span>
            )}
          </div>

          {/* Add Category Form */}
          <form onSubmit={handleAddCategory} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Nova categoria (ex: Pasteis, Sucos, Acessórios)..."
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar</span>
            </button>
          </form>

          {/* Categories List Chips */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-600">
              Categorias Ativas ({currentCategories.length}):
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {currentCategories.map((cat, idx) => {
                const count = products.filter((p) => p.category === cat).length;
                const isEditing = editingCatIndex === idx;
                const isDeleting = deletingProductCat === cat;

                return (
                  <div
                    key={cat}
                    className="flex flex-col p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs gap-2"
                  >
                    <div className="flex items-center justify-between">
                      {isEditing ? (
                        <div className="flex items-center gap-1.5 flex-1 mr-2">
                          <input
                            type="text"
                            value={editingCatValue}
                            onChange={(e) => setEditingCatValue(e.target.value)}
                            className="px-2 py-1 rounded-lg bg-white border border-emerald-500 text-xs font-bold text-slate-900 flex-1 focus:outline-none"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveRenameCategory(idx)}
                            className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-700"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCatIndex(null)}
                            className="p-1 rounded bg-slate-200 text-slate-600 hover:bg-slate-300"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                          <span className="font-bold text-slate-800 truncate">{cat}</span>
                          <span className="text-[10px] text-slate-400 font-medium px-1.5 py-0.5 rounded-md bg-white border border-slate-200 shrink-0">
                            {count} {count === 1 ? 'item' : 'itens'}
                          </span>
                        </div>
                      )}

                      {!isEditing && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCatIndex(idx);
                              setEditingCatValue(cat);
                              setDeletingProductCat(null);
                            }}
                            title="Renomear categoria"
                            className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeletingProductCat(cat)}
                            title="Excluir categoria"
                            className="p-1 rounded-lg hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Inline Delete Confirmation */}
                    {isDeleting && (
                      <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-between gap-2 text-[11px] text-rose-900">
                        <span className="truncate">
                          {count > 0 ? `Excluir "${cat}" (${count} itens)?` : `Excluir "${cat}"?`}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleConfirmDeleteCategory(cat)}
                            className="px-2 py-0.5 rounded bg-rose-600 text-white font-bold hover:bg-rose-700"
                          >
                            Sim
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingProductCat(null)}
                            className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-bold hover:bg-slate-300"
                          >
                            Não
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 3: CATEGORIAS DE DESPESAS (USER REQUEST) --- */}
      {subTab === 'despesas' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <ArrowDownRight className="w-4 h-4 text-rose-600" />
                <span>Categorias de Despesa</span>
              </h3>
              <p className="text-xs text-slate-500">
                Altere ou crie novas categorias para organizar as saídas de dinheiro.
              </p>
            </div>

            {expenseCategoriesSaved && (
              <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Atualizado!
              </span>
            )}
          </div>

          {/* Add Expense Category Form */}
          <form onSubmit={handleAddExpenseCategory} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Nova categoria de despesa (ex: Gás, Água, Frete, Diária)..."
              value={newExpenseCatName}
              onChange={(e) => setNewExpenseCatName(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-rose-500"
            />
            <button
              type="submit"
              className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar</span>
            </button>
          </form>

          {/* Expense Categories List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>Categorias Ativas ({currentExpenseCategories.length}):</span>
              <button
                type="button"
                onClick={() => setConfirmingResetExpenseCats(true)}
                className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Restaurar padrão</span>
              </button>
            </div>

            {/* Confirming Reset Expense Categories to Default */}
            {confirmingResetExpenseCats && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-2 text-xs text-amber-900">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Deseja restaurar as categorias de despesas originais?</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleResetDefaultExpenseCategories}
                    className="px-2.5 py-1 rounded-lg bg-amber-600 text-white font-bold hover:bg-amber-700 text-xs"
                  >
                    Restaurar
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingResetExpenseCats(false)}
                    className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 text-xs"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {currentExpenseCategories.map((cat, idx) => {
                const Icon = getExpenseCategoryIcon(cat);
                const count = expenses.filter((e) => {
                  const norm = normalizeExpenseCategoryName(e.category);
                  return norm === cat || e.category === cat;
                }).length;
                const isEditing = editingExpenseCatIndex === idx;
                const isDeleting = deletingExpenseCat === cat;

                return (
                  <div
                    key={cat}
                    className="flex flex-col p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs gap-2"
                  >
                    <div className="flex items-center justify-between">
                      {isEditing ? (
                        <div className="flex items-center gap-1.5 flex-1 mr-2">
                          <input
                            type="text"
                            value={editingExpenseCatValue}
                            onChange={(e) => setEditingExpenseCatValue(e.target.value)}
                            className="px-2 py-1 rounded-lg bg-white border border-rose-500 text-xs font-bold text-slate-900 flex-1 focus:outline-none"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveRenameExpenseCategory(idx)}
                            className="p-1 rounded bg-rose-600 text-white hover:bg-rose-700"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingExpenseCatIndex(null)}
                            className="p-1 rounded bg-slate-200 text-slate-600 hover:bg-slate-300"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <span className="font-bold text-slate-800 truncate">{cat}</span>
                          <span className="text-[10px] text-slate-500 font-medium px-1.5 py-0.5 rounded-md bg-white border border-slate-200 shrink-0">
                            {count} {count === 1 ? 'lançamento' : 'lançamentos'}
                          </span>
                        </div>
                      )}

                      {!isEditing && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingExpenseCatIndex(idx);
                              setEditingExpenseCatValue(cat);
                              setDeletingExpenseCat(null);
                            }}
                            title="Renomear categoria"
                            className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeletingExpenseCat(cat)}
                            title="Excluir categoria"
                            className="p-1 rounded-lg hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Inline Delete Confirmation */}
                    {isDeleting && (
                      <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-between gap-2 text-[11px] text-rose-900">
                        <span className="truncate">
                          {count > 0 ? `Excluir "${cat}" (${count} despesas associadas)?` : `Excluir "${cat}"?`}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleConfirmDeleteExpenseCategory(cat)}
                            className="px-2 py-0.5 rounded bg-rose-600 text-white font-bold hover:bg-rose-700"
                          >
                            Sim
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingExpenseCat(null)}
                            className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-bold hover:bg-slate-300"
                          >
                            Não
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="text-[11px] text-slate-400 pt-2 leading-tight">
              Dica: As categorias definidas aqui aparecem automaticamente no botão de registrar despesa e nos relatórios de fluxo de caixa.
            </p>
          </div>
        </div>
      )}

      {/* --- TAB 4: BACKUP E DADOS --- */}
      {subTab === 'backup' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4 shadow-xs">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Backup e Segurança dos Dados</span>
            </h3>
            <p className="text-xs text-slate-500">
              Seus dados ficam gravados com segurança na nuvem e no aparelho para funcionamento offline.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={onExportData}
              className="min-h-[44px] rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-200 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Exportar Backup (JSON)</span>
            </button>

            <label className="min-h-[44px] rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-200 transition-colors cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-amber-600" />
              <span>Importar Backup</span>
              <input
                type="file"
                accept=".json"
                onChange={handleFileInput}
                className="hidden"
              />
            </label>
          </div>

          {/* Reset Clean Base Confirmation */}
          <div className="pt-2 border-t border-slate-100">
            {confirmingResetData ? (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 space-y-2 text-xs text-rose-900">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Deseja realmente zerar todos os produtos, vendas e despesas?</span>
                </div>
                <p className="text-[11px] text-rose-700">Esta ação não pode ser desfeita após confirmada.</p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      onResetData();
                      setConfirmingResetData(false);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
                  >
                    Sim, zerar dados
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingResetData(false)}
                    className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingResetData(true)}
                className="w-full text-xs text-rose-600 hover:text-rose-700 py-1.5 flex items-center justify-center gap-1.5 transition-colors font-medium"
              >
                <Trash2 className="w-3 h-3" />
                <span>Zerar meus dados e reiniciar base limpa</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
