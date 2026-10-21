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

    if (filterOption === 'hoje' && register.openingBalance > 0) {
      lines.push(`🪙 Troco inicial: ${formatCurrency(register.openingBalance)}`);
      lines.push(`💵 Dinheiro físico esperado no bolso: ${formatCurrency(expectedPocketCash)}`);
    }

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

      {/* 3. Troco Inicial e Dinheiro Físico no Bolso (Apenas Hoje) */}
      {filterOption === 'hoje' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Dinheiro Físico no Bolso Hoje
              </span>
            </div>

            {!isEditingOpening ? (
              <button
                type="button"
                onClick={() => setIsEditingOpening(true)}
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
              >
                <Edit2 className="w-3 h-3" />
                <span>Troco</span>
              </button>
            ) : null}
          </div>

          {isEditingOpening ? (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs text-slate-600 font-medium">Troco Inicial: R$</span>
              <input
                type="text"
                value={openingStr}
                onChange={(e) => setOpeningStr(e.target.value)}
                className="w-20 px-2 py-1 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 font-mono-numbers"
              />
              <button
                type="button"
                onClick={handleSaveOpening}
                className="p-1 rounded-lg bg-emerald-600 text-white text-xs font-bold"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Troco inicial (abertura):</span>
                <span className="font-mono-numbers text-slate-800">{formatCurrency(register.openingBalance)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>+ Entradas em dinheiro:</span>
                <span className="font-mono-numbers">+{formatCurrency(byMethod.dinheiro)}</span>
              </div>
              <div className="flex justify-between text-rose-600 font-semibold">
                <span>- Despesas pagas em dinheiro:</span>
                <span className="font-mono-numbers">-{formatCurrency(cashExpenses)}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm font-bold text-slate-900">
                <span>Total que deve estar no bolso:</span>
                <span className="text-xl text-emerald-700 font-black font-mono-numbers">
                  {formatCurrency(expectedPocketCash)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. Lista Rápida de Lançamentos do Período */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Vendas do Período ({filteredSales.length})
        </h3>

        {filteredSales.length === 0 ? (
          <p className="text-xs text-slate-400 py-3 text-center">Nenhuma venda encontrada no período selecionado.</p>
        ) : (
          <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto no-scrollbar">
            {filteredSales.map((sale) => (
              <div key={sale.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-800">
                    {sale.code} · {sale.items.map((i) => `${i.quantity}x ${i.name}`).join(', ') || 'Venda Rápida'}
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <span>{formatDateOnlyBR(sale.date.split('T')[0])} {formatTimeOnlyBR(sale.date)}</span>
                    <span>·</span>
                    <span className="capitalize">{sale.paymentMethod === 'fiado' ? 'A Prazo' : sale.paymentMethod.replace('_', ' ')}</span>
                    {sale.customerName && (
                      <>
                        <span>·</span>
                        <span className="text-slate-600 font-medium">{sale.customerName}</span>
                      </>
                    )}
                  </div>
                </div>
                <span className="font-black text-emerald-700 font-mono-numbers">
                  {formatCurrency(sale.totalAmount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
