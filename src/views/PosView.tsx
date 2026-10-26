import React, { useState } from 'react';
import {
  Zap,
  Trash2,
  Share2,
  TrendingUp,
  Receipt,
  X,
  Edit2,
  Target,
  CheckCircle2,
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
  onNavigateToTab: (tab: any) => void;
  onUpdateSettings?: (settings: BusinessSettings) => void;
}

export const PosView: React.FC<PosViewProps> = ({
  sales,
  expenses = [],
  settings,
  onCancelSale,
  onOpenNumpadSale,
  onNavigateToTab,
  onUpdateSettings,
}) => {
  // Daily goal inline editing state
  const [isEditingGoal, setIsEditingGoal] = useState<boolean>(false);
  const [tempGoalStr, setTempGoalStr] = useState<string>(settings.dailyGoal ? settings.dailyGoal.toString() : '');

  // Today's stats calculation
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySales = sales.filter((s) => s.status === 'concluida' && s.date.startsWith(todayStr));
  const todaySalesTotal = todaySales.reduce((acc, s) => acc + s.totalAmount, 0);
  const todayExpenses = expenses.filter((e) => e.date.startsWith(todayStr));
  const todayExpensesTotal = todayExpenses.reduce((acc, e) => acc + e.amount, 0);
  const goalProgress = settings.dailyGoal > 0 ? Math.min(100, Math.round((todaySalesTotal / settings.dailyGoal) * 100)) : 0;

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

        {/* Goal Bar & Inline Edit */}
        <div className="mt-3 pt-2.5 border-t border-slate-100">
          {isEditingGoal ? (
            <div className="space-y-2 bg-slate-50 border border-slate-200 rounded-2xl p-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Definir Meta de Vendas Hoje</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditingGoal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    R$
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={tempGoalStr}
                    onChange={(e) => setTempGoalStr(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm font-bold font-mono-numbers focus:outline-none focus:border-emerald-500 shadow-xs"
                    autoFocus
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const newGoal = parseFloat(tempGoalStr.replace(',', '.')) || 0;
                    if (onUpdateSettings) {
                      onUpdateSettings({ ...settings, dailyGoal: newGoal });
                    }
                    setIsEditingGoal(false);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs touch-press transition-colors"
                >
                  Salvar
                </button>
              </div>

              {/* Quick goal presets */}
              <div className="flex items-center gap-1.5 pt-1 overflow-x-auto no-scrollbar">
                {[100, 300, 500, 1000, 2000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setTempGoalStr(preset.toString())}
                    className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-600 text-[11px] font-semibold hover:border-emerald-500 shrink-0 font-mono-numbers"
                  >
                    R$ {preset}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Meta do Dia:</span>
                  <strong className="text-slate-900 font-mono-numbers">
                    {settings.dailyGoal > 0 ? formatCurrency(settings.dailyGoal) : 'Não definida'}
                  </strong>
                </span>

                <div className="flex items-center gap-2">
                  {settings.dailyGoal > 0 && (
                    <span className="font-bold text-emerald-700 font-mono-numbers">{goalProgress}%</span>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setTempGoalStr(settings.dailyGoal ? settings.dailyGoal.toString() : '');
                      setIsEditingGoal(true);
                    }}
                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>{settings.dailyGoal > 0 ? 'Alterar' : 'Definir Meta'}</span>
                  </button>
                </div>
              </div>

              {settings.dailyGoal > 0 && (
                <>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                      style={{ width: `${goalProgress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                    <span>
                      {todaySalesTotal >= settings.dailyGoal ? (
                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Parabéns, meta batida!
                        </span>
                      ) : (
                        <span>Faltam {formatCurrency(Math.max(0, settings.dailyGoal - todaySalesTotal))}</span>
                      )}
                    </span>
                    <span className="font-mono-numbers">{formatCurrency(todaySalesTotal)} vendido</span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 2. Fast Primary Action: Registrar Venda (Do jeito antigo, teclado numérico direto) */}
      <div className="grid grid-cols-1 gap-2.5">
        <button
          type="button"
          onClick={onOpenNumpadSale}
          className="w-full min-h-[52px] rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-xs touch-press transition-colors tracking-wide"
        >
          <Zap className="w-4 h-4 fill-white stroke-none" />
          <span>REGISTRAR VENDA</span>
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
