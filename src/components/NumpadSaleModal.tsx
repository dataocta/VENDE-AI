import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  RotateCcw,
  Wrench,
  Tag,
  UserPlus,
  Keyboard,
  ArrowRight,
} from 'lucide-react';
import { PaymentMethod, Sale, Customer, Product } from '../types';
import { formatCurrency } from '../utils/receipt';
import { playSaleChime, playTapBeep } from '../utils/audio';

type EntryCategoryType = 'venda' | 'estorno' | 'servico' | 'aporte' | 'outro';

interface NumpadSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleteSale: (sale: Sale) => void;
  soundEnabled: boolean;
  defaultCustomerName?: string;
  customers?: Customer[];
  products?: Product[];
  onSaveCustomer?: (customer: Customer) => void;
}

export const NumpadSaleModal: React.FC<NumpadSaleModalProps> = ({
  isOpen,
  onClose,
  onCompleteSale,
  soundEnabled,
  defaultCustomerName,
  customers = [],
  products = [],
  onSaveCustomer,
}) => {
  // Mode selection: 'numpad' (default) or 'catalog'
  const [saleMode, setSaleMode] = useState<'numpad' | 'catalog'>('numpad');

  // Entry Category / Type: 'venda', 'estorno', 'servico', 'aporte', 'outro'
  const [entryCategory, setEntryCategory] = useState<EntryCategoryType>('venda');
  const [customCategoryName, setCustomCategoryName] = useState<string>('');

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

  // Customer state & modal selector
  const [customerName, setCustomerName] = useState<string>(defaultCustomerName || '');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerId, setCustomerId] = useState<string | undefined>(undefined);
  const [isCustomerSelectorOpen, setIsCustomerSelectorOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [isCreatingNewCustomer, setIsCreatingNewCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');

  // Description / Extra info expandable toggle
  const [showExtraOptions, setShowExtraOptions] = useState(false);

  // Focusable invisible input for PC keyboard input
  const amountInputRef = useRef<HTMLInputElement>(null);

  // Entry category options
  const entryCategories: {
    id: EntryCategoryType;
    label: string;
    icon: React.FC<{ className?: string }>;
    accentColor: string;
    activeBg: string;
  }[] = [
    { id: 'venda', label: 'Venda', icon: ShoppingBag, accentColor: 'text-emerald-700', activeBg: 'bg-emerald-600 text-white' },
    { id: 'estorno', label: 'Estorno', icon: RotateCcw, accentColor: 'text-purple-700', activeBg: 'bg-purple-600 text-white' },
    { id: 'servico', label: 'Serviço', icon: Wrench, accentColor: 'text-blue-700', activeBg: 'bg-blue-600 text-white' },
    { id: 'aporte', label: 'Aporte de Caixa', icon: Banknote, accentColor: 'text-amber-700', activeBg: 'bg-amber-600 text-white' },
    { id: 'outro', label: 'Outra Entrada', icon: Tag, accentColor: 'text-slate-700', activeBg: 'bg-slate-700 text-white' },
  ];

  // Categories from products
  const productCategories = useMemo(() => {
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

  // Filtered customers for customer selector
  const filteredCustomers = useMemo(() => {
    const term = customerSearch.toLowerCase().trim();
    if (!term) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        (c.phone && c.phone.includes(term)) ||
        (c.addressOrSpot && c.addressOrSpot.toLowerCase().includes(term))
    );
  }, [customers, customerSearch]);

  // Reset all state when closed
  const resetAllState = () => {
    setCents(0);
    setReceivedCents(0);
    setSelectedQuickProduct(null);
    setCatalogCart({});
    setDescription('');
    setCustomerName('');
    setCustomerPhone('');
    setCustomerId(undefined);
    setEntryCategory('venda');
    setCustomCategoryName('');
    setIsCustomerSelectorOpen(false);
    setIsCreatingNewCustomer(false);
    setShowExtraOptions(false);
  };

  // Numpad key handlers
  const handleDigit = (digit: string) => {
    if (soundEnabled) playTapBeep();
    if (cents.toString().length >= 8) return;
    const nextStr = (cents === 0 ? '' : cents.toString()) + digit;
    setCents(parseInt(nextStr || '0', 10));
    setSelectedQuickProduct(null);
  };

  const handleClear = () => {
    if (soundEnabled) playTapBeep();
    setCents(0);
    setReceivedCents(0);
    setSelectedQuickProduct(null);
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

  // Quick Customer Creation
  const handleSaveAndSelectNewCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newCustName.trim();
    if (!cleanName) return;

    const newCustomer: Customer = {
      id: `cust_${Date.now()}`,
      name: cleanName,
      phone: newCustPhone.trim(),
      addressOrSpot: newCustAddress.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    if (onSaveCustomer) {
      onSaveCustomer(newCustomer);
    }

    setCustomerName(newCustomer.name);
    setCustomerPhone(newCustomer.phone);
    setCustomerId(newCustomer.id);
    setIsCreatingNewCustomer(false);
    setIsCustomerSelectorOpen(false);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustAddress('');
  };

  // PC Keyboard physical listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // If user is currently typing in an input or textarea (search, customer form, etc.), let the input handle it
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT');

      if (e.key === 'Escape') {
        e.preventDefault();
        if (isCustomerSelectorOpen) {
          setIsCustomerSelectorOpen(false);
        } else {
          resetAllState();
          onClose();
        }
        return;
      }

      // If user is typing in a text field, do not capture numpad digits
      if (isInput) return;

      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'c' || e.key === 'C' || e.key === 'Delete') {
        e.preventDefault();
        handleClear();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (totalAmount > 0) {
          handleSubmitDirect();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isOpen,
    cents,
    totalAmount,
    paymentMethod,
    customerName,
    saleMode,
    catalogCart,
    isCustomerSelectorOpen,
    entryCategory,
    description,
    customerPhone,
    customerId,
    changeGiven,
    amountReceived,
  ]);

  // Submit sale function
  const handleSubmitDirect = () => {
    if (totalAmount <= 0) return;

    if (paymentMethod === 'fiado' && !customerName.trim()) {
      alert('Para venda a prazo, selecione ou informe o cliente!');
      return;
    }

    const saleCode = `#${Math.floor(1000 + Math.random() * 9000)}`;

    let saleItems: Sale['items'] = [];
    let calculatedCost = 0;

    const activeCatConfig = entryCategories.find((c) => c.id === entryCategory);
    const categoryLabel =
      entryCategory === 'outro' && customCategoryName.trim()
        ? customCategoryName.trim()
        : activeCatConfig?.label || 'Venda';

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
      let defaultItemName = 'Venda Registrada';
      if (entryCategory === 'estorno') {
        defaultItemName = 'Estorno / Devolução';
        calculatedCost = 0; // Estorno has 0 cost of goods sold
      } else if (entryCategory === 'servico') {
        defaultItemName = 'Serviço Prestado';
        calculatedCost = 0;
      } else if (entryCategory === 'aporte') {
        defaultItemName = 'Aporte de Caixa / Troco';
        calculatedCost = 0;
      } else if (entryCategory === 'outro') {
        defaultItemName = customCategoryName.trim() || 'Entrada Avulsa';
        calculatedCost = 0;
      } else {
        const itemCost =
          selectedQuickProduct && selectedQuickProduct.costPrice
            ? selectedQuickProduct.costPrice
            : totalAmount * 0.45;
        calculatedCost = itemCost;
      }

      const itemName = selectedQuickProduct
        ? selectedQuickProduct.name
        : description.trim() || defaultItemName;

      saleItems = [
        {
          productId: selectedQuickProduct ? selectedQuickProduct.id : undefined,
          name: itemName,
          quantity: 1,
          unitPrice: totalAmount,
          subtotal: totalAmount,
          costPrice: calculatedCost,
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
      customerId: customerId || undefined,
      notes:
        saleItems.length > 1
          ? saleItems.map((i) => `${i.quantity}x ${i.name}`).join(', ')
          : saleItems[0]?.name || description || categoryLabel,
      status: 'concluida',
      entryType: entryCategory,
      category: categoryLabel,
    };

    if (soundEnabled) {
      playSaleChime();
    }

    onCompleteSale(newSale);
    resetAllState();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmitDirect();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full sm:max-w-lg bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden">
        
        {/* Header Bar */}
        <div className="shrink-0 bg-white px-5 pt-3.5 pb-2.5 border-b border-slate-100 flex items-center justify-between z-10">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-1.5">
              <span>Registrar Entrada</span>
              {entryCategory !== 'venda' && (
                <span className="text-xs px-2 py-0.5 rounded-md font-bold uppercase bg-purple-100 text-purple-800 border border-purple-200">
                  {entryCategory}
                </span>
              )}
            </h2>
            <p className="text-[11px] text-slate-500">
              Digite o valor no teclado numérico ou no teclado do PC
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              resetAllState();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. Categorias de Entrada (Venda, Estorno, Serviço, Aporte, Outro) */}
        <div className="shrink-0 bg-slate-50 px-4 py-2 border-b border-slate-200">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
            {entryCategories.map((cat) => {
              const Icon = cat.icon;
              const isSelected = entryCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    if (soundEnabled) playTapBeep();
                    setEntryCategory(cat.id);
                  }}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 ${
                    isSelected
                      ? cat.activeBg + ' shadow-xs scale-102'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* If custom category picked */}
          {entryCategory === 'outro' && (
            <div className="pt-2">
              <input
                type="text"
                placeholder="Qual o tipo de entrada? (ex: Aluguel, Reembolso, Frete)..."
                value={customCategoryName}
                onChange={(e) => setCustomCategoryName(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-slate-500 font-medium"
              />
            </div>
          )}
        </div>

        {/* Mode Switcher Tabs (Digitar Valor vs Catálogo) */}
        <div className="shrink-0 bg-white px-4 pt-2 pb-1">
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                if (soundEnabled) playTapBeep();
                setSaleMode('numpad');
              }}
              className={`py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                saleMode === 'numpad'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Teclado Numérico</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (soundEnabled) playTapBeep();
                setSaleMode('catalog');
              }}
              className={`py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all relative ${
                saleMode === 'catalog'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Itens Cadastrados ({products.length})</span>
              {catalogItemsCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center ml-0.5">
                  {catalogItemsCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 overscroll-contain">
          
          {/* ==================================================== */}
          {/* MODE 1: NUMPAD (IMMEDIATE NUMERIC KEYPAD ON TOP)     */}
          {/* ==================================================== */}
          {saleMode === 'numpad' && (
            <div className="space-y-3">
              {/* Display Screen: Valor */}
              <div className="bg-slate-900 text-white rounded-2xl p-3.5 text-center relative shadow-sm">
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-0.5 px-1">
                  <span className="font-semibold uppercase tracking-wider">
                    {entryCategory === 'estorno'
                      ? 'Valor do Estorno'
                      : entryCategory === 'servico'
                      ? 'Valor do Serviço'
                      : entryCategory === 'aporte'
                      ? 'Valor do Aporte'
                      : 'Valor da Entrada'}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                    <Keyboard className="w-3 h-3" />
                    <span>Teclado PC ativo</span>
                  </span>
                </div>

                {/* Big numbers display */}
                <div className="text-3xl sm:text-4xl font-black text-emerald-400 tracking-tight font-mono-numbers py-0.5">
                  {formatCurrency(totalAmount)}
                </div>

                {/* Preset quick buttons */}
                <div className="flex items-center justify-center gap-1.5 mt-2">
                  {[2, 5, 10, 20, 50].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => handleAddQuick(v)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-colors touch-press font-mono-numbers"
                    >
                      +{v}
                    </button>
                  ))}
                </div>
              </div>

              {/* TECLADO NUMÉRICO PROEMINENTE (IMMEDIATELY VISIBLE) */}
              <div className="grid grid-cols-3 gap-2">
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
                      className={`min-h-[50px] sm:min-h-[52px] rounded-2xl font-black text-xl flex items-center justify-center transition-all touch-press ${
                        isClear
                          ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 active:scale-95'
                          : isBack
                          ? 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 active:scale-95'
                          : 'bg-slate-100 text-slate-900 border border-slate-200 hover:bg-slate-200 active:scale-95 font-mono-numbers shadow-2xs'
                      }`}
                    >
                      {isBack ? <Delete className="w-5 h-5" /> : key}
                    </button>
                  );
                })}
              </div>

              {/* Collapsible: Vincular produto rápido ou descrição */}
              <div className="pt-1">
                {!showExtraOptions ? (
                  <button
                    type="button"
                    onClick={() => setShowExtraOptions(true)}
                    className="w-full py-1.5 text-center text-xs font-semibold text-emerald-700 hover:underline flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar descrição ou selecionar produto específico</span>
                  </button>
                ) : (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                      <span>Descrição / Produto Específico:</span>
                      <button
                        type="button"
                        onClick={() => setShowExtraOptions(false)}
                        className="text-slate-400 hover:text-slate-600 text-[11px]"
                      >
                        Recolher
                      </button>
                    </div>

                    <input
                      type="text"
                      placeholder="Ex: Pastel de Carne, Refrigerante 2L, Reparo..."
                      value={description}
                      onChange={(e) => {
                        setDescription(e.target.value);
                        if (selectedQuickProduct && e.target.value !== selectedQuickProduct.name) {
                          setSelectedQuickProduct(null);
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-emerald-500 font-medium"
                    />

                    {/* Quick products chips */}
                    {products.length > 0 && (
                      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                        {products.slice(0, 8).map((prod) => {
                          const isSelected = selectedQuickProduct?.id === prod.id;
                          return (
                            <button
                              key={prod.id}
                              type="button"
                              onClick={() => handleSelectQuickProduct(prod)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border shrink-0 transition-all ${
                                isSelected
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : 'bg-white border-slate-200 text-slate-800 hover:border-emerald-400'
                              }`}
                            >
                              <span>{prod.name}</span>
                              <span className="ml-1 opacity-80">({formatCurrency(prod.price)})</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* MODE 2: CATALOG (SELECT FROM REGISTERED ITEMS)       */}
          {/* ==================================================== */}
          {saleMode === 'catalog' && (
            <div className="space-y-3">
              {/* Search & Category Filter */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar no catálogo por nome ou categoria..."
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-emerald-500 font-medium"
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
                {productCategories.length > 0 && (
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
                    {productCategories.map((cat) => (
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
                    Use o Teclado Numérico para digitar qualquer valor, ou cadastre produtos na aba Produtos!
                  </p>
                  <button
                    type="button"
                    onClick={() => setSaleMode('numpad')}
                    className="mt-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"
                  >
                    Usar Teclado Numérico
                  </button>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center text-xs text-slate-500">
                  Nenhum produto encontrado com "{catalogSearch}".
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[260px] overflow-y-auto overscroll-contain pr-1">
                  {filteredProducts.map((p) => {
                    const qty = catalogCart[p.id] || 0;
                    return (
                      <div
                        key={p.id}
                        className={`p-2.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
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
                          </div>
                        </div>

                        {/* Counter Controls */}
                        <div className="flex items-center gap-1 shrink-0">
                          {qty > 0 ? (
                            <div className="flex items-center bg-white rounded-xl border border-emerald-300 shadow-2xs p-0.5">
                              <button
                                type="button"
                                onClick={() => handleRemoveCatalogItem(p.id)}
                                className="w-7 h-7 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="w-7 text-center font-extrabold text-xs text-emerald-900 font-mono-numbers">
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

          {/* ==================================================== */}
          {/* CLIENTE: SELECIONAR CLIENTE CADASTRADO OU CRIAR NOVO */}
          {/* ==================================================== */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-600" />
                <span>Cliente {paymentMethod === 'fiado' ? '(Obrigatório para fiado)' : '(Opcional)'}</span>
              </span>

              {customerName && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomerName('');
                    setCustomerPhone('');
                    setCustomerId(undefined);
                  }}
                  className="text-[11px] text-rose-600 hover:underline font-medium"
                >
                  Remover
                </button>
              )}
            </div>

            {/* Selected Customer Card */}
            {customerName ? (
              <div className="p-2.5 rounded-xl bg-white border border-emerald-300 flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0">
                    {customerName[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">{customerName}</div>
                    {customerPhone && (
                      <div className="text-[11px] text-slate-500 font-mono">{customerPhone}</div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCustomerSelectorOpen(true)}
                  className="px-2.5 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors shrink-0"
                >
                  Trocar
                </button>
              </div>
            ) : (
              /* If no customer selected: show selector toggle */
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => setIsCustomerSelectorOpen(!isCustomerSelectorOpen)}
                  className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-bold flex items-center justify-between hover:border-emerald-500 transition-colors shadow-2xs"
                >
                  <span className="flex items-center gap-2 text-slate-600">
                    <UserPlus className="w-4 h-4 text-emerald-600" />
                    <span>Selecionar cliente cadastrado ou criar novo</span>
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${isCustomerSelectorOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Quick horizontal customer chips */}
                {customers.length > 0 && !isCustomerSelectorOpen && (
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                    <span className="text-[10px] text-slate-400 font-medium shrink-0">Recentes:</span>
                    {customers.slice(0, 5).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setCustomerName(c.name);
                          setCustomerPhone(c.phone || '');
                          setCustomerId(c.id);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 text-[11px] font-semibold hover:border-emerald-500 hover:text-emerald-700 shrink-0 shadow-2xs"
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* EXPANDABLE: Search / Select or Create Customer Panel */}
            {isCustomerSelectorOpen && (
              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-3 mt-2 animate-in fade-in duration-150">
                {!isCreatingNewCustomer ? (
                  <>
                    {/* Search and + Novo button */}
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Buscar cliente por nome ou WhatsApp..."
                          value={customerSearch}
                          onChange={(e) => setCustomerSearch(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-emerald-500 font-medium"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsCreatingNewCustomer(true)}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shrink-0 transition-colors shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Novo</span>
                      </button>
                    </div>

                    {/* Customer List */}
                    <div className="max-h-[160px] overflow-y-auto space-y-1 pr-1 overscroll-contain">
                      {filteredCustomers.length === 0 ? (
                        <div className="text-center py-4 text-xs text-slate-400">
                          Nenhum cliente encontrado. Clique em "+ Novo" para cadastrar!
                        </div>
                      ) : (
                        filteredCustomers.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setCustomerName(c.name);
                              setCustomerPhone(c.phone || '');
                              setCustomerId(c.id);
                              setIsCustomerSelectorOpen(false);
                            }}
                            className="w-full p-2 rounded-lg hover:bg-emerald-50/70 border border-slate-100 flex items-center justify-between text-left text-xs transition-colors"
                          >
                            <div className="min-w-0 pr-2">
                              <span className="font-bold text-slate-900 truncate block">{c.name}</span>
                              {c.phone && <span className="text-[10px] text-slate-500 font-mono">{c.phone}</span>}
                            </div>
                            <span className="text-[11px] font-bold text-emerald-700 shrink-0">Selecionar</span>
                          </button>
                        ))
                      )}
                    </div>
                  </>
                ) : (
                  /* Form to create and save new customer right inside sale modal */
                  <form onSubmit={handleSaveAndSelectNewCustomer} className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1">
                        <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Cadastrar Novo Cliente</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsCreatingNewCustomer(false)}
                        className="text-[11px] text-slate-400 hover:text-slate-600"
                      >
                        Voltar à lista
                      </button>
                    </div>

                    <div>
                      <input
                        type="text"
                        required
                        placeholder="Nome Completo *"
                        value={newCustName}
                        onChange={(e) => setNewCustName(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-emerald-500 font-medium"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="tel"
                        placeholder="WhatsApp / Telefone"
                        value={newCustPhone}
                        onChange={(e) => setNewCustPhone(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-emerald-500 font-medium"
                      />
                      <input
                        type="text"
                        placeholder="Ponto / Referência"
                        value={newCustAddress}
                        onChange={(e) => setNewCustAddress(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-emerald-500 font-medium"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsCreatingNewCustomer(false)}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-2xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Salvar e Vincular</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* ==================================================== */}
          {/* FORMA DE PAGAMENTO                                   */}
          {/* ==================================================== */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              Forma de Recebimento
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

          {/* Troco Calculator when Cash is selected */}
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
        </div>

        {/* Sticky Action Footer */}
        <div className="shrink-0 bg-white border-t border-slate-100 p-4 z-20 pb-safe">
          <button
            type="button"
            disabled={totalAmount <= 0}
            onClick={handleSubmit}
            className={`w-full min-h-[50px] rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 shadow-xs transition-all touch-press ${
              totalAmount > 0
                ? entryCategory === 'estorno'
                  ? 'bg-purple-600 hover:bg-purple-700 text-white active:scale-[0.98]'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-[0.98]'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
            }`}
          >
            <Check className="w-5 h-5 stroke-[2.5]" />
            <span>
              {entryCategory === 'estorno'
                ? `CONFIRMAR ESTORNO (${formatCurrency(totalAmount)})`
                : entryCategory === 'servico'
                ? `CONFIRMAR SERVIÇO (${formatCurrency(totalAmount)})`
                : `FINALIZAR ENTRADA (${formatCurrency(totalAmount)})`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
