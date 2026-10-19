import React, { useState } from 'react';
import { X, Check, Banknote, QrCode, CreditCard, Share2, Sparkles } from 'lucide-react';
import { CustomerDebt, BusinessSettings } from '../types';
import { formatCurrency, formatDateOnlyBR } from '../utils/receipt';
import { playSaleChime, playTapBeep } from '../utils/audio';

interface DebtPaymentModalProps {
  debt: CustomerDebt | null;
  settings: BusinessSettings;
  isOpen: boolean;
  onClose: () => void;
  onConfirmPayment: (
    debtId: string,
    amount: number,
    paymentMethod: 'dinheiro' | 'pix' | 'cartao',
    notes?: string
  ) => void;
  soundEnabled: boolean;
}

export const DebtPaymentModal: React.FC<DebtPaymentModalProps> = ({
  debt,
  settings,
  isOpen,
  onClose,
  onConfirmPayment,
  soundEnabled,
}) => {
  const [payAmountStr, setPayAmountStr] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'dinheiro' | 'pix' | 'cartao'>('pix');
  const [notes, setNotes] = useState<string>('');
  const [justPaidReceipt, setJustPaidReceipt] = useState<{
    amount: number;
    remaining: number;
    debtName: string;
    phone: string;
  } | null>(null);

  if (!isOpen || !debt) return null;

  // Initialize with full amount if empty
  const currentTotal = debt.totalOwed;
  const payVal = payAmountStr ? parseFloat(payAmountStr.replace(',', '.')) || 0 : currentTotal;

  const handlePayFull = () => {
    if (soundEnabled) playTapBeep();
    setPayAmountStr(currentTotal.toFixed(2).replace('.', ','));
  };

  const handlePayHalf = () => {
    if (soundEnabled) playTapBeep();
    setPayAmountStr((currentTotal / 2).toFixed(2).replace('.', ','));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (payVal <= 0) return;

    if (soundEnabled) {
      playSaleChime();
    }

    const remaining = Math.max(0, currentTotal - payVal);

    onConfirmPayment(
      debt.id,
      payVal,
      paymentMethod,
      notes || `Pagamento A Prazo (${paymentMethod.toUpperCase()})`
    );

    setJustPaidReceipt({
      amount: payVal,
      remaining,
      debtName: debt.name,
      phone: debt.phone,
    });
  };

  const handleShareReceiptWhatsApp = () => {
    if (!justPaidReceipt) return;
    const msg = [
      `🤝 *COMPROVANTE DE PAGAMENTO (A PRAZO)*`,
      `🏪 *${settings.businessName || 'Vende.ai'}*`,
      `👤 Cliente: *${justPaidReceipt.debtName}*`,
      `--------------------------------`,
      `💰 *Valor Pago:* ${formatCurrency(justPaidReceipt.amount)}`,
      `💳 *Forma:* ${paymentMethod.toUpperCase()}`,
      `📌 *Saldo Restante:* ${formatCurrency(justPaidReceipt.remaining)}`,
      `--------------------------------`,
      justPaidReceipt.remaining <= 0
        ? `🎉 *CONTA TOTALMENTE QUITADA!* Muito obrigado pela sua pontualidade e preferência!`
        : `Muito obrigado pelo pagamento! Qualquer dúvida estou à disposição.`,
    ].join('\n');

    let cleanPhone = justPaidReceipt.phone.replace(/\D/g, '');
    if (cleanPhone.length >= 10 && !cleanPhone.startsWith('55')) {
      cleanPhone = `55${cleanPhone}`;
    }
    const url = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto no-scrollbar pb-safe">
        
        {/* Header */}
        <div className="sticky top-0 bg-slate-900/95 backdrop-blur-md px-5 pt-4 pb-2 border-b border-slate-800 flex items-center justify-between z-10">
          <div>
            <h2 className="text-base font-bold text-slate-100">
              {justPaidReceipt ? '✅ Pagamento Recebido!' : '📥 Receber Pagamento A Prazo'}
            </h2>
            <p className="text-xs text-slate-400">Cliente: {debt.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {justPaidReceipt ? (
          <div className="p-5 space-y-4 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
              <Sparkles className="w-8 h-8" />
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-400">Você recebeu:</div>
              <div className="text-3xl font-black text-emerald-400 font-mono-numbers">
                {formatCurrency(justPaidReceipt.amount)}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Saldo restante de {justPaidReceipt.debtName}:{' '}
                <span className="text-slate-200 font-bold font-mono-numbers">
                  {formatCurrency(justPaidReceipt.remaining)}
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleShareReceiptWhatsApp}
                className="w-full min-h-[48px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 touch-press transition-colors"
              >
                <Share2 className="w-4 h-4" />
                <span>MANDAR COMPROVANTE NO WHATSAPP</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center transition-colors touch-press"
              >
                Concluir
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {/* Current Debt Card */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-center">
              <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold block mb-0.5">
                Saldo Devedor A Prazo
              </span>
              <div className="text-3xl font-black text-amber-400 font-mono-numbers">
                {formatCurrency(currentTotal)}
              </div>
              {debt.dueDate && (
                <span className="text-xs text-slate-400 mt-1 block">
                  Vencimento combinado: {formatDateOnlyBR(debt.dueDate)}
                </span>
              )}
            </div>

            {/* Amount to pay */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-400">
                  Quanto o cliente está pagando agora?
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handlePayHalf}
                    className="text-[11px] font-semibold text-slate-300 hover:text-white px-2 py-0.5 rounded bg-slate-800"
                  >
                    50%
                  </button>
                  <button
                    type="button"
                    onClick={handlePayFull}
                    className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/60"
                  >
                    Quitar Tudo
                  </button>
                </div>
              </div>

              <div className="flex items-center rounded-2xl bg-slate-950 border border-slate-800 px-4 py-3">
                <span className="text-xl font-bold text-emerald-400 mr-2">R$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder={currentTotal.toFixed(2).replace('.', ',')}
                  value={payAmountStr}
                  onChange={(e) => setPayAmountStr(e.target.value)}
                  className="w-full text-2xl font-black text-emerald-400 bg-transparent border-none focus:outline-none font-mono-numbers"
                />
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">
                Como foi recebido? (Entra no caixa de hoje)
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('pix')}
                  className={`min-h-[44px] rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold border transition-colors ${
                    paymentMethod === 'pix'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                      : 'bg-slate-800 border-slate-700 text-slate-300'
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                  <span>PIX</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('dinheiro')}
                  className={`min-h-[44px] rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold border transition-colors ${
                    paymentMethod === 'dinheiro'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                      : 'bg-slate-800 border-slate-700 text-slate-300'
                  }`}
                >
                  <Banknote className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Dinheiro</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('cartao')}
                  className={`min-h-[44px] rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold border transition-colors ${
                    paymentMethod === 'cartao'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                      : 'bg-slate-800 border-slate-700 text-slate-300'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Cartão</span>
                </button>
              </div>
            </div>

            {/* Optional observation */}
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">
                Observação (opcional)
              </label>
              <input
                type="text"
                placeholder="Ex: Pagou metade, resto paga sexta-feira"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={payVal <= 0}
              className="w-full min-h-[50px] rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition-all touch-press disabled:opacity-50"
            >
              <Check className="w-5 h-5 stroke-[2.5]" />
              <span>CONFIRMAR RECEBIMENTO ({formatCurrency(payVal)})</span>
            </button>
          </form>
        )}

      </div>
    </div>
  );
};
