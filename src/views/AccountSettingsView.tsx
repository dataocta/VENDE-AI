import React, { useState } from 'react';
import {
  User,
  Sliders,
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
  Sparkles,
} from 'lucide-react';
import { BusinessSettings, UserAccount, Product } from '../types';
import { DEFAULT_PRODUCT_CATEGORIES } from '../utils/storage';

interface AccountSettingsViewProps {
  settings: BusinessSettings;
  user: UserAccount | null;
  products: Product[];
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
  onUpdateSettings,
  onUpdateUserAccount,
  onExportData,
  onImportData,
  onResetData,
  onLogout,
  onOpenAdminPanel,
  onOpenSubscriptionModal,
}) => {
  // Account details form state
  const [userName, setUserName] = useState(user?.name || settings.sellerName || '');
  const [userPhone, setUserPhone] = useState(user?.phone || settings.phone || '');
  const [businessName, setBusinessName] = useState(user?.businessName || settings.businessName || '');
  const [pixKey, setPixKey] = useState(settings.pixKey || '');
  const [pixKeyType, setPixKeyType] = useState(settings.pixKeyType || 'telefone');
  const [accountSaved, setAccountSaved] = useState(false);

  // Categories management state
  const currentCategories = settings.categories && settings.categories.length > 0
    ? settings.categories
    : DEFAULT_PRODUCT_CATEGORIES;

  const [newCatName, setNewCatName] = useState('');
  const [editingCatIndex, setEditingCatIndex] = useState<number | null>(null);
  const [editingCatValue, setEditingCatValue] = useState('');
  const [categoriesSaved, setCategoriesSaved] = useState(false);

  // Handle saving account details
  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Update business settings
    onUpdateSettings({
      ...settings,
      businessName: businessName.trim() || 'Meu Negócio',
      sellerName: userName.trim() || 'Vendedor',
      phone: userPhone.trim(),
      pixKey: pixKey.trim(),
      pixKeyType,
    });

    // 2. Update user account profile if handler exists
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
      alert('Esta categoria já existe!');
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

  // Handle renaming existing category
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

  // Handle deleting category
  const handleDeleteCategory = (catToDelete: string) => {
    const prodsUsingCat = products.filter((p) => p.category === catToDelete).length;
    let confirmMsg = `Deseja remover a categoria "${catToDelete}"?`;
    if (prodsUsingCat > 0) {
      confirmMsg = `Existem ${prodsUsingCat} produto(s) cadastrados com a categoria "${catToDelete}". Deseja realmente removê-la da lista de opções?`;
    }

    if (window.confirm(confirmMsg)) {
      const updated = currentCategories.filter((c) => c !== catToDelete);
      onUpdateSettings({
        ...settings,
        categories: updated.length > 0 ? updated : ['Geral'],
      });
      setCategoriesSaved(true);
      setTimeout(() => setCategoriesSaved(false), 2000);
    }
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

      {/* 2. Account Details Form (Dados da Conta) */}
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

      {/* 3. Product Categories Manager (Categorias de Produtos) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Tag className="w-4 h-4 text-emerald-600" />
              <span>Categorias de Produtos</span>
            </h3>
            <p className="text-xs text-slate-500">
              Personalize as categorias que aparecem no seu catálogo e nos filtros.
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

              return (
                <div
                  key={cat}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                >
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
                        }}
                        title="Renomear categoria"
                        className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(cat)}
                        title="Excluir categoria"
                        className="p-1 rounded-lg hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Backup & Data Integrity Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-3 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Backup e Segurança dos Dados</span>
        </h3>
        <p className="text-xs text-slate-500">
          Seus dados ficam 100% gravados com segurança na nuvem e no aparelho, funcionando mesmo sem internet.
        </p>

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

        <button
          type="button"
          onClick={() => {
            if (window.confirm('Tem certeza de que deseja zerar todos os produtos, vendas e despesas da sua conta e começar com a base limpa?')) {
              onResetData();
            }
          }}
          className="w-full text-xs text-rose-600 hover:text-rose-700 py-1.5 flex items-center justify-center gap-1.5 transition-colors font-medium pt-2"
        >
          <Trash2 className="w-3 h-3" />
          <span>Zerar meus dados e reiniciar base limpa</span>
        </button>
      </div>
    </div>
  );
};
