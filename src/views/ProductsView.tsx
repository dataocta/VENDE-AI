import React, { useState } from 'react';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  TrendingUp,
  Percent,
  Settings,
  Download,
  Upload,
  RotateCcw,
  Sun,
  ShieldCheck,
  X,
  Check,
  Sliders,
  User,
  Clock,
  Sparkles,
  LogOut,
  CreditCard,
} from 'lucide-react';
import { Product, BusinessSettings, UserAccount } from '../types';
import { formatCurrency } from '../utils/receipt';
import { getTrialInfo } from '../utils/authStorage';

interface ProductsViewProps {
  products: Product[];
  settings: BusinessSettings;
  user: UserAccount | null;
  onSaveProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
  onUpdateSettings: (settings: BusinessSettings) => void;
  onExportData: () => void;
  onImportData: (jsonStr: string) => void;
  onResetData: () => void;
  onOpenSubscriptionModal: () => void;
  onLogout: () => void;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  products,
  settings,
  user,
  onSaveProduct,
  onDeleteProduct,
  onUpdateSettings,
  onExportData,
  onImportData,
  onResetData,
  onOpenSubscriptionModal,
  onLogout,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'products' | 'settings'>('products');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Bebidas');
  const [priceStr, setPriceStr] = useState('');
  const [costStr, setCostStr] = useState('');
  const [stockStr, setStockStr] = useState('');
  const [unit, setUnit] = useState('un');

  // Settings form state
  const [bName, setBName] = useState(settings.businessName);
  const [sName, setSName] = useState(settings.sellerName);
  const [pix, setPix] = useState(settings.pixKey);
  const [pixType, setPixType] = useState(settings.pixKeyType);
  const [phone, setPhone] = useState(settings.phone);
  const [dailyGoalStr, setDailyGoalStr] = useState(settings.dailyGoal.toString());
  const [settingsSaved, setSettingsSaved] = useState(false);

  const trialInfo = user ? getTrialInfo(user) : null;

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setCategory(p.category);
    setPriceStr(p.price.toString());
    setCostStr(p.costPrice.toString());
    setStockStr(p.stock.toString());
    setUnit(p.unit || 'un');
    setIsAddOpen(true);
  };

  const openNewModal = () => {
    setEditingProduct(null);
    setName('');
    setCategory('Bebidas');
    setPriceStr('');
    setCostStr('');
    setStockStr('20');
    setUnit('un');
    setIsAddOpen(true);
  };

  const handleSaveProductForm = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(priceStr.replace(',', '.')) || 0;
    const costPrice = parseFloat(costStr.replace(',', '.')) || 0;
    const stock = parseInt(stockStr, 10) || 0;

    if (!name.trim() || price <= 0) return;

    const newProd: Product = {
      id: editingProduct ? editingProduct.id : `prod_${Date.now()}`,
      name: name.trim(),
      category: category.trim() || 'Geral',
      price,
      costPrice,
      stock,
      unit,
    };

    onSaveProduct(newProd);
    setIsAddOpen(false);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const dailyGoal = parseFloat(dailyGoalStr.replace(',', '.')) || 0;
    const updated: BusinessSettings = {
      ...settings,
      businessName: bName.trim(),
      sellerName: sName.trim(),
      pixKey: pix.trim(),
      pixKeyType: pixType,
      phone: phone.trim(),
      dailyGoal,
    };
    onUpdateSettings(updated);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2500);
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

  return (
    <div className="space-y-4 pb-28">
      {/* Sub-Tab Selector */}
      <div className="grid grid-cols-2 p-1 bg-slate-900 border border-slate-800 rounded-2xl">
        <button
          type="button"
          onClick={() => setActiveSubTab('products')}
          className={`py-2 text-xs font-bold rounded-xl transition-all ${
            activeSubTab === 'products'
              ? 'bg-slate-800 text-slate-100 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Catálogo &amp; Margem ({products.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('settings')}
          className={`py-2 text-xs font-bold rounded-xl transition-all ${
            activeSubTab === 'settings'
              ? 'bg-slate-800 text-slate-100 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Conta, Plano &amp; Ajustes
        </button>
      </div>

      {activeSubTab === 'products' ? (
        <div className="space-y-3">
          {/* Add Product Button */}
          <button
            type="button"
            onClick={openNewModal}
            className="w-full min-h-[50px] rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg touch-press transition-all active:scale-[0.98]"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span>+ CADASTRAR NOVO PRODUTO NA RUA</span>
          </button>

          {/* Products List with Profit Margin Indicator or Clean State */}
          {products.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-100">Nenhum produto cadastrado ainda</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
                  Cadastre seus produtos, salgados, bebidas ou mercadorias com o preço de venda e custo para calcular sua margem de lucro na rua.
                </p>
              </div>
              <button
                type="button"
                onClick={openNewModal}
                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs inline-flex items-center gap-1.5 touch-press transition-colors"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>CADASTRAR PRIMEIRO PRODUTO</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {products.map((p) => {
              const unitProfit = p.price - (p.costPrice || 0);
              const marginPercent = p.price > 0 ? Math.round((unitProfit / p.price) * 100) : 0;
              const isLowStock = p.stock <= 5;

              return (
                <div
                  key={p.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                        {p.category}
                      </span>
                      <h4 className="font-bold text-slate-100 text-sm truncate">
                        {p.name}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                        <span>
                          Estoque:{' '}
                          <strong className={isLowStock ? 'text-amber-400' : 'text-slate-200'}>
                            {p.stock} {p.unit || 'un'}
                          </strong>
                        </span>
                        <span aria-hidden="true" className="text-slate-600">·</span>
                        <span>Custo: {formatCurrency(p.costPrice || 0)}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs text-slate-400 block font-medium">Preço Venda</span>
                      <span className="text-lg font-black text-emerald-400 font-mono-numbers">
                        {formatCurrency(p.price)}
                      </span>
                    </div>
                  </div>

                  {/* Profit Margin Strip */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                      <span>
                        Lucro unitário: <strong className="text-emerald-400 font-mono-numbers">{formatCurrency(unitProfit)}</strong> ({marginPercent}%)
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(p)}
                        className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Excluir o produto "${p.name}"?`)) {
                            onDeleteProduct(p.id);
                          }
                        }}
                        className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 flex items-center justify-center transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    ) : (
      /* Settings Sub-Tab */
      <div className="space-y-4">
          
          {/* User Account & 7-Day Trial Status Card */}
          {user && trialInfo && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-100">{user.name}</h3>
                    <p className="text-xs text-slate-400">{user.email}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onLogout}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-rose-400 font-medium text-xs flex items-center gap-1 border border-slate-700 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sair</span>
                </button>
              </div>

              {/* Subscription Status Details */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Status do Seu Plano:</span>
                  <span
                    className={`font-bold font-mono-numbers ${
                      user.subscriptionStatus === 'active'
                        ? 'text-emerald-400'
                        : trialInfo.isExpired
                        ? 'text-rose-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {user.subscriptionStatus === 'active'
                      ? 'Assinatura Ativa (R$ 15,97)'
                      : trialInfo.isExpired
                      ? 'Período Gratuito Expirado'
                      : `Teste Grátis (${trialInfo.daysRemaining} dias restantes)`}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800/80">
                  <span>Mensalidade:</span>
                  <span className="font-mono-numbers text-slate-200 font-semibold">
                    R$ 15,97 / mês
                  </span>
                </div>

                {user.subscriptionStatus !== 'active' && (
                  <button
                    type="button"
                    onClick={onOpenSubscriptionModal}
                    className="w-full mt-2 min-h-[42px] rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md touch-press transition-all hover:brightness-105"
                  >
                    <CreditCard className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>ATIVAR ASSINATURA (R$ 15,97/MÊS)</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Business & Pix Settings Form */}
          <form onSubmit={handleSaveSettings} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <span>Dados do Negócio de Rua &amp; Pix</span>
            </h3>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">
                Nome Fantasia da Barraca / Negócio
              </label>
              <input
                type="text"
                value={bName}
                onChange={(e) => setBName(e.target.value)}
                placeholder="Ex: Pastel &amp; Caldo de Cana da Esquina"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Seu Nome (Vendedor)
                </label>
                <input
                  type="text"
                  value={sName}
                  onChange={(e) => setSName(e.target.value)}
                  placeholder="Ex: Carlos Oliveira"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Meta Diária de Vendas (R$)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={dailyGoalStr}
                  onChange={(e) => setDailyGoalStr(e.target.value)}
                  placeholder="Ex: 500,00"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 font-bold font-mono-numbers text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Sua Chave Pix (Sai nos Recibos e Cobranças)
                </label>
                <input
                  type="text"
                  value={pix}
                  onChange={(e) => setPix(e.target.value)}
                  placeholder="Telefone, CPF ou e-mail"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Tipo da Chave
                </label>
                <select
                  value={pixType}
                  onChange={(e) => setPixType(e.target.value as any)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none"
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
              className="w-full min-h-[46px] rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 touch-press transition-all"
            >
              {settingsSaved ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Configurações Salvas!</span>
                </>
              ) : (
                <span>Salvar Configurações</span>
              )}
            </button>
          </form>

          {/* Backup & Data Integrity */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Backup e Segurança dos Seus Dados</span>
            </h3>
            <p className="text-xs text-slate-400">
              Seus dados ficam 100% gravados na memória do seu celular e funcionam mesmo sem sinal ou internet na rua.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={onExportData}
                className="min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Exportar Backup (JSON)</span>
              </button>

              <label className="min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition-colors cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-amber-400" />
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
                if (confirm('Tem certeza de que deseja zerar todos os produtos, vendas e despesas da sua conta e começar com a base limpa?')) {
                  onResetData();
                }
              }}
              className="w-full text-xs text-rose-400/80 hover:text-rose-300 py-1.5 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              <span>Zerar meus dados e reiniciar base limpa</span>
            </button>
          </div>
        </div>
      )}

      {/* Product Add/Edit Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto no-scrollbar pb-safe">
            <div className="sticky top-0 bg-slate-900/95 backdrop-blur-md px-5 pt-4 pb-2 border-b border-slate-800 flex items-center justify-between z-10">
              <div>
                <h2 className="text-base font-bold text-slate-100">
                  {editingProduct ? 'Editar Produto' : 'Cadastrar Produto na Rua'}
                </h2>
                <p className="text-xs text-slate-400">Preencha o preço e custo para ver a margem</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProductForm} className="p-4 space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Nome do Produto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Água Mineral c/ Gás 500ml"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    Categoria
                  </label>
                  <input
                    type="text"
                    placeholder="Bebidas, Lanches, etc"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    Unidade de Medida
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none"
                  >
                    <option value="un">un (Unidade)</option>
                    <option value="kg">kg (Quilo)</option>
                    <option value="peça">peça</option>
                    <option value="par">par</option>
                    <option value="kit">kit</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    Preço de Venda (R$) *
                  </label>
                  <input
                    type="text"
                    required
                    inputMode="decimal"
                    placeholder="Ex: 5,00"
                    value={priceStr}
                    onChange={(e) => setPriceStr(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 font-bold font-mono-numbers text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    Preço de Custo (R$)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Ex: 2,00"
                    value={costStr}
                    onChange={(e) => setCostStr(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-mono-numbers text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Estoque Atual
                </label>
                <input
                  type="number"
                  placeholder="Quantidade"
                  value={stockStr}
                  onChange={(e) => setStockStr(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-mono-numbers text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Calculated profit preview */}
              {parseFloat(priceStr.replace(',', '.')) > 0 && (
                <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Lucro Estimado por Item:</span>
                  <span className="font-bold text-emerald-400 font-mono-numbers">
                    {formatCurrency(
                      (parseFloat(priceStr.replace(',', '.')) || 0) -
                        (parseFloat(costStr.replace(',', '.')) || 0)
                    )}
                  </span>
                </div>
              )}

              <button
                type="submit"
                className="w-full min-h-[50px] rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg touch-press transition-all"
              >
                {editingProduct ? 'SALVAR ALTERAÇÕES' : 'CADASTRAR PRODUTO'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
