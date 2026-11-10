import React, { useState, useMemo } from 'react';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  TrendingUp,
  Percent,
  X,
  Search,
  Tag,
  AlertCircle,
} from 'lucide-react';
import { Product, BusinessSettings } from '../types';
import { formatCurrency } from '../utils/receipt';
import { DEFAULT_PRODUCT_CATEGORIES } from '../utils/storage';

interface ProductsViewProps {
  products: Product[];
  settings: BusinessSettings;
  onSaveProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  products,
  settings,
  onSaveProduct,
  onDeleteProduct,
}) => {
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');

  // Available categories from settings
  const categories = useMemo(() => {
    return settings.categories && settings.categories.length > 0
      ? settings.categories
      : DEFAULT_PRODUCT_CATEGORIES;
  }, [settings.categories]);

  // Form state
  const [name, setName] = useState('');
  const [category, setCategory] = useState(categories[0] || 'Geral');
  const [customCategory, setCustomCategory] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [priceStr, setPriceStr] = useState('');
  const [costStr, setCostStr] = useState('');
  const [stockStr, setStockStr] = useState('');
  const [unit, setUnit] = useState('un');

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    if (categories.includes(p.category)) {
      setCategory(p.category);
      setIsCustomCategory(false);
      setCustomCategory('');
    } else {
      setCategory('outro');
      setIsCustomCategory(true);
      setCustomCategory(p.category);
    }
    setPriceStr(p.price.toString());
    setCostStr(p.costPrice ? p.costPrice.toString() : '');
    setStockStr(p.stock !== undefined ? p.stock.toString() : '');
    setUnit(p.unit || 'un');
    setIsAddOpen(true);
  };

  const openNewModal = () => {
    setEditingProduct(null);
    setName('');
    setCategory(categories[0] || 'Geral');
    setIsCustomCategory(false);
    setCustomCategory('');
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

    if (!name.trim() || price <= 0) {
      alert('Informe o nome e um preço de venda válido!');
      return;
    }

    const finalCategory = isCustomCategory ? customCategory.trim() || 'Geral' : category.trim() || 'Geral';

    const prodToSave: Product = {
      id: editingProduct ? editingProduct.id : `prod_${Date.now()}`,
      name: name.trim(),
      category: finalCategory,
      price,
      costPrice,
      stock,
      unit,
    };

    onSaveProduct(prodToSave);
    setIsAddOpen(false);
  };

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (selectedCategory !== 'todos' && p.category !== selectedCategory) {
        return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const mName = p.name.toLowerCase().includes(q);
        const mCat = p.category.toLowerCase().includes(q);
        return mName || mCat;
      }
      return true;
    });
  }, [products, selectedCategory, searchTerm]);

  return (
    <div className="space-y-4 pb-28">
      {/* Search & New Product Header */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
              <Package className="w-4 h-4 text-emerald-600" />
              <span>Catálogo de Produtos</span>
            </h2>
            <p className="text-[11px] text-slate-500">
              {products.length} {products.length === 1 ? 'produto cadastrado' : 'produtos cadastrados'}
            </p>
          </div>

          <button
            type="button"
            onClick={openNewModal}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-xs touch-press transition-colors"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Novo Produto</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome ou categoria..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
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

        {/* Category Filter Horizontal Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            type="button"
            onClick={() => setSelectedCategory('todos')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
              selectedCategory === 'todos'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({products.length})
          </button>

          {categories.map((cat) => {
            const count = products.filter((p) => p.category === cat).length;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                  selectedCategory === cat
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Products List or Empty State */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              {searchTerm || selectedCategory !== 'todos'
                ? 'Nenhum produto encontrado'
                : 'Nenhum produto cadastrado'}
            </h4>
            <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
              {searchTerm || selectedCategory !== 'todos'
                ? 'Tente buscar por outro termo ou selecione outra categoria.'
                : 'Cadastre seus produtos com preço de venda e custo para acompanhar sua margem.'}
            </p>
          </div>
          <button
            type="button"
            onClick={openNewModal}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-1.5 touch-press transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Cadastrar Novo Produto</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredProducts.map((p) => {
            const unitProfit = p.price - (p.costPrice || 0);
            const marginPercent = p.price > 0 ? Math.round((unitProfit / p.price) * 100) : 0;

            return (
              <div
                key={p.id}
                className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs flex items-center justify-between gap-3 hover:border-slate-300 transition-all"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-sm text-slate-900 truncate">
                      {p.name}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                      {p.category}
                    </span>
                    {p.stock !== undefined && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          p.stock <= 5
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        Estoque: {p.stock} {p.unit || 'un'}
                      </span>
                    )}
                  </div>

                  {/* Financial metrics row */}
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                    <span className="font-extrabold text-slate-900 font-mono-numbers">
                      {formatCurrency(p.price)}
                    </span>
                    {p.costPrice ? (
                      <>
                        <span className="text-slate-300">·</span>
                        <span>Custo: {formatCurrency(p.costPrice)}</span>
                        <span className="text-slate-300">·</span>
                        <span className="text-emerald-700 font-semibold flex items-center gap-0.5">
                          <TrendingUp className="w-3 h-3 text-emerald-600" />
                          <span>Lucro: {formatCurrency(unitProfit)} ({marginPercent}%)</span>
                        </span>
                      </>
                    ) : (
                      <span className="text-slate-400 text-[11px]">(Custo não informado)</span>
                    )}
                  </div>
                </div>

                {/* Edit & Delete Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEditModal(p)}
                    title="Editar Produto"
                    className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Deseja realmente excluir o produto "${p.name}"?`)) {
                        onDeleteProduct(p.id);
                      }
                    }}
                    title="Excluir Produto"
                    className="w-8 h-8 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Product Add/Edit Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto overscroll-contain">
          <div className="w-full sm:max-w-md bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[88vh] sm:max-h-[85vh] overflow-hidden">
            <div className="shrink-0 bg-white px-5 pt-4 pb-3 border-b border-slate-100 flex items-center justify-between z-10">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {editingProduct ? 'Editar Produto' : 'Cadastrar Produto'}
                </h2>
                <p className="text-xs text-slate-500">Preencha o preço e custo para acompanhar sua margem</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form id="product-form" onSubmit={handleSaveProductForm} className="p-5 space-y-3.5 overflow-y-auto flex-1 overscroll-contain">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Nome do Produto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Pastel de Carne, Coca-Cola 350ml"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Category selector */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    Categoria *
                  </label>
                  <select
                    value={isCustomCategory ? 'outro' : category}
                    onChange={(e) => {
                      if (e.target.value === 'outro') {
                        setIsCustomCategory(true);
                      } else {
                        setIsCustomCategory(false);
                        setCategory(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-emerald-500"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                    <option value="outro">+ Outra categoria...</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    Unidade de Medida
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="un">un (Unidade)</option>
                    <option value="kg">kg (Quilo)</option>
                    <option value="peça">peça</option>
                    <option value="porção">porção</option>
                    <option value="copo">copo</option>
                    <option value="lata">lata</option>
                    <option value="kit">kit</option>
                  </select>
                </div>
              </div>

              {/* Custom category input if selected */}
              {isCustomCategory && (
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    Nome da Nova Categoria
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Digite o nome da categoria..."
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-emerald-500 text-slate-900 text-xs focus:outline-none"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    Preço de Venda (R$) *
                  </label>
                  <input
                    type="text"
                    required
                    inputMode="decimal"
                    placeholder="0,00"
                    value={priceStr}
                    onChange={(e) => setPriceStr(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-bold font-mono-numbers text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    Preço de Custo (R$)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00 (opcional)"
                    value={costStr}
                    onChange={(e) => setCostStr(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-600 font-mono-numbers text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Quantidade em Estoque
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={stockStr}
                  onChange={(e) => setStockStr(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono-numbers text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Profit & Margin Preview */}
              {parseFloat(priceStr.replace(',', '.')) > 0 && parseFloat(costStr.replace(',', '.')) > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-xs flex items-center justify-between">
                  <span className="text-emerald-800 font-medium">Margem de Lucro por unidade:</span>
                  <span className="font-extrabold text-emerald-800 font-mono-numbers">
                    {formatCurrency(
                      (parseFloat(priceStr.replace(',', '.')) || 0) -
                        (parseFloat(costStr.replace(',', '.')) || 0)
                    )}{' '}
                    (
                    {Math.round(
                      (((parseFloat(priceStr.replace(',', '.')) || 0) -
                        (parseFloat(costStr.replace(',', '.')) || 0)) /
                        (parseFloat(priceStr.replace(',', '.')) || 1)) *
                        100
                    )}
                    %)
                  </span>
                </div>
              )}
            </form>

            <div className="shrink-0 bg-white p-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="product-form"
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs touch-press transition-colors"
              >
                {editingProduct ? 'Salvar Alterações' : 'Cadastrar Produto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
