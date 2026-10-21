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

  const totalCards = (byMethod.cartao_debito || 0) + (byMethod.cartao_credito || 0);

  const cashExpenses = todayExpenses
    .filter((e) => e.paymentMethod === 'dinheiro')
    .reduce((acc, e) => acc + e.amount, 0);

  // Expected physical pocket cash
  const expectedPocketCash = register.openingBalance + byMethod.dinheiro - cashExpenses;

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
      {/* 1. Big Net Profit Card (Limpo, Básico e Direto) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Lucro do Dia
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
              <span>Entradas ({todaySales.length})</span>
            </div>
            <div className="text-xl font-extrabold text-emerald-700 font-mono-numbers">
              +{formatCurrency(totalSales)}
            </div>
          </div>

          <div className="bg-rose-50/60 border border-rose-100 rounded-2xl p-3">
            <div className="flex items-center gap-1.5 text-xs text-rose-800 font-semibold mb-0.5">
              <ArrowDownRight className="w-3.5 h-3.5 text-rose-600" />
              <span>Saídas ({todayExpenses.length})</span>
            </div>
            <div className="text-xl font-extrabold text-rose-700 font-mono-numbers">
              -{formatCurrency(totalExpenses)}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Formas de Pagamento (Onde está o dinheiro) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Onde Está o Dinheiro
        </h3>

        <div className="grid grid-cols-2 gap-2.5 text-xs">
          {/* PIX */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3">
            <div className="flex items-center gap-1.5 text-slate-600 mb-1 font-medium">
              <QrCode className="w-4 h-4 text-emerald-600" />
              <span>Pix (Conta)</span>
            </div>
            <div className="text-lg font-black text-slate-900 font-mono-numbers">
              {formatCurrency(byMethod.pix)}
            </div>
          </div>

          {/* Dinheiro */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3">
            <div className="flex items-center gap-1.5 text-slate-600 mb-1 font-medium">
              <Banknote className="w-4 h-4 text-emerald-600" />
              <span>Dinheiro</span>
            </div>
            <div className="text-lg font-black text-slate-900 font-mono-numbers">
              {formatCurrency(byMethod.dinheiro)}
            </div>
          </div>

          {/* Cartões */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3">
            <div className="flex items-center gap-1.5 text-slate-600 mb-1 font-medium">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span>Cartão (Déb + Créd)</span>
            </div>
            <div className="text-lg font-black text-slate-900 font-mono-numbers">
              {formatCurrency(totalCards)}
            </div>
          </div>

          {/* A Prazo */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3">
            <div className="flex items-center gap-1.5 text-amber-800 mb-1 font-medium">
              <BookUser className="w-4 h-4 text-amber-600" />
              <span>A Prazo (A Receber)</span>
            </div>
            <div className="text-lg font-black text-amber-700 font-mono-numbers">
              {formatCurrency(byMethod.fiado)}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Dinheiro Físico em Mãos (Conferência de Bolso) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Banknote className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Dinheiro no Bolso
            </h3>
          </div>

          {isEditingOpening ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                placeholder="R$ Troco"
                value={openingStr}
                onChange={(e) => setOpeningStr(e.target.value)}
                className="w-20 px-2 py-1 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 font-mono-numbers"
              />
              <button
                type="button"
                onClick={handleSaveOpening}
                className="p-1 rounded-lg bg-emerald-600 text-white"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditingOpening(true)}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium"
            >
              <Edit2 className="w-3 h-3" />
              <span>Troco Inicial: {formatCurrency(register.openingBalance)}</span>
            </button>
          )}
        </div>

        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-1.5 text-xs text-slate-600">
          <div className="flex items-center justify-between">
            <span>Troco inicial que levou:</span>
            <span className="font-mono-numbers text-slate-800">{formatCurrency(register.openingBalance)}</span>
          </div>
          <div className="flex items-center justify-between text-emerald-700 font-medium">
            <span>+ Vendas recebidas em dinheiro:</span>
            <span className="font-mono-numbers">+{formatCurrency(byMethod.dinheiro)}</span>
          </div>
          <div className="flex items-center justify-between text-rose-700 font-medium">
            <span>- Gastos pagos em dinheiro:</span>
            <span className="font-mono-numbers">-{formatCurrency(cashExpenses)}</span>
          </div>
          <div className="pt-2 border-t border-slate-200 flex items-center justify-between font-bold">
            <span className="text-slate-900">Total que deve ter no bolso agora:</span>
            <span className="text-xl text-emerald-700 font-black font-mono-numbers">
              {formatCurrency(expectedPocketCash)}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Ações Principais */}
      <div className="space-y-2 pt-1">
        <button
          type="button"
          onClick={handleShareSummary}
          className="w-full min-h-[50px] rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm touch-press transition-colors"
        >
          <Share2 className="w-4 h-4" />
          <span>ENVIAR RESUMO NO WHATSAPP</span>
        </button>

        <button
          type="button"
          onClick={onOpenCloseRegister}
          className="w-full min-h-[46px] rounded-2xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-semibold text-xs flex items-center justify-center gap-2 touch-press transition-colors"
        >
          <Lock className="w-3.5 h-3.5 text-slate-600" />
          <span>Fechar Caixa / Auditoria do Dia</span>
        </button>
      </div>
    </div>
  );
};
