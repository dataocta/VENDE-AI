import React, { useState, useMemo } from 'react';
import {
  X,
  Delete,
  Check,
  Banknote,
  QrCode,
  CreditCard,
  BookUser,
  User,
  ChevronDown,
  ShoppingBag,
  Calculator,
  Search,
  Plus,
  Minus,
  Sparkles,
  Tag,
} from 'lucide-react';
import { PaymentMethod, Sale, Customer, Product } from '../types';
import { formatCurrency } from '../utils/receipt';
import { playSaleChime, playTapBeep } from '../utils/audio';

interface NumpadSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleteSale: (sale: Sale) => void;
  soundEnabled: boolean;
  defaultCustomerName?: string;
  customers?: Customer[];
  products?: Product[];
}

export const NumpadSaleModal: React.FC<NumpadSaleModalProps> = ({
  isOpen,
  onClose,
  onCompleteSale,
  soundEnabled,
  defaultCustomerName,
  customers = [],
  products = [],
}) => {
  // Mode selection: 'numpad' (digital input) or 'catalog' (select from registered items)
  const [saleMode, setSaleMode] = useState<'numpad' | 'catalog'>('numpad');

  // Amount entered as integer cents (e.g. 1550 = R$ 15,50)
  const [cents, setCents] = useState<number>(0);
  const [selectedQuickProduct, setSelectedQuickProduct] = useState<Product | null>(null);

  // Catalog cart quantities: productId -> quantity
  const [catalogCart, setCatalogCart] = useState<Record<string, number>>({});
  const [catalogSearch, setCatalogSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');

  // Shared sale parameters
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [receivedCents, setReceivedCents] = useState<number>(0);
  const [description, setDescription] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>(defaultCustomerName || '');
  const [customerPhone, setCustomerPhone] = useState<string>('');

  // Categories from products
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category && p.category.trim()) set.add(p.category.trim());
    });
    return Array.from(set);
  }, [products]);

  // Filtered products for catalog mode
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        !catalogSearch.trim() ||
        p.name.toLowerCase().includes(catalogSearch.toLowerCase().trim()) ||
        (p.category && p.category.toLowerCase().includes(catalogSearch.toLowerCase().trim())) ||
        (p.barcode && p.barcode.includes(catalogSearch.trim()));
      const matchCategory =
        selectedCategory === 'todos' || p.category === selectedCategory;
      return matchSearch && matchCategory;
    });
  }, [products, catalogSearch, selectedCategory]);

  // Calculate catalog total
  const catalogTotal = useMemo(() => {
    return Object.entries(catalogCart).reduce((sum, [pId, qty]) => {
      const prod = products.find((p) => p.id === pId);
      return sum + (prod ? prod.price * qty : 0);
    }, 0);
  }, [catalogCart, products]);

  const catalogItemsCount = useMemo(() => {
    return Object.values(catalogCart).reduce((sum, qty) => sum + qty, 0);
  }, [catalogCart]);

  // Effective total based on current active mode
  const totalAmount = saleMode === 'catalog' ? catalogTotal : cents / 100;
  const amountReceived = receivedCents / 100;
  const changeGiven =
    paymentMethod === 'dinheiro' && amountReceived > totalAmount
      ? amountReceived - totalAmount
      : 0;

  // Catalog item handlers
  const handleAddCatalogItem = (productId: string) => {
    if (soundEnabled) playTapBeep();
    setCatalogCart((prev) => ({
      ...prev,
      [productId]: (prev[productId] || 0) + 1,
    }));
  };

  const handleRemoveCatalogItem = (productId: string) => {
    if (soundEnabled) playTapBeep();
    setCatalogCart((prev) => {
      const current = prev[productId] || 0;
      if (current <= 1) {
        const next = { ...prev };
        delete next[productId];
        return next;
      }
      return { ...prev, [productId]: current - 1 };
    });
  };

  const handleClearCatalogCart = () => {
    if (soundEnabled) playTapBeep();
    setCatalogCart({});
  };

  // Numpad handlers
  const handleDigit = (digit: string) => {
    if (soundEnabled) playTapBeep();
    if (cents.toString().length >= 8) return;
    const nextStr = (cents === 0 ? '' : cents.toString()) + digit;
    setCents(parseInt(nextStr || '0', 10));
    // Reset quick product reference if user starts manual digits
    setSelectedQuickProduct(null);
  };

  const handleClear = () => {
    if (soundEnabled) playTapBeep();
    setCents(0);
    setReceivedCents(0);
    setSelectedQuickProduct(null);
    setDescription('');
  };

  const handleBackspace = () => {
    if (soundEnabled) playTapBeep();
    const str = cents.toString();
    if (str.length <= 1) {
      setCents(0);
      setSelectedQuickProduct(null);
    } else {
      setCents(parseInt(str.slice(0, -1), 10));
    }
  };

  const handleAddQuick = (val: number) => {
    if (soundEnabled) playTapBeep();
    setCents((prev) => prev + val * 100);
  };

  const handleSelectQuickProduct = (prod: Product) => {
    if (soundEnabled) playTapBeep();
    setSelectedQuickProduct(prod);
    setCents(Math.round(prod.price * 100));
    setDescription(prod.name);
  };

  const handleSelectCashBill = (bill: number) => {
    if (soundEnabled) playTapBeep();
    setReceivedCents(bill * 100);
  };

  const resetAllState = () => {
    setCents(0);
    setReceivedCents(0);
    setSelectedQuickProduct(null);
    setCatalogCart({});
    setDescription('');
    setCustomerName('');
    setCustomerPhone('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (totalAmount <= 0) return;

    if (paymentMethod === 'fiado' && !customerName.trim()) {
      alert('Para venda a prazo, informe o nome do cliente!');
      return;
    }

    const saleCode = `#${Math.floor(1000 + Math.random() * 9000)}`;

    let saleItems: Sale['items'] = [];
    let calculatedCost = 0;

    if (saleMode === 'catalog') {
      const activeEntries = Object.entries(catalogCart).filter(([_, qty]) => qty > 0);
      saleItems = activeEntries.map(([pId, qty]) => {
        const p = products.find((item) => item.id === pId);
        const name = p ? p.name : 'Produto do Catálogo';
        const unitPrice = p ? p.price : 0;
        const subtotal = unitPrice * qty;
        const costPrice = p && p.costPrice ? p.costPrice : unitPrice * 0.45;
        calculatedCost += costPrice * qty;
        return {
          productId: pId,
          name,
          quantity: qty,
          unitPrice,
          subtotal,
          costPrice,
        };
      });
    } else {
      // Numpad manual or quick selected product
      const itemName = selectedQuickProduct
        ? selectedQuickProduct.name
        : description.trim() || 'Item Registrado';
      const itemCost = selectedQuickProduct && selectedQuickProduct.costPrice
        ? selectedQuickProduct.costPrice
        : totalAmount * 0.45;
      calculatedCost = itemCost;

      saleItems = [
        {
          productId: selectedQuickProduct ? selectedQuickProduct.id : undefined,
          name: itemName,
          quantity: 1,
          unitPrice: totalAmount,
          subtotal: totalAmount,
          costPrice: itemCost,
        },
      ];
    }

    const newSale: Sale = {
      id: `sale_${Date.now()}`,
      code: saleCode,
      date: new Date().toISOString(),
      items: saleItems,
      totalAmount,
      totalCost: calculatedCost,
      paymentMethod,
      amountReceived:
        paymentMethod === 'dinheiro' && amountReceived > 0
          ? amountReceived
          : totalAmount,
      changeGiven: paymentMethod === 'dinheiro' ? changeGiven : 0,
      customerName: customerName.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      notes:
        saleItems.length > 1
          ? saleItems.map((i) => `${i.quantity}x ${i.name}`).join(', ')
          : saleItems[0]?.name || description,
      status: 'concluida',
    };

    if (soundEnabled) {
      playSaleChime();
    }

    onCompleteSale(newSale);
    resetAllState();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full sm:max-w-lg bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header Bar */}
        <div className="shrink-0 bg-white px-5 pt-4 pb-3 border-b border-slate-100 flex items-center justify-between z-10">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
              <span>Registrar Venda</span>
            </h2>
            <p className="text-xs text-slate-500">
              {saleMode === 'numpad'
                ? 'Digite o valor ou selecione um produto'
                : 'Selecione os itens do catálogo'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              resetAllState();
              onClose();
            }}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="shrink-0 bg-slate-50 px-4 py-2 border-b border-slate-200">
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-200/70 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                if (soundEnabled) playTapBeep();
                setSaleMode('numpad');
              }}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                saleMode === 'numpad'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calculator className="w-4 h-4" />
              <span>Digitar Valor</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (soundEnabled) playTapBeep();
                setSaleMode('catalog');
              }}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all relative ${
                saleMode === 'catalog'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Catálogo ({products.length})</span>
              {catalogItemsCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center ml-0.5">
                  {catalogItemsCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 overscroll-contain">
          
          {/* MODE 1: NUMPAD */}
          {saleMode === 'numpad' && (
            <div className="space-y-3.5">
              {/* Big Amount Screen */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
                    Valor da Venda
                  </span>
                  {selectedQuickProduct && (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md flex items-center gap-1 truncate max-w-[200px]">
                      <Tag className="w-3 h-3" />
                      <span className="truncate">{selectedQuickProduct.name}</span>
                    </span>
                  )}
                </div>

                <div className="text-4xl sm:text-5xl font-black text-emerald-700 tracking-tight font-mono-numbers">
                  {formatCurrency(totalAmount)}
                </div>

                {/* Quick Increment Buttons */}
                <div className="flex items-center justify-center gap-2 mt-3">
                  {[5, 10, 20, 50].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => handleAddQuick(v)}
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-800 text-xs font-semibold border border-slate-200 transition-colors touch-press font-mono-numbers shadow-xs"
                    >
                      +{v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Registered Products Selector Chips */}
              {products.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-600 font-semibold">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Produtos Rápidos (Toque para preencher):</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setSaleMode('catalog')}
                      className="text-emerald-700 hover:text-emerald-800 text-[11px] font-bold"
                    >
                      Ver Catálogo Completo →
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                    {products.slice(0, 10).map((prod) => {
                      const isSelected = selectedQuickProduct?.id === prod.id;
                      return (
                        <button
                          key={prod.id}
                          type="button"
                          onClick={() => handleSelectQuickProduct(prod)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border shrink-0 transition-all ${
                            isSelected
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                              : 'bg-white border-slate-200 text-slate-800 hover:border-emerald-400'
                          }`}
                        >
                          <span>{prod.name}</span>
                          <span className="ml-1.5 font-mono-numbers opacity-80">
                            {formatCurrency(prod.price)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Optional Description / Item Name */}
              <div>
                <input
                  type="text"
                  placeholder="Nome do produto ou descrição rápida (ex: Pastel de Carne)"
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    if (selectedQuickProduct && e.target.value !== selectedQuickProduct.name) {
                      setSelectedQuickProduct(null);
                    }
                  }}
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              {/* Numpad Grid */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((key) => {
                  const isClear = key === 'C';
                  const isBack = key === '⌫';

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        if (isClear) handleClear();
                        else if (isBack) handleBackspace();
                        else handleDigit(key);
                      }}
                      className={`min-h-[48px] rounded-2xl font-bold text-lg flex items-center justify-center transition-all touch-press ${
                        isClear
                          ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                          : isBack
                          ? 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
                          : 'bg-slate-100 text-slate-900 border border-slate-200 hover:bg-slate-200 font-mono-numbers'
                      }`}
                    >
                      {isBack ? <Delete className="w-5 h-5" /> : key}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* MODE 2: CATALOG */}
          {saleMode === 'catalog' && (
            <div className="space-y-3.5">
              {/* Search & Category Filter */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar no catálogo por nome ou categoria..."
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-emerald-500 font-medium"
                  />
                  {catalogSearch && (
                    <button
                      type="button"
                      onClick={() => setCatalogSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Category Pills */}
                {categories.length > 0 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                    <button
                      type="button"
                      onClick={() => setSelectedCategory('todos')}
                      className={`px-3 py-1 rounded-xl text-xs font-bold shrink-0 transition-colors ${
                        selectedCategory === 'todos'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Todos
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold shrink-0 transition-colors ${
                          selectedCategory === cat
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Products List */}
              {products.length === 0 ? (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center space-y-2">
                  <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">Nenhum produto cadastrado ainda</p>
                  <p className="text-[11px] text-slate-500">
                    Você pode usar o modo "Digitar Valor" para registrar qualquer valor agora, ou cadastrar produtos na aba Produtos!
                  </p>
                  <button
                    type="button"
                    onClick={() => setSaleMode('numpad')}
                    className="mt-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"
                  >
                    Mudar para Digitar Valor
                  </button>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center text-xs text-slate-500">
                  Nenhum produto encontrado com "{catalogSearch}".
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto overscroll-contain pr-1">
                  {filteredProducts.map((p) => {
                    const qty = catalogCart[p.id] || 0;
                    return (
                      <div
                        key={p.id}
                        className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                          qty > 0
                            ? 'bg-emerald-50/60 border-emerald-300 shadow-2xs'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-xs text-slate-900 truncate">{p.name}</div>
                          <div className="flex items-center gap-2 text-[11px] mt-0.5">
                            <span className="font-extrabold text-emerald-700 font-mono-numbers">
                              {formatCurrency(p.price)}
                            </span>
                            {p.category && (
                              <span className="text-slate-400 text-[10px]">· {p.category}</span>
                            )}
                            {p.stock !== undefined && (
                              <span className="text-[10px] text-slate-400">
                                · Estoque: {p.stock}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Counter Controls */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {qty > 0 ? (
                            <div className="flex items-center bg-white rounded-xl border border-emerald-300 shadow-2xs p-0.5">
                              <button
                                type="button"
                                onClick={() => handleRemoveCatalogItem(p.id)}
                                className="w-7 h-7 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="w-8 text-center font-extrabold text-xs text-emerald-900 font-mono-numbers">
                                {qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleAddCatalogItem(p.id)}
                                className="w-7 h-7 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center font-bold"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAddCatalogItem(p.id)}
                              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 border border-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Adicionar</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Cart Summary Bar if items selected */}
              {catalogItemsCount > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-center justify-between text-xs animate-in fade-in duration-150">
                  <div>
                    <span className="font-bold text-emerald-900">
                      {catalogItemsCount} {catalogItemsCount === 1 ? 'item selecionado' : 'itens selecionados'}
                    </span>
                    <div className="text-[11px] text-emerald-700 truncate max-w-[220px]">
                      {Object.entries(catalogCart)
                        .filter(([_, q]) => q > 0)
                        .map(([pId, q]) => {
                          const p = products.find((x) => x.id === pId);
                          return `${q}x ${p?.name || 'Item'}`;
                        })
                        .join(', ')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleClearCatalogCart}
                      className="text-[11px] text-rose-600 hover:underline font-semibold"
                    >
                      Limpar
                    </button>
                    <span className="text-base font-black text-emerald-800 font-mono-numbers">
                      {formatCurrency(catalogTotal)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* COMMON SECTION: Payment Method Selector */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              Opção de Pagamento
            </label>
            <div className="relative">
              <select
                value={paymentMethod}
                onChange={(e) => {
                  setPaymentMethod(e.target.value as PaymentMethod);
                  if (soundEnabled) playTapBeep();
                }}
                className="w-full h-11 pl-11 pr-10 rounded-2xl bg-white border border-slate-300 text-slate-900 text-xs sm:text-sm font-bold focus:outline-none focus:border-emerald-500 appearance-none shadow-xs cursor-pointer"
              >
                <option value="pix">PIX (Chave ou QR Code)</option>
                <option value="dinheiro">Dinheiro Físico</option>
                <option value="cartao_debito">Cartão de Débito</option>
                <option value="cartao_credito">Cartão de Crédito</option>
                <option value="fiado">Venda a Prazo (Fiado / Notinha)</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-emerald-600">
                {paymentMethod === 'pix' && <QrCode className="w-5 h-5" />}
                {paymentMethod === 'dinheiro' && <Banknote className="w-5 h-5" />}
                {paymentMethod === 'cartao_debito' && <CreditCard className="w-5 h-5" />}
                {paymentMethod === 'cartao_credito' && <CreditCard className="w-5 h-5" />}
                {paymentMethod === 'fiado' && <BookUser className="w-5 h-5 text-amber-600" />}
              </div>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* COMMON SECTION: Troco Calculator when Cash is selected */}
          {paymentMethod === 'dinheiro' && totalAmount > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-600">Dinheiro entregue pelo cliente:</span>
                <span className="font-mono-numbers text-slate-900 font-bold">
                  {amountReceived > 0 ? formatCurrency(amountReceived) : 'Exato'}
                </span>
              </div>

              {/* Quick Bill presets */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
                {[10, 20, 50, 100, 200].map((bill) => (
                  <button
                    key={bill}
                    type="button"
                    onClick={() => handleSelectCashBill(bill)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors shrink-0 ${
                      receivedCents === bill * 100
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    R$ {bill}
                  </button>
                ))}
                {receivedCents > 0 && (
                  <button
                    type="button"
                    onClick={() => setReceivedCents(0)}
                    className="px-2 py-1.5 rounded-xl text-xs text-slate-500 hover:text-slate-800 shrink-0"
                  >
                    Valor Exato
                  </button>
                )}
              </div>

              {/* Troco Result */}
              {changeGiven > 0 && (
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800">Devolver de Troco:</span>
                  <span className="text-xl font-black text-emerald-700 font-mono-numbers">
                    {formatCurrency(changeGiven)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* COMMON SECTION: Customer / Fiado details */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  Dados do Cliente {paymentMethod === 'fiado' ? '(Obrigatório para venda a prazo)' : '(Opcional)'}
                </span>
              </span>
            </div>

            {/* Quick customer pick suggestions */}
            {customers && customers.length > 0 && !customerName && (
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                <span className="text-[10px] text-slate-500 font-medium shrink-0">Cadastrados:</span>
                {customers.slice(0, 5).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setCustomerName(c.name);
                      if (c.phone) setCustomerPhone(c.phone);
                    }}
                    className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-[11px] font-semibold hover:border-emerald-500 shrink-0"
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Nome do Cliente (ex: Dona Maria)"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-emerald-500"
              />
              <input
                type="tel"
                placeholder="WhatsApp (ex: 11999998888)"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Sticky Action Footer */}
        <div className="shrink-0 bg-white border-t border-slate-100 p-4 z-20 pb-safe">
          <button
            type="button"
            disabled={totalAmount <= 0}
            onClick={handleSubmit}
            className={`w-full min-h-[50px] rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 shadow-xs transition-all touch-press ${
              totalAmount > 0
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-[0.98]'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
            }`}
          >
            <Check className="w-5 h-5 stroke-[2.5]" />
            <span>
              FINALIZAR VENDA ({formatCurrency(totalAmount)})
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
