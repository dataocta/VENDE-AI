import React, { useState } from 'react';
import {
  Wallet,
  TrendingUp,
  Banknote,
  QrCode,
  CreditCard,
  BookUser,
  Share2,
  Lock,
  Edit2,
  Check,
  Target,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { DailyRegister, BusinessSettings, Sale, Expense } from '../types';
import { formatCurrency, generateWhatsAppCashSummary } from '../utils/receipt';

interface CashViewProps {
  sales: Sale[];
  expenses: Expense[];
  register: DailyRegister;
  settings: BusinessSettings;
  dateStr: string;
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
  const [isEditingOpening, setIsEditingOpening] = useState(false);
  const [openingStr, setOpeningStr] = useState(register.openingBalance.toString());

  // Filter today's sales & expenses
  const todaySales = sales.filter((s) => s.status === 'concluida' && s.date.startsWith(dateStr));
  const todayExpenses = expenses.filter((e) => e.date.startsWith(dateStr));

  const totalSales = todaySales.reduce((acc, s) => acc + s.totalAmount, 0);
  const totalExpenses = todayExpenses.reduce((acc, e) => acc + e.amount, 0);
  const netProfit = totalSales - totalExpenses;

  // Breakdown by payment methods
  const byMethod: Record<string, number> = {
    dinheiro: 0,
    pix: 0,
    cartao_debito: 0,
    cartao_credito: 0,
    fiado: 0,
  };

  todaySales.forEach((s) => {
    byMethod[s.paymentMethod] = (byMethod[s.paymentMethod] || 0) + s.totalAmount;
  });

  const cashExpenses = todayExpenses
    .filter((e) => e.paymentMethod === 'dinheiro')
    .reduce((acc, e) => acc + e.amount, 0);

  // Expected physical pocket cash
  const expectedPocketCash = register.openingBalance + byMethod.dinheiro - cashExpenses;

  // Goal calculation
  const goalProgress = settings.dailyGoal > 0 ? Math.min(100, Math.round((totalSales / settings.dailyGoal) * 100)) : 0;
  const missingForGoal = Math.max(0, settings.dailyGoal - totalSales);

  const handleSaveOpening = () => {
    const num = parseFloat(openingStr.replace(',', '.')) || 0;
    onUpdateOpeningBalance(num);
    setIsEditingOpening(false);
  };

  const handleShareSummary = () => {
    const summary = generateWhatsAppCashSummary(
      dateStr,
      totalSales,
      totalExpenses,
      todaySales.length,
      byMethod,
      settings
    );
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(summary)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-4 pb-28">
      {/* 1. Big Net Balance Hero Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Lucro Líquido Real Hoje
            </span>
          </div>

          <button
            type="button"
            onClick={handleShareSummary}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1.5"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Compartilhar</span>
          </button>
        </div>

        {/* Big Profit Display */}
        <div>
          <div
            className={`text-4xl sm:text-5xl font-black font-mono-numbers tracking-tight ${
              netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {formatCurrency(netProfit)}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            (Total de Vendas {formatCurrency(totalSales)} menos Despesas {formatCurrency(totalExpenses)})
          </p>
        </div>

        {/* Two Mini Indicators */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800">
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3">
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold mb-0.5">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Vendas ({todaySales.length})</span>
            </div>
            <div className="text-xl font-extrabold text-slate-100 font-mono-numbers">
              +{formatCurrency(totalSales)}
            </div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3">
            <div className="flex items-center gap-1.5 text-xs text-rose-400 font-semibold mb-0.5">
              <ArrowDownRight className="w-3.5 h-3.5" />
              <span>Despesas ({todayExpenses.length})</span>
            </div>
            <div className="text-xl font-extrabold text-slate-100 font-mono-numbers">
              -{formatCurrency(totalExpenses)}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Pocket Cash vs Bank Cash */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Banknote className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-200">
              Dinheiro Físico em Mãos (Pochete / Bolso)
            </h3>
          </div>

          {isEditingOpening ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                placeholder="R$ Troco"
                value={openingStr}
                onChange={(e) => setOpeningStr(e.target.value)}
                className="w-20 px-2 py-1 rounded bg-slate-800 text-xs text-slate-100 font-mono-numbers"
              />
              <button
                type="button"
                onClick={handleSaveOpening}
                className="p-1 rounded bg-emerald-500 text-slate-950"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditingOpening(true)}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
            >
              <Edit2 className="w-3 h-3" />
              <span>Fundo: {formatCurrency(register.openingBalance)}</span>
            </button>
          )}
        </div>

        <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Fundo / Troco Inicial que saiu de casa:</span>
            <span className="font-mono-numbers text-slate-200">{formatCurrency(register.openingBalance)}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-emerald-400 font-medium">
            <span>+ Vendas recebidas em Dinheiro:</span>
            <span className="font-mono-numbers">+{formatCurrency(byMethod.dinheiro)}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-rose-400 font-medium">
            <span>- Gastos pagos com dinheiro do bolso:</span>
            <span className="font-mono-numbers">-{formatCurrency(cashExpenses)}</span>
          </div>
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between font-bold">
            <span className="text-xs text-slate-300">Total Físico Esperado na Mão:</span>
            <span className="text-2xl text-emerald-400 font-black font-mono-numbers">
              {formatCurrency(expectedPocketCash)}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Breakdown by Payment Methods */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Entradas de Hoje por Forma de Pagamento
        </h3>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-3">
            <div className="flex items-center gap-1.5 text-slate-400 mb-1">
              <QrCode className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-semibold">PIX (Conta)</span>
            </div>
            <div className="text-lg font-black text-slate-100 font-mono-numbers">
              {formatCurrency(byMethod.pix)}
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-3">
            <div className="flex items-center gap-1.5 text-slate-400 mb-1">
              <Banknote className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-semibold">Dinheiro Físico</span>
            </div>
            <div className="text-lg font-black text-slate-100 font-mono-numbers">
              {formatCurrency(byMethod.dinheiro)}
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-3">
            <div className="flex items-center gap-1.5 text-slate-400 mb-1">
              <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-semibold">Cartão Débito</span>
            </div>
            <div className="text-lg font-black text-slate-100 font-mono-numbers">
              {formatCurrency(byMethod.cartao_debito)}
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-3">
            <div className="flex items-center gap-1.5 text-slate-400 mb-1">
              <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-semibold">Cartão Crédito</span>
            </div>
            <div className="text-lg font-black text-slate-100 font-mono-numbers">
              {formatCurrency(byMethod.cartao_credito)}
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-3 col-span-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-amber-400">
                <BookUser className="w-3.5 h-3.5" />
                <span className="font-semibold">Vendas A Prazo Hoje (A Receber)</span>
              </div>
              <div className="text-base font-black text-amber-400 font-mono-numbers">
                {formatCurrency(byMethod.fiado)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Daily Target Management */}
      {settings.dailyGoal > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Target className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Meta do Dia de Vendas
              </h3>
            </div>
            <span className="text-xs font-bold text-emerald-400 font-mono-numbers">
              {goalProgress}% alcançada
            </span>
          </div>

          <div className="w-full h-2.5 rounded-full bg-slate-950 overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${goalProgress}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
            <span>
              Realizado: <strong className="text-slate-200 font-mono-numbers">{formatCurrency(totalSales)}</strong>
            </span>
            <span>
              {missingForGoal > 0 ? (
                <>Faltam <strong className="text-amber-400 font-mono-numbers">{formatCurrency(missingForGoal)}</strong> para a meta</>
              ) : (
                <strong className="text-emerald-400 font-bold">🎉 Meta Batida com Sucesso!</strong>
              )}
            </span>
          </div>
        </div>
      )}

      {/* 5. End of Day Register Closing Trigger */}
      <button
        type="button"
        onClick={onOpenCloseRegister}
        className="w-full min-h-[54px] rounded-2xl bg-slate-100 hover:bg-white text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg touch-press transition-all active:scale-[0.98]"
      >
        <Lock className="w-4 h-4 stroke-[2.5]" />
        <span>FECHAR CAIXA DO DIA &amp; AUDITORIA</span>
      </button>
    </div>
  );
};
