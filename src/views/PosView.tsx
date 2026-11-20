import React, { useState } from 'react';
import {
  Zap,
  Trash2,
  Share2,
  TrendingUp,
  Receipt,
  ArrowDownRight,
  BookUser,
  DollarSign,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';
import { Product, Sale, BusinessSettings, Customer, Expense, CustomerDebt } from '../types';
import { formatCurrency, formatDateOnlyBR, getPaymentMethodLabel, generateWhatsAppSaleReceipt } from '../utils/receipt';
import { isRealSaleEntry, isFiadoPaymentEntry, isCashInflowEntry, isOtherCashEntry } from '../utils/storage';
import { SalesAnalyticsCharts } from '../components/SalesAnalyticsCharts';

interface PosViewProps {
  products: Product[];
  sales: Sale[];
  expenses?: Expense[];
  customers?: Customer[];
  debts?: CustomerDebt[];
  settings: BusinessSettings;
  onCompleteSale: (sale: Sale) => void;
  onCancelSale: (saleId: string) => void;
  onDeleteSale?: (saleId: string) => void;
  onOpenNumpadSale: () => void;
  onOpenNewExpense?: () => void;
  onOpenPaymentModal?: (debt: CustomerDebt) => void;
  onNavigateToTab: (tab: any) => void;
  onUpdateSettings?: (settings: BusinessSettings) => void;
}

export const PosView: React.FC<PosViewProps> = ({
  sales,
  expenses = [],
  debts = [],
  settings,
  onCancelSale,
  onDeleteSale,
  onOpenNumpadSale,
  onOpenNewExpense,
  onOpenPaymentModal,
  onNavigateToTab,
}) => {
  const [deletingSaleId, setDeletingSaleId] = useState<string | null>(null);
  // Today's stats calculation: Saldo recebido no caixa EXCLUI vendas fiado ainda não pagas
  const todayStr = new Date().toISOString().split('T')[0];
  const todayEntries = sales.filter((s) => s.status === 'concluida' && s.date.startsWith(todayStr));
  const todayCashInflows = todayEntries.filter(isCashInflowEntry);
  const todayPaidSalesCount = todayEntries.filter((s) => isRealSaleEntry(s) && s.paymentMethod !== 'fiado').length;
  const todayFiadoSales = todayEntries.filter((s) => isRealSaleEntry(s) && s.paymentMethod === 'fiado');
  const todayFiadoSalesTotal = todayFiadoSales.reduce((acc, s) => acc + s.totalAmount, 0);
  const todayFiadoReceivedTotal = todayCashInflows
    .filter(isFiadoPaymentEntry)
    .reduce((acc, s) => acc + s.totalAmount, 0);
  const todayOtherInTotal = todayCashInflows
    .filter(isOtherCashEntry)
    .reduce((acc, s) => acc + s.totalAmount, 0);
  const todayReceivedTotal = todayCashInflows.reduce((acc, s) => acc + s.totalAmount, 0);
  const todayExpenses = expenses.filter((e) => e.date.startsWith(todayStr));
  const todayExpensesTotal = todayExpenses.reduce((acc, e) => acc + e.amount, 0);
  const todayNetBalance = todayReceivedTotal - todayExpensesTotal;

  // Painel A Receber A Prazo (Fiado total em aberto)
  const openDebts = debts
    .filter((d) => d.totalOwed > 0)
    .sort((a, b) => b.totalOwed - a.totalOwed);
  const totalToReceiveFiado = openDebts.reduce((acc, d) => acc + d.totalOwed, 0);
  const overdueDebtsCount = openDebts.filter((d) => d.dueDate && d.dueDate < todayStr).length;

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
      <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Caixa de Hoje
            </span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span className="text-xs text-slate-500 font-medium">
              {todayPaidSalesCount} {todayPaidSalesCount === 1 ? 'venda paga' : 'vendas pagas'}
            </span>
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
            <div className="text-xs text-slate-500 font-medium">Recebido Hoje</div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono-numbers tracking-tight">
              {formatCurrency(todayReceivedTotal)}
            </div>
            {(todayFiadoReceivedTotal > 0 || todayOtherInTotal > 0) && (
              <div className="text-[11px] text-teal-700 font-semibold mt-0.5 font-mono-numbers">
                Inclui {formatCurrency(todayFiadoReceivedTotal + todayOtherInTotal)} a prazo/outros
              </div>
            )}
            {todayFiadoSalesTotal > 0 && (
              <div className="text-[11px] text-amber-700 font-semibold mt-0.5 font-mono-numbers">
                +{formatCurrency(todayFiadoSalesTotal)} a prazo (não entrou)
              </div>
            )}
          </div>

          <div className="border-l border-slate-200 pl-3">
            <div className="text-xs text-slate-500 font-medium">Despesas de Hoje</div>
            <div className="text-2xl sm:text-3xl font-black text-rose-600 font-mono-numbers tracking-tight">
              {formatCurrency(todayExpensesTotal)}
            </div>
          </div>
        </div>

        {/* Saldo líquido em caixa hoje */}
        <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-600">Saldo em Caixa (Recebido - Despesas):</span>
          <span
            className={`text-sm font-black font-mono-numbers ${
              todayNetBalance >= 0 ? 'text-emerald-700' : 'text-rose-600'
            }`}
          >
            {formatCurrency(todayNetBalance)}
          </span>
        </div>
      </div>

      {/* 2. Primary Fast Actions: Registrar Entrada e Registrar Despesa */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={onOpenNumpadSale}
          className="w-full min-h-[52px] rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs touch-press transition-colors tracking-wide"
        >
          <Zap className="w-4 h-4 fill-white stroke-none shrink-0" />
          <span>REGISTRAR ENTRADA</span>
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

      {/* 2.5 Painel A Receber A Prazo (Fiado) */}
      <div className="bg-amber-50/70 border border-amber-200 rounded-3xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <BookUser className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs font-black uppercase tracking-wider text-amber-950 truncate">
                A Receber A Prazo
              </h3>
              <p className="text-[11px] text-amber-800/80 font-medium">
                {openDebts.length === 0
                  ? 'Nenhum saldo em aberto'
                  : `${openDebts.length} ${openDebts.length === 1 ? 'cliente devendo' : 'clientes devendo'}`}
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="text-xl sm:text-2xl font-black text-amber-800 font-mono-numbers tracking-tight">
              {formatCurrency(totalToReceiveFiado)}
            </div>
            {overdueDebtsCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                <AlertTriangle className="w-3 h-3" />
                <span>{overdueDebtsCount} vencido{overdueDebtsCount > 1 ? 's' : ''}</span>
              </span>
            )}
          </div>
        </div>

        {openDebts.length > 0 && (
          <div className="space-y-1.5 pt-1 border-t border-amber-200/70">
            {openDebts.slice(0, 3).map((d) => {
              const isOverdue = Boolean(d.dueDate && d.dueDate < todayStr);
              return (
                <div
                  key={d.id}
                  className="bg-white/90 border border-amber-200/80 rounded-2xl px-3 py-2 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 truncate">{d.name}</div>
                    <div className="text-[11px] text-slate-500">
                      {d.dueDate
                        ? isOverdue
                          ? `Venceu em ${formatDateOnlyBR(d.dueDate)}`
                          : `Vence ${formatDateOnlyBR(d.dueDate)}`
                        : 'Sem data combinada'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-black text-amber-800 font-mono-numbers">
                      {formatCurrency(d.totalOwed)}
                    </span>
                    {onOpenPaymentModal && (
                      <button
                        type="button"
                        onClick={() => onOpenPaymentModal(d)}
                        className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] flex items-center gap-1 shadow-2xs touch-press transition-colors"
                      >
                        <DollarSign className="w-3 h-3" />
                        <span>Receber</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <button
          type="button"
          onClick={() => onNavigateToTab('customers')}
          className="w-full py-2 rounded-xl bg-white hover:bg-amber-100/70 border border-amber-200 text-amber-900 text-xs font-extrabold flex items-center justify-center gap-1.5 transition-colors"
        >
          <span>{openDebts.length > 0 ? 'Ver Todos A Prazo e Cobrar' : 'Ver Clientes e A Prazo'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 3. Desempenho & Gráficos: Linha de Vendas, Produtos Mais Vendidos e Formas de Pagamento */}
      <SalesAnalyticsCharts sales={sales} settings={settings} />

      {/* 4. Today's Recent Entries Feed */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <Receipt className="w-4 h-4 text-slate-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Últimas Entradas de Hoje ({todayEntries.length})
            </h3>
          </div>
        </div>

        {todayEntries.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-500 text-xs shadow-xs">
            Nenhuma entrada registrada hoje ainda. Toque no botão verde acima para registrar uma entrada!
          </div>
        ) : (
          <div className="space-y-2">
            {todayEntries.slice(0, 5).map((s) => {
              const isFiadoPay = isFiadoPaymentEntry(s);
              const badgeText = isFiadoPay
                ? 'Recebimento A Prazo'
                : s.category && s.category !== 'Venda'
                ? s.category
                : null;

              const isDeleting = deletingSaleId === s.id;

              return (
                <div
                  key={s.id}
                  className="bg-white border border-slate-200 rounded-2xl p-3 space-y-2 shadow-xs"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold text-sm text-slate-900 font-mono-numbers">
                          {formatCurrency(s.totalAmount)}
                        </span>
                        {badgeText && (
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                              isFiadoPay
                                ? 'bg-teal-100 text-teal-800 border border-teal-200'
                                : s.entryType === 'estorno' || s.category === 'Estorno'
                                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                : s.entryType === 'servico'
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {badgeText}
                          </span>
                        )}
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
                        onClick={() => setDeletingSaleId(isDeleting ? null : s.id)}
                        title="Excluir lançamento"
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                          isDeleting
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-slate-100 text-slate-400 hover:text-rose-600'
                        }`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {isDeleting && (
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between gap-2 text-xs text-rose-900">
                      <span className="font-semibold">
                        Excluir lançamento? Itens de catálogo voltam ao estoque.
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            if (onDeleteSale) {
                              onDeleteSale(s.id);
                            } else {
                              onCancelSale(s.id);
                            }
                            setDeletingSaleId(null);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-700 transition-colors"
                        >
                          Confirmar
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingSaleId(null)}
                          className="px-2.5 py-1 rounded-lg bg-slate-200 text-slate-700 font-bold hover:bg-slate-300 transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
