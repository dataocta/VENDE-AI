import React, { useState } from 'react';
import { X, Check, Share2, AlertTriangle, ShieldCheck, Wallet } from 'lucide-react';
import { DailyRegister, BusinessSettings, Sale, Expense } from '../types';
import { formatCurrency, generateWhatsAppCashSummary } from '../utils/receipt';

interface CloseRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateStr: string;
  register: DailyRegister;
  sales: Sale[];
  expenses: Expense[];
  settings: BusinessSettings;
  onConfirmClose: (actualCash: number, notes?: string) => void;
}

export const CloseRegisterModal: React.FC<CloseRegisterModalProps> = ({
  isOpen,
  onClose,
  dateStr,
  register,
  sales,
  expenses,
  settings,
  onConfirmClose,
}) => {
  const [actualCashStr, setActualCashStr] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [closedSummary, setClosedSummary] = useState<string | null>(null);

  if (!isOpen) return null;

  // Filter completed sales for today
  const todaySales = sales.filter(
    (s) => s.status === 'concluida' && s.date.startsWith(dateStr)
  );

  const todayExpenses = expenses.filter((e) => e.date.startsWith(dateStr));

  const totalSales = todaySales.reduce((acc, s) => acc + s.totalAmount, 0);
  const totalExpenses = todayExpenses.reduce((acc, e) => acc + e.amount, 0);

  const byMethod: Record<string, number> = {};
  todaySales.forEach((s) => {
    byMethod[s.paymentMethod] = (byMethod[s.paymentMethod] || 0) + s.totalAmount;
  });

  // Calculate physical cash expected in pocket:
  // openingBalance + cash sales - cash expenses
  const cashSales = byMethod['dinheiro'] || 0;
  const cashExpenses = todayExpenses
    .filter((e) => e.paymentMethod === 'dinheiro')
    .reduce((acc, e) => acc + e.amount, 0);

  const expectedCashInPocket = register.openingBalance + cashSales - cashExpenses;

  const actualCash = actualCashStr ? parseFloat(actualCashStr.replace(',', '.')) || 0 : expectedCashInPocket;
  const difference = actualCash - expectedCashInPocket;

  const handleConfirm = () => {
    onConfirmClose(actualCash, notes);
    const summary = generateWhatsAppCashSummary(
      dateStr,
      totalSales,
      totalExpenses,
      todaySales.length,
      byMethod,
      settings
    );
    setClosedSummary(summary);
  };

  const handleShareSummary = () => {
    if (!closedSummary) return;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(closedSummary)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto no-scrollbar pb-safe">
        
        {/* Header */}
        <div className="sticky top-0 bg-slate-900/95 backdrop-blur-md px-5 pt-4 pb-2 border-b border-slate-800 flex items-center justify-between z-10">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-1.5">
              <span>🔒 Fechamento de Caixa do Dia</span>
            </h2>
            <p className="text-xs text-slate-400">Conferência final do dinheiro da rua</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {closedSummary ? (
          <div className="p-5 space-y-4">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto mb-2">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-100">Caixa Fechado com Sucesso!</h3>
              <p className="text-xs text-slate-400 mt-1">
                Lucro Líquido: <span className="font-bold text-emerald-400 font-mono-numbers">{formatCurrency(totalSales - totalExpenses)}</span>
              </p>
            </div>

            <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800 text-xs font-mono whitespace-pre-wrap text-slate-300 leading-relaxed max-h-48 overflow-y-auto">
              {closedSummary}
            </div>

            <button
              type="button"
              onClick={handleShareSummary}
              className="w-full min-h-[48px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 touch-press transition-colors"
            >
              <Share2 className="w-4 h-4" />
              <span>ENVIAR FECHAMENTO NO WHATSAPP</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center justify-center transition-colors touch-press"
            >
              Concluir
            </button>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {/* Pocket Cash Breakdown */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2.5">
              <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold block">
                Conferência de Dinheiro Físico
              </span>

              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Troco Inicial (Fundo que saiu de casa):</span>
                  <span className="font-mono-numbers font-medium text-slate-200">
                    {formatCurrency(register.openingBalance)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-emerald-400">
                  <span>+ Vendas em Dinheiro:</span>
                  <span className="font-mono-numbers font-bold">
                    +{formatCurrency(cashSales)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-rose-400">
                  <span>- Despesas pagas em Dinheiro:</span>
                  <span className="font-mono-numbers font-bold">
                    -{formatCurrency(cashExpenses)}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between font-bold text-slate-200">
                  <span>Total Esperado no Bolso:</span>
                  <span className="text-lg text-emerald-400 font-mono-numbers">
                    {formatCurrency(expectedCashInPocket)}
                  </span>
                </div>
              </div>
            </div>

            {/* Actual count input */}
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">
                Quanto você tem em mãos no bolso agora? (R$)
              </label>
              <div className="flex items-center rounded-2xl bg-slate-950 border border-slate-800 px-4 py-2.5">
                <span className="text-xl font-bold text-slate-400 mr-2">R$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder={expectedCashInPocket.toFixed(2).replace('.', ',')}
                  value={actualCashStr}
                  onChange={(e) => setActualCashStr(e.target.value)}
                  className="w-full text-2xl font-black text-slate-100 bg-transparent border-none focus:outline-none font-mono-numbers"
                />
              </div>

              {actualCashStr && Math.abs(difference) > 0.05 && (
                <div
                  className={`mt-2 p-2.5 rounded-xl border text-xs flex items-center gap-2 ${
                    difference > 0
                      ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-300'
                      : 'bg-rose-950/40 border-rose-800/40 text-rose-300'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>
                    {difference > 0
                      ? `Sobra de caixa: +${formatCurrency(difference)}`
                      : `Falta de caixa: ${formatCurrency(difference)}`}
                  </span>
                </div>
              )}
            </div>

            {/* General daily overview */}
            <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/70 text-xs space-y-1.5">
              <div className="flex items-center justify-between text-slate-400">
                <span>Vendas Totais do Dia:</span>
                <span className="font-mono-numbers text-slate-200">{formatCurrency(totalSales)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Despesas Totais:</span>
                <span className="font-mono-numbers text-slate-200">{formatCurrency(totalExpenses)}</span>
              </div>
              <div className="flex items-center justify-between font-bold text-emerald-400 pt-1 border-t border-slate-800/80">
                <span>Lucro Líquido Real:</span>
                <span className="font-mono-numbers">{formatCurrency(totalSales - totalExpenses)}</span>
              </div>
            </div>

            {/* Observation */}
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">
                Observações do Turno (opcional)
              </label>
              <input
                type="text"
                placeholder="Ex: Ponto de venda muito bom na feira, dia nublado"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-slate-700"
              />
            </div>

            {/* Submit */}
            <button
              type="button"
              onClick={handleConfirm}
              className="w-full min-h-[50px] rounded-2xl bg-slate-100 hover:bg-white text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg transition-all touch-press"
            >
              <Check className="w-5 h-5 stroke-[2.5]" />
              <span>FECHAR CAIXA E GERAR RELATÓRIO</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
