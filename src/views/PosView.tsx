import React from 'react';
import {
  Zap,
  Trash2,
  Share2,
  TrendingUp,
  Receipt,
  ArrowDownRight,
} from 'lucide-react';
import { Product, Sale, BusinessSettings, Customer, Expense } from '../types';
import { formatCurrency, getPaymentMethodLabel, generateWhatsAppSaleReceipt } from '../utils/receipt';
import { SalesAnalyticsCharts } from '../components/SalesAnalyticsCharts';

interface PosViewProps {
  products: Product[];
  sales: Sale[];
  expenses?: Expense[];
  customers?: Customer[];
  settings: BusinessSettings;
  onCompleteSale: (sale: Sale) => void;
  onCancelSale: (saleId: string) => void;
  onOpenNumpadSale: () => void;
  onOpenNewExpense?: () => void;
  onNavigateToTab: (tab: any) => void;
  onUpdateSettings?: (settings: BusinessSettings) => void;
}

export const PosView: React.FC<PosViewProps> = ({
  sales,
  expenses = [],
  settings,
  onCancelSale,
  onOpenNumpadSale,
  onOpenNewExpense,
  onNavigateToTab,
  onUpdateSettings,
}) => {
  // Today's stats calculation
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySales = sales.filter((s) => s.status === 'concluida' && s.date.startsWith(todayStr));
  const todaySalesTotal = todaySales.reduce((acc, s) => acc + s.totalAmount, 0);
  const todayExpenses = expenses.filter((e) => e.date.startsWith(todayStr));
  const todayExpensesTotal = todayExpenses.reduce((acc, e) => acc + e.amount, 0);

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
            <div className="text-xs text-slate-500 font-medium">Total de Despesas</div>
            <div className="text-2xl sm:text-3xl font-black text-rose-600 font-mono-numbers tracking-tight">
              {formatCurrency(todayExpensesTotal)}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Primary Fast Actions: Registrar Venda e Registrar Despesa */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={onOpenNumpadSale}
          className="w-full min-h-[52px] rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs touch-press transition-colors tracking-wide"
        >
          <Zap className="w-4 h-4 fill-white stroke-none shrink-0" />
          <span>REGISTRAR VENDA</span>
        </button>

        <button
          type="button"
          onClick={onOpenNewExpense}
          className="w-full min-h-[52px] rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs touch-press transition-colors tracking-wide"
        >
          <ArrowDownRight className="w-4 h-4 stroke-[2.5] shrink-0" />
          <span>REGISTRAR DESPESA</span>
        </button>
      </div>

      {/* 3. Desempenho & Gráficos: Linha de Vendas, Produtos Mais Vendidos e Formas de Pagamento */}
      <SalesAnalyticsCharts sales={sales} settings={settings} />

      {/* 4. Today's Recent Sales Feed */}
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
            Nenhuma venda registrada hoje ainda. Toque no botão verde acima para registrar uma venda!
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
    </div>
  );
};
