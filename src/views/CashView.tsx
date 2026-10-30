import React, { useState, useMemo } from 'react';
import {
  Wallet,
  TrendingUp,
  Banknote,
  QrCode,
  CreditCard,
  BookUser,
  Share2,
  Calendar,
  Edit2,
  Check,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Tag,
} from 'lucide-react';
import { DailyRegister, BusinessSettings, Sale, Expense } from '../types';
import { formatCurrency, formatDateOnlyBR, formatTimeOnlyBR } from '../utils/receipt';

type DateFilterOption = 'hoje' | 'ontem' | '7dias' | 'mes' | 'todos' | 'custom';

interface CashViewProps {
  sales: Sale[];
  expenses: Expense[];
  register: DailyRegister;
  settings: BusinessSettings;
  dateStr: string; // Today's date YYYY-MM-DD
  onUpdateOpeningBalance: (amount: number) => void;
  onOpenCloseRegister: () => void;
}

export const CashView: React.FC<CashViewProps> = ({
  sales,
  expenses,
  register,
  settings,
  dateStr,
  onUpdateOpeningBalance,
  onOpenCloseRegister,
}) => {
  const [filterOption, setFilterOption] = useState<DateFilterOption>('hoje');
  const [customDate, setCustomDate] = useState<string>(dateStr);
  const [isEditingOpening, setIsEditingOpening] = useState(false);
  const [openingStr, setOpeningStr] = useState(register.openingBalance.toString());

  // Date calculation utilities
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }, []);

  const sevenDaysAgoStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  }, []);

  const currentMonthPrefix = useMemo(() => {
    return dateStr.substring(0, 7); // YYYY-MM
  }, [dateStr]);

  // Filter criteria label & predicate
  const { filteredSales, filteredExpenses, periodLabel } = useMemo(() => {
    let sList: Sale[] = [];
    let eList: Expense[] = [];
    let label = 'Hoje';

    const completed = sales.filter((s) => s.status === 'concluida');

    switch (filterOption) {
      case 'hoje':
        sList = completed.filter((s) => s.date.startsWith(dateStr));
        eList = expenses.filter((e) => e.date.startsWith(dateStr));
        label = `Hoje (${formatDateOnlyBR(dateStr)})`;
        break;
      case 'ontem':
        sList = completed.filter((s) => s.date.startsWith(yesterdayStr));
        eList = expenses.filter((e) => e.date.startsWith(yesterdayStr));
        label = `Ontem (${formatDateOnlyBR(yesterdayStr)})`;
        break;
      case '7dias':
        sList = completed.filter((s) => s.date.split('T')[0] >= sevenDaysAgoStr && s.date.split('T')[0] <= dateStr);
        eList = expenses.filter((e) => e.date.split('T')[0] >= sevenDaysAgoStr && e.date.split('T')[0] <= dateStr);
        label = 'Últimos 7 Dias';
        break;
      case 'mes':
        sList = completed.filter((s) => s.date.startsWith(currentMonthPrefix));
        eList = expenses.filter((e) => e.date.startsWith(currentMonthPrefix));
        const [year, month] = currentMonthPrefix.split('-');
        label = `Mês ${month}/${year}`;
        break;
      case 'todos':
        sList = completed;
        eList = expenses;
        label = 'Todo o Período';
        break;
      case 'custom':
        sList = completed.filter((s) => s.date.startsWith(customDate));
        eList = expenses.filter((e) => e.date.startsWith(customDate));
        label = `Data: ${formatDateOnlyBR(customDate)}`;
        break;
    }

    return { filteredSales: sList, filteredExpenses: eList, periodLabel: label };
  }, [filterOption, customDate, sales, expenses, dateStr, yesterdayStr, sevenDaysAgoStr, currentMonthPrefix]);

  const totalSales = filteredSales.reduce((acc, s) => acc + s.totalAmount, 0);
  const totalExpenses = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);
  const netProfit = totalSales - totalExpenses;

  // Ranking of most sold products in the filtered period
  const topSoldProducts = useMemo(() => {
    const counts: Record<string, { name: string; quantity: number; revenue: number }> = {};
    filteredSales.forEach((sale) => {
      sale.items.forEach((item) => {
        const key = item.name.trim();
        if (!key) return;
        if (!counts[key]) {
          counts[key] = { name: key, quantity: 0, revenue: 0 };
        }
        counts[key].quantity += item.quantity || 1;
        counts[key].revenue += item.subtotal || (item.unitPrice * (item.quantity || 1));
      });
    });
    return Object.values(counts)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }, [filteredSales]);

  // Breakdown by payment methods for filtered period
  const byMethod: Record<string, number> = {
    dinheiro: 0,
    pix: 0,
    cartao_debito: 0,
    cartao_credito: 0,
    fiado: 0,
  };

  filteredSales.forEach((s) => {
    byMethod[s.paymentMethod] = (byMethod[s.paymentMethod] || 0) + s.totalAmount;
  });

  const totalCards = (byMethod.cartao_debito || 0) + (byMethod.cartao_credito || 0);

  const cashExpenses = filteredExpenses
    .filter((e) => e.paymentMethod === 'dinheiro')
    .reduce((acc, e) => acc + e.amount, 0);

  // Expected physical cash for today
  const expectedPocketCash = (filterOption === 'hoje' ? register.openingBalance : 0) + byMethod.dinheiro - cashExpenses;

  const handleSaveOpening = () => {
    const num = parseFloat(openingStr.replace(',', '.')) || 0;
    onUpdateOpeningBalance(num);
    setIsEditingOpening(false);
  };

  const handleShareSummary = () => {
    const lines = [
      `📊 *RESUMO DE CAIXA & LUCRO*`,
      `🏬 *${settings.businessName || 'Meu Negócio'}*`,
      `📅 Período: ${periodLabel}`,
      `--------------------------------`,
      `🟢 *Entradas / Vendas:* ${formatCurrency(totalSales)} (${filteredSales.length} vendas)`,
      `🔴 *Saídas / Despesas:* ${formatCurrency(totalExpenses)} (${filteredExpenses.length} despesas)`,
      `💰 *LUCRO LÍQUIDO:* ${formatCurrency(netProfit)}`,
      `--------------------------------`,
      `*Recebimentos:*`,
      `💵 Dinheiro: ${formatCurrency(byMethod.dinheiro)}`,
      `⚡ PIX: ${formatCurrency(byMethod.pix)}`,
      `💳 Cartões: ${formatCurrency(totalCards)}`,
      `📝 A Prazo: ${formatCurrency(byMethod.fiado)}`,
    ];

    const text = lines.join('\n');
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-4 pb-28">
      {/* 0. Filtro por Data (Requisito Solicitado) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <Filter className="w-3.5 h-3.5 text-emerald-600" />
            <span>Filtrar por Período:</span>
          </div>
          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
            {periodLabel}
          </span>
        </div>

        {/* Quick Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            type="button"
            onClick={() => setFilterOption('hoje')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
              filterOption === 'hoje'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Hoje
          </button>
          <button
            type="button"
            onClick={() => setFilterOption('ontem')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
              filterOption === 'ontem'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Ontem
          </button>
          <button
            type="button"
            onClick={() => setFilterOption('7dias')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
              filterOption === '7dias'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Últimos 7 dias
          </button>
          <button
            type="button"
            onClick={() => setFilterOption('mes')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
              filterOption === 'mes'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Este Mês
          </button>
          <button
            type="button"
            onClick={() => setFilterOption('todos')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
              filterOption === 'todos'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Todos
          </button>
        </div>

        {/* Custom Date Picker */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
          <label htmlFor="custom-cash-date" className="text-xs text-slate-500 font-medium flex items-center gap-1 shrink-0">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Escolher outra data:</span>
          </label>
          <input
            id="custom-cash-date"
            type="date"
            value={customDate}
            onChange={(e) => {
              if (e.target.value) {
                setCustomDate(e.target.value);
                setFilterOption('custom');
              }
            }}
            className="px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* 1. Big Net Profit Card (Limpo, Básico e Direto) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {filterOption === 'hoje' ? 'Lucro de Hoje' : `Lucro (${periodLabel})`}
          </span>

          <button
            type="button"
            onClick={handleShareSummary}
            className="text-xs text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Compartilhar</span>
          </button>
        </div>

        {/* Big Profit Display */}
        <div>
          <div
            className={`text-4xl sm:text-5xl font-black font-mono-numbers tracking-tight ${
              netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {formatCurrency(netProfit)}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Vendas ({formatCurrency(totalSales)}) menos Gastos ({formatCurrency(totalExpenses)})
          </p>
        </div>

        {/* Two Clean Indicators */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
          <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-3">
            <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-semibold mb-0.5">
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
              <span>Entradas ({filteredSales.length})</span>
            </div>
            <div className="text-xl font-extrabold text-emerald-700 font-mono-numbers">
              {formatCurrency(totalSales)}
            </div>
          </div>

          <div className="bg-rose-50/60 border border-rose-100 rounded-2xl p-3">
            <div className="flex items-center gap-1.5 text-xs text-rose-800 font-semibold mb-0.5">
              <ArrowDownRight className="w-3.5 h-3.5 text-rose-600" />
              <span>Gastos ({filteredExpenses.length})</span>
            </div>
            <div className="text-xl font-extrabold text-rose-700 font-mono-numbers">
              {formatCurrency(totalExpenses)}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Onde está o dinheiro (Distribuição de Meios de Pagamento) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Formas de Pagamento Recebidas ({periodLabel})
        </h3>

        <div className="grid grid-cols-2 gap-2.5">
          {/* Dinheiro */}
          <div className="p-3 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
              <Banknote className="w-3.5 h-3.5 text-emerald-600" />
              <span>Dinheiro</span>
            </div>
            <div className="text-lg font-black text-slate-900 font-mono-numbers mt-1">
              {formatCurrency(byMethod.dinheiro)}
            </div>
          </div>

          {/* PIX */}
          <div className="p-3 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
              <QrCode className="w-3.5 h-3.5 text-emerald-600" />
              <span>PIX</span>
            </div>
            <div className="text-lg font-black text-slate-900 font-mono-numbers mt-1">
              {formatCurrency(byMethod.pix)}
            </div>
          </div>

          {/* Cartões (Débito + Crédito) */}
          <div className="p-3 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
              <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
              <span>Cartões</span>
            </div>
            <div className="text-lg font-black text-slate-900 font-mono-numbers mt-1">
              {formatCurrency(totalCards)}
            </div>
          </div>

          {/* A Prazo */}
          <div className="p-3 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-xs text-amber-700 font-medium">
              <BookUser className="w-3.5 h-3.5 text-amber-600" />
              <span>A Prazo</span>
            </div>
            <div className="text-lg font-black text-amber-700 font-mono-numbers mt-1">
              {formatCurrency(byMethod.fiado)}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Ranking dos Produtos Mais Vendidos no Período */}
      {topSoldProducts.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-emerald-600" />
              <span>Produtos Mais Vendidos ({periodLabel})</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">Top {topSoldProducts.length}</span>
          </div>

          <div className="space-y-2">
            {topSoldProducts.map((p, idx) => (
              <div
                key={p.name}
                className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <span
                    className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-[11px] shrink-0 ${
                      idx === 0
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : idx === 1
                        ? 'bg-slate-200 text-slate-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {idx + 1}º
                  </span>
                  <div className="min-w-0">
                    <span className="font-bold text-slate-900 truncate block">{p.name}</span>
                    <span className="text-[11px] text-slate-500">
                      {p.quantity} {p.quantity === 1 ? 'vendido' : 'vendidos'}
                    </span>
                  </div>
                </div>
                <span className="font-extrabold text-emerald-700 font-mono-numbers shrink-0">
                  {formatCurrency(p.revenue)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Lista de Transações no Período (Vendas e Despesas) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Transações no Período ({filteredSales.length + filteredExpenses.length})
          </h3>
          <span className="text-[11px] text-slate-400 font-medium">
            {filteredSales.length} entradas · {filteredExpenses.length} saídas
          </span>
        </div>

        {filteredSales.length === 0 && filteredExpenses.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">Nenhuma transação encontrada no período selecionado.</p>
        ) : (
          <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto overscroll-contain">
            {/* Merged and sorted transactions */}
            {[
              ...filteredSales.map((s) => {
                const itemsSummary = s.items.map((i) => `${i.quantity}x ${i.name}`).join(', ');
                return {
                  id: s.id,
                  type: 'venda' as const,
                  productName: itemsSummary || 'Venda Balcão',
                  code: s.code,
                  subtitle: `${formatDateOnlyBR(s.date.split('T')[0])} ${formatTimeOnlyBR(s.date)} · ${
                    s.paymentMethod === 'fiado' ? 'A Prazo' : s.paymentMethod.replace('_', ' ')
                  }${s.customerName ? ` · ${s.customerName}` : ''}`,
                  amount: s.totalAmount,
                  date: s.date,
                };
              }),
              ...filteredExpenses.map((e) => ({
                id: e.id,
                type: 'despesa' as const,
                productName: e.description || 'Despesa',
                code: '',
                subtitle: `${formatDateOnlyBR(e.date.split('T')[0])} ${formatTimeOnlyBR(e.date)} · ${e.category} (${e.paymentMethod})`,
                amount: e.amount,
                date: e.date,
              })),
            ]
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((tx) => (
                <div key={tx.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                        tx.type === 'venda'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-rose-50 text-rose-600'
                      }`}
                    >
                      {tx.type === 'venda' ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 truncate">
                        {tx.code && (
                          <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1 rounded shrink-0">
                            {tx.code}
                          </span>
                        )}
                        <span className="font-bold text-slate-900 truncate">
                          {tx.productName}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {tx.subtitle}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`font-black font-mono-numbers shrink-0 ${
                      tx.type === 'venda' ? 'text-emerald-700' : 'text-rose-600'
                    }`}
                  >
                    {tx.type === 'venda' ? '+' : '-'}
                    {formatCurrency(tx.amount)}
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};
