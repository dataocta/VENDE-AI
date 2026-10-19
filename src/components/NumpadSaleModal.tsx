import React, { useState } from 'react';
import { X, Delete, Check, Banknote, QrCode, CreditCard, BookUser, User, AlertCircle } from 'lucide-react';
import { PaymentMethod, Sale } from '../types';
import { formatCurrency } from '../utils/receipt';
import { playSaleChime, playTapBeep } from '../utils/audio';

interface NumpadSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleteSale: (sale: Sale) => void;
  soundEnabled: boolean;
  defaultCustomerName?: string;
}

export const NumpadSaleModal: React.FC<NumpadSaleModalProps> = ({
  isOpen,
  onClose,
  onCompleteSale,
  soundEnabled,
  defaultCustomerName,
}) => {
  // Amount entered as integer cents (e.g. 1550 = R$ 15,50)
  const [cents, setCents] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [receivedCents, setReceivedCents] = useState<number>(0);
  const [description, setDescription] = useState<string>('Venda Rápida de Balcão/Rua');
  const [customerName, setCustomerName] = useState<string>(defaultCustomerName || '');
  const [customerPhone, setCustomerPhone] = useState<string>('');

  if (!isOpen) return null;

  const totalAmount = cents / 100;
  const amountReceived = receivedCents / 100;
  const changeGiven = paymentMethod === 'dinheiro' && amountReceived > totalAmount ? amountReceived - totalAmount : 0;

  const handleDigit = (digit: string) => {
    if (soundEnabled) playTapBeep();
    if (cents.toString().length >= 8) return; // Prevent overflow
    const nextStr = (cents === 0 ? '' : cents.toString()) + digit;
    setCents(parseInt(nextStr || '0', 10));
  };

  const handleClear = () => {
    if (soundEnabled) playTapBeep();
    setCents(0);
    setReceivedCents(0);
  };

  const handleBackspace = () => {
    if (soundEnabled) playTapBeep();
    const str = cents.toString();
    if (str.length <= 1) {
      setCents(0);
    } else {
      setCents(parseInt(str.slice(0, -1), 10));
    }
  };

  const handleAddQuick = (val: number) => {
    if (soundEnabled) playTapBeep();
    setCents((prev) => prev + val * 100);
  };

  const handleSelectCashBill = (bill: number) => {
    if (soundEnabled) playTapBeep();
    setReceivedCents(bill * 100);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (totalAmount <= 0) return;

    if (paymentMethod === 'fiado' && !customerName.trim()) {
      alert('Para venda a prazo, informe o nome do cliente!');
      return;
    }

    const saleCode = `#${Math.floor(1000 + Math.random() * 9000)}`;
    const newSale: Sale = {
      id: `sale_${Date.now()}`,
      code: saleCode,
      date: new Date().toISOString(),
      items: [
        {
          name: description.trim() || 'Item da Rua',
          quantity: 1,
          unitPrice: totalAmount,
          subtotal: totalAmount,
          costPrice: totalAmount * 0.45, // default estimated 55% margin
        },
      ],
      totalAmount,
      totalCost: totalAmount * 0.45,
      paymentMethod,
      amountReceived: paymentMethod === 'dinheiro' && amountReceived > 0 ? amountReceived : totalAmount,
      changeGiven: paymentMethod === 'dinheiro' ? changeGiven : 0,
      customerName: customerName.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      notes: description,
      status: 'concluida',
    };

    if (soundEnabled) {
      playSaleChime();
    }

    onCompleteSale(newSale);
    // Reset state
    setCents(0);
    setReceivedCents(0);
    setCustomerName('');
    setCustomerPhone('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto no-scrollbar pb-safe">
        
        {/* Header Bar */}
        <div className="sticky top-0 bg-slate-900/95 backdrop-blur-md px-5 pt-4 pb-2 border-b border-slate-800 flex items-center justify-between z-10">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-1.5">
              <span>⚡ Venda Rápida na Rua</span>
            </h2>
            <p className="text-xs text-slate-400">Digite o valor e finalize em segundos</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Big Amount Screen */}
          <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 text-center">
            <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold block mb-1">
              Valor da Venda
            </span>
            <div className="text-4xl sm:text-5xl font-black text-emerald-400 tracking-tight font-mono-numbers">
              {formatCurrency(totalAmount)}
            </div>
            
            {/* Quick Increment Buttons */}
            <div className="flex items-center justify-center gap-2 mt-3">
              {[5, 10, 20, 50].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => handleAddQuick(v)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700/60 transition-colors touch-press font-mono-numbers"
                >
                  +{v}
                </button>
              ))}
            </div>
          </div>

          {/* Payment Method Selector (Segmented buttons) */}
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5">
              Forma de Pagamento
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setPaymentMethod('pix');
                  if (soundEnabled) playTapBeep();
                }}
                className={`min-h-[46px] rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all border ${
                  paymentMethod === 'pix'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-750'
                }`}
              >
                <QrCode className="w-4 h-4 text-emerald-400" />
                <span>PIX</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPaymentMethod('dinheiro');
                  if (soundEnabled) playTapBeep();
                }}
                className={`min-h-[46px] rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all border ${
                  paymentMethod === 'dinheiro'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-750'
                }`}
              >
                <Banknote className="w-4 h-4 text-emerald-400" />
                <span>Dinheiro</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPaymentMethod('cartao_debito');
                  if (soundEnabled) playTapBeep();
                }}
                className={`min-h-[46px] rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all border ${
                  paymentMethod === 'cartao_debito'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-750'
                }`}
              >
                <CreditCard className="w-4 h-4 text-emerald-400" />
                <span>Débito</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPaymentMethod('cartao_credito');
                  if (soundEnabled) playTapBeep();
                }}
                className={`min-h-[46px] rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all border ${
                  paymentMethod === 'cartao_credito'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-750'
                }`}
              >
                <CreditCard className="w-4 h-4 text-emerald-400" />
                <span>Crédito</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPaymentMethod('fiado');
                  if (soundEnabled) playTapBeep();
                }}
                className={`min-h-[46px] rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all border col-span-2 ${
                  paymentMethod === 'fiado'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-750'
                }`}
              >
                <BookUser className="w-4 h-4 text-amber-400" />
                <span>Venda A Prazo</span>
              </button>
            </div>
          </div>

          {/* Troco Calculator when Cash is selected */}
          {paymentMethod === 'dinheiro' && totalAmount > 0 && (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-400">Dinheiro entregue pelo cliente:</span>
                <span className="font-mono-numbers text-slate-200 font-bold">
                  {amountReceived > 0 ? formatCurrency(amountReceived) : 'Exato'}
                </span>
              </div>

              {/* Quick Bill presets */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
                {[10, 20, 50, 100, 200].map((bill) => (
                  <button
                    key={bill}
                    type="button"
                    onClick={() => handleSelectCashBill(bill)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors shrink-0 ${
                      receivedCents === bill * 100
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                        : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    R$ {bill}
                  </button>
                ))}
                {receivedCents > 0 && (
                  <button
                    type="button"
                    onClick={() => setReceivedCents(0)}
                    className="px-2 py-1.5 rounded-xl text-xs text-slate-400 hover:text-slate-200 shrink-0"
                  >
                    Valor Exato
                  </button>
                )}
              </div>

              {/* Troco Result */}
              {changeGiven > 0 && (
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400">Devolver de Troco:</span>
                  <span className="text-xl font-black text-amber-400 font-mono-numbers">
                    {formatCurrency(changeGiven)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Customer / Fiado details */}
          {(paymentMethod === 'fiado' || totalAmount > 50) && (
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                <User className="w-3.5 h-3.5 text-emerald-400" />
                <span>Dados do Cliente {paymentMethod === 'fiado' ? '(Obrigatório para venda a prazo)' : '(Opcional)'}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Nome do Cliente (ex: Seu José da Padaria)"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
                />
                <input
                  type="tel"
                  placeholder="WhatsApp (ex: 11999998888)"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          )}

          {/* Quick Optional Note */}
          <div>
            <input
              type="text"
              placeholder="Descrição rápida do item/venda (opcional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-xs focus:outline-none focus:border-slate-700"
            />
          </div>

          {/* Numpad Grid */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((key) => {
              const isClear = key === 'C';
              const isBack = key === '⌫';

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    if (isClear) handleClear();
                    else if (isBack) handleBackspace();
                    else handleDigit(key);
                  }}
                  className={`min-h-[52px] rounded-2xl font-bold text-lg flex items-center justify-center transition-all touch-press ${
                    isClear
                      ? 'bg-rose-950/40 text-rose-300 border border-rose-900/40 hover:bg-rose-900/50'
                      : isBack
                      ? 'bg-slate-800/80 text-slate-300 border border-slate-700 hover:bg-slate-700'
                      : 'bg-slate-800 text-slate-100 border border-slate-700/80 hover:bg-slate-700 font-mono-numbers'
                  }`}
                >
                  {isBack ? <Delete className="w-5 h-5" /> : key}
                </button>
              );
            })}
          </div>

          {/* Submit Action CTA */}
          <button
            type="button"
            disabled={totalAmount <= 0}
            onClick={handleSubmit}
            className={`w-full min-h-[52px] rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg transition-all touch-press ${
              totalAmount > 0
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20 active:scale-[0.98]'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            }`}
          >
            <Check className="w-5 h-5 stroke-[2.5]" />
            <span>FINALIZAR VENDA ({formatCurrency(totalAmount)})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
