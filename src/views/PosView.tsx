import React, { useState } from 'react';
import {
  Zap,
  Plus,
  Minus,
  Trash2,
  Share2,
  Check,
  ShoppingBag,
  TrendingUp,
  Receipt,
  X,
  CreditCard,
  QrCode,
  Banknote,
  BookUser,
  AlertCircle,
} from 'lucide-react';
import { Product, Sale, CartItem, PaymentMethod, BusinessSettings } from '../types';
import { formatCurrency, formatDateBR, getPaymentMethodLabel, generateWhatsAppSaleReceipt } from '../utils/receipt';
import { playSaleChime, playTapBeep } from '../utils/audio';

interface PosViewProps {
  products: Product[];
  sales: Sale[];
  settings: BusinessSettings;
  onCompleteSale: (sale: Sale) => void;
  onCancelSale: (saleId: string) => void;
  onOpenNumpadSale: () => void;
  onNavigateToTab: (tab: any) => void;
}

export const PosView: React.FC<PosViewProps> = ({
  products,
  sales,
  settings,
  onCompleteSale,
  onCancelSale,
  onOpenNumpadSale,
  onNavigateToTab,
}) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [receivedCashStr, setReceivedCashStr] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');

  // Today's stats calculation
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySales = sales.filter((s) => s.status === 'concluida' && s.date.startsWith(todayStr));
  const todaySalesTotal = todaySales.reduce((acc, s) => acc + s.totalAmount, 0);
  const todayProfitTotal = todaySales.reduce((acc, s) => acc + (s.totalAmount - (s.totalCost || 0)), 0);
  const goalProgress = settings.dailyGoal > 0 ? Math.min(100, Math.round((todaySalesTotal / settings.dailyGoal) * 100)) : 0;

  // Categories list
  const categories = ['todos', ...Array.from(new Set(products.map((p) => p.category)))];

  const filteredProducts = selectedCategory === 'todos'
    ? products
    : products.filter((p) => p.category === selectedCategory);

  const cartTotal = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const cartCostTotal = cart.reduce((acc, item) => acc + (item.product.costPrice || 0) * item.quantity, 0);
  const cartItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const handleAddToCart = (product: Product) => {
    if (settings.soundEnabled) playTapBeep();
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.product.id === product.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx].quantity += 1;
        return copy;
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const handleRemoveOne = (productId: string) => {
    if (settings.soundEnabled) playTapBeep();
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.product.id === productId);
      if (idx >= 0) {
        if (prev[idx].quantity > 1) {
          const copy = [...prev];
          copy[idx].quantity -= 1;
          return copy;
        }
        return prev.filter((i) => i.product.id !== productId);
      }
      return prev;
    });
  };

  const handleClearCart = () => {
    if (settings.soundEnabled) playTapBeep();
    setCart([]);
    setIsCheckoutOpen(false);
  };

  const handleOpenCheckout = () => {
    if (cart.length === 0) return;
    if (settings.soundEnabled) playTapBeep();
    setIsCheckoutOpen(true);
  };

  const handleFinalizeCartSale = () => {
    if (cartTotal <= 0) return;

    if (paymentMethod === 'fiado' && !customerName.trim()) {
      alert('Para venda a prazo, informe o nome do cliente!');
      return;
    }

    const receivedCash = parseFloat(receivedCashStr.replace(',', '.')) || 0;
    const changeGiven = paymentMethod === 'dinheiro' && receivedCash > cartTotal ? receivedCash - cartTotal : 0;

    const saleCode = `#${Math.floor(1000 + Math.random() * 9000)}`;
    const newSale: Sale = {
      id: `sale_${Date.now()}`,
      code: saleCode,
      date: new Date().toISOString(),
      items: cart.map((ci) => ({
        productId: ci.product.id,
        name: ci.product.name,
        quantity: ci.quantity,
        unitPrice: ci.product.price,
        subtotal: ci.product.price * ci.quantity,
        costPrice: ci.product.costPrice,
      })),
      totalAmount: cartTotal,
      totalCost: cartCostTotal,
      paymentMethod,
      amountReceived: paymentMethod === 'dinheiro' && receivedCash > 0 ? receivedCash : cartTotal,
      changeGiven: paymentMethod === 'dinheiro' ? changeGiven : 0,
      customerName: customerName.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      status: 'concluida',
    };

    if (settings.soundEnabled) {
      playSaleChime();
    }

    onCompleteSale(newSale);
    setCart([]);
    setIsCheckoutOpen(false);
    setReceivedCashStr('');
    setCustomerName('');
    setCustomerPhone('');
  };

  const handleShareSale = (sale: Sale) => {
    const text = generateWhatsAppSaleReceipt(sale, settings);
    let cleanPhone = (sale.customerPhone || '').replace(/\D/g, '');
    if (cleanPhone.length >= 10 && !cleanPhone.startsWith('55')) {
      cleanPhone = `55${cleanPhone}`;
    }
    const url = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-4 pb-28">
      {/* 1. Daily Summary Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Caixa de Hoje
            </span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span className="text-xs text-slate-500 font-medium">{todaySales.length} vendas</span>
          </div>

          <button
            type="button"
            onClick={() => onNavigateToTab('cash')}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
          >
            <span>Ver Balanço</span>
            <TrendingUp className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Big numbers row */}
        <div className="grid grid-cols-2 gap-3 py-1">
          <div>
            <div className="text-xs text-slate-500 font-medium">Total Vendido Hoje</div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono-numbers tracking-tight">
              {formatCurrency(todaySalesTotal)}
            </div>
          </div>

          <div className="border-l border-slate-200 pl-3">
            <div className="text-xs text-slate-500 font-medium">Lucro Bruto Estimado</div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono-numbers tracking-tight">
              {formatCurrency(todayProfitTotal)}
            </div>
          </div>
        </div>

        {/* Goal Bar */}
        {settings.dailyGoal > 0 && (
          <div className="mt-3 pt-2.5 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-500">
                Meta do Dia: <strong className="text-slate-800 font-mono-numbers">{formatCurrency(settings.dailyGoal)}</strong>
              </span>
              <span className="font-bold text-emerald-700 font-mono-numbers">{goalProgress}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                style={{ width: `${goalProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 2. Fast Primary Action: Teclado Venda Rápida */}
      <div className="grid grid-cols-1 gap-2.5">
        <button
          type="button"
          onClick={onOpenNumpadSale}
          className="w-full min-h-[52px] rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-xs touch-press transition-colors"
        >
          <Zap className="w-4 h-4 fill-white stroke-none" />
          <span>DIGITAR VALOR (TECLADO NUMÉRICO)</span>
        </button>
      </div>

      {/* 3. Fast Pocket Catalog Header & Filter Tabs */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <ShoppingBag className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">Catálogo de Produtos</h3>
          </div>
          <span className="text-xs text-slate-500">
            {filteredProducts.length} itens
          </span>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors touch-press ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white font-bold'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {cat === 'todos' ? 'Todos os Produtos' : cat}
            </button>
          ))}
        </div>

        {/* Product Cards Grid or Clean State Onboarding */}
        {products.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Sua lista de produtos está limpa!
              </h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                Cadastre seus produtos com preço de venda para vender com 1 toque, ou use o teclado numérico acima para digitar valores diretos.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToTab('products')}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-1.5 touch-press transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>CADASTRAR PRIMEIRO PRODUTO</span>
            </button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-500 text-xs shadow-xs">
            Nenhum produto nesta categoria.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {filteredProducts.map((prod) => {
              const inCart = cart.find((i) => i.product.id === prod.id);

              return (
                <div
                  key={prod.id}
                  onClick={() => handleAddToCart(prod)}
                  className={`p-3 rounded-2xl border transition-all text-left flex flex-col justify-between cursor-pointer touch-press relative ${
                    inCart
                      ? 'bg-emerald-50/80 border-emerald-400 shadow-xs ring-1 ring-emerald-500/30'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                  }`}
                >
                  {inCart && (
                    <span className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-black flex items-center justify-center shadow-xs">
                      {inCart.quantity}
                    </span>
                  )}

                  <div>
                    <span className="text-[11px] text-slate-500 font-medium block truncate">
                      {prod.category}
                    </span>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug line-clamp-2 mt-0.5">
                      {prod.name}
                    </h4>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-sm sm:text-base font-extrabold text-emerald-700 font-mono-numbers">
                      {formatCurrency(prod.price)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToCart(prod);
                      }}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 flex items-center justify-center transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Active Cart Sticky Bar (Natural Thumb Zone when items added) */}
      {cartItemsCount > 0 && (
        <div className="fixed bottom-20 left-3 right-3 sm:left-auto sm:right-auto sm:w-full sm:max-w-md z-30">
          <div className="bg-white/98 backdrop-blur-xl border border-slate-300 rounded-2xl p-3 shadow-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-black text-sm flex items-center justify-center shrink-0">
                {cartItemsCount}
              </div>
              <div className="min-w-0">
                <span className="text-[11px] text-slate-500 uppercase font-semibold block">Total Carrinho</span>
                <span className="text-lg font-black text-emerald-700 font-mono-numbers truncate block">
                  {formatCurrency(cartTotal)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleClearCart}
                title="Limpar carrinho"
                className="w-10 h-10 rounded-xl bg-slate-100 text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleOpenCheckout}
                className="px-4 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-xs touch-press transition-all"
              >
                <span>COBRAR</span>
                <Check className="w-4 h-4 stroke-[3]" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Today's Recent Sales Feed */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <Receipt className="w-4 h-4 text-slate-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Últimas Vendas de Hoje ({todaySales.length})
            </h3>
          </div>
        </div>

        {todaySales.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-500 text-xs shadow-xs">
            Nenhuma venda registrada hoje ainda. Toque no botão verde acima para vender!
          </div>
        ) : (
          <div className="space-y-2">
            {todaySales.slice(0, 5).map((s) => (
              <div
                key={s.id}
                className="bg-white border border-slate-200 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-xs"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-slate-900 font-mono-numbers">
                      {formatCurrency(s.totalAmount)}
                    </span>
                    <span className="text-xs text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-md">
                      {getPaymentMethodLabel(s.paymentMethod)}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 truncate mt-0.5">
                    {s.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                  </div>
                  {s.customerName && (
                    <div className="text-[11px] text-slate-500 font-medium">
                      Cliente: {s.customerName}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleShareSale(s)}
                    title="Mandar recibo no WhatsApp"
                    className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center hover:bg-emerald-100 transition-colors"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Deseja realmente cancelar esta venda? O estoque será devolvido.')) {
                        onCancelSale(s.id);
                      }
                    }}
                    title="Cancelar venda"
                    className="w-8 h-8 rounded-lg bg-slate-100 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cart Checkout Bottom Sheet */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto no-scrollbar pb-safe">
            <div className="sticky top-0 bg-white/95 backdrop-blur-md px-5 pt-4 pb-2 border-b border-slate-200 flex items-center justify-between z-10">
              <div>
                <h2 className="text-base font-bold text-slate-900">Finalizar Venda</h2>
                <p className="text-xs text-slate-500">{cartItemsCount} itens no carrinho</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCheckoutOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Selected items list */}
              <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 divide-y divide-slate-200/80 max-h-48 overflow-y-auto">
                {cart.map((item) => (
                  <div key={item.product.id} className="py-2 first:pt-0 last:pb-0 flex items-center justify-between text-xs">
                    <div className="min-w-0 pr-2">
                      <div className="font-semibold text-slate-900 truncate">{item.product.name}</div>
                      <div className="text-slate-500 font-mono-numbers">
                        {item.quantity} x {formatCurrency(item.product.price)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center bg-white border border-slate-200 rounded-lg">
                        <button
                          type="button"
                          onClick={() => handleRemoveOne(item.product.id)}
                          className="w-6 h-6 flex items-center justify-center text-slate-600 hover:text-slate-900"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 text-xs font-bold text-slate-900 font-mono-numbers">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAddToCart(item.product)}
                          className="w-6 h-6 flex items-center justify-center text-slate-600 hover:text-slate-900"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="font-extrabold text-slate-900 font-mono-numbers w-16 text-right">
                        {formatCurrency(item.product.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total display */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between">
                <span className="text-xs uppercase font-bold text-slate-500">Total a Pagar</span>
                <span className="text-2xl font-black text-emerald-700 font-mono-numbers">
                  {formatCurrency(cartTotal)}
                </span>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                  Forma de Pagamento
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('pix')}
                    className={`min-h-[44px] rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold border transition-colors ${
                      paymentMethod === 'pix'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-400 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                    <span>PIX</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('dinheiro')}
                    className={`min-h-[44px] rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold border transition-colors ${
                      paymentMethod === 'dinheiro'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-400 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Dinheiro</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cartao_debito')}
                    className={`min-h-[44px] rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold border transition-colors ${
                      paymentMethod === 'cartao_debito'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-400 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Débito</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cartao_credito')}
                    className={`min-h-[44px] rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold border transition-colors ${
                      paymentMethod === 'cartao_credito'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-400 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Crédito</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('fiado')}
                    className={`min-h-[44px] rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold border col-span-2 transition-colors ${
                      paymentMethod === 'fiado'
                        ? 'bg-amber-50 text-amber-800 border-amber-300 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <BookUser className="w-3.5 h-3.5 text-amber-600" />
                    <span>Venda A Prazo</span>
                  </button>
                </div>
              </div>

              {/* Troco if cash */}
              {paymentMethod === 'dinheiro' && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-semibold">Valor entregue pelo cliente:</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="R$ 0,00"
                      value={receivedCashStr}
                      onChange={(e) => setReceivedCashStr(e.target.value)}
                      className="w-28 px-2 py-1 rounded-lg bg-white border border-slate-300 text-right font-mono-numbers text-slate-900 text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  {parseFloat(receivedCashStr.replace(',', '.')) > cartTotal && (
                    <div className="flex items-center justify-between text-xs text-emerald-700 font-bold pt-1 border-t border-slate-200">
                      <span>Troco a devolver:</span>
                      <span className="font-mono-numbers text-base font-extrabold">
                        {formatCurrency(parseFloat(receivedCashStr.replace(',', '.')) - cartTotal)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Client info */}
              {(paymentMethod === 'fiado' || cartTotal > 50) && (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Nome do Cliente (obrigatório para venda a prazo)"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-emerald-500"
                  />
                  <input
                    type="tel"
                    placeholder="WhatsApp do Cliente (para recibo/cobrança)"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              {/* Submit Button */}
              <button
                type="button"
                onClick={handleFinalizeCartSale}
                className="w-full min-h-[50px] rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-xs touch-press transition-colors"
              >
                <Check className="w-5 h-5 stroke-[3]" />
                <span>CONFIRMAR VENDA ({formatCurrency(cartTotal)})</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
