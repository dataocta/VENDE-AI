import React, { useState } from 'react';
import { X, Delete, Check, Banknote, QrCode, CreditCard, BookUser, User } from 'lucide-react';
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
  const [description, setDescription] = useState<string>('Venda Rápida');
  const [customerName, setCustomerName] = useState<string>(defaultCustomerName || '');
  const [customerPhone, setCustomerPhone] = useState<string>('');

  if (!isOpen) return null;

  const totalAmount = cents / 100;
  const amountReceived = receivedCents / 100;
  const changeGiven = paymentMethod === 'dinheiro' && amountReceived > totalAmount ? amountReceived - totalAmount : 0;

  const handleDigit = (digit: string) => {
    if (soundEnabled) playTapBeep();
    if (cents.toString().length >= 8) return;
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
          costPrice: totalAmount * 0.45,
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
    setCents(0);
    setReceivedCents(0);
    setCustomerName('');
    setCustomerPhone('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto no-scrollbar pb-safe">
        
        {/* Header Bar */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md px-5 pt-4 pb-2 border-b border-slate-200 flex items-center justify-between z-10">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
              <span>Venda Rápida (Teclado)</span>
            </h2>
            <p className="text-xs text-slate-500">Digite o valor da venda e finalize</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Big Amount Screen */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
            <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold block mb-1">
              Valor da Venda
            </span>
            <div className="text-4xl sm:text-5xl font-black text-emerald-700 tracking-tight font-mono-numbers">
              {formatCurrency(totalAmount)}
            </div>
            
            {/* Quick Increment Buttons */}
            <div className="flex items-center justify-center gap-2 mt-3">
              {[5, 10, 20, 50].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => handleAddQuick(v)}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-800 text-xs font-semibold border border-slate-200 transition-colors touch-press font-mono-numbers shadow-xs"
                >
                  +{v}
                </button>
              ))}
            </div>
          </div>

          {/* Payment Method Selector (Segmented buttons) */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1.5">
              Forma de Pagamento
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setPaymentMethod('pix');
                  if (soundEnabled) playTapBeep();
                }}
                className={`min-h-[44px] rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all border ${
                  paymentMethod === 'pix'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-400 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <QrCode className="w-4 h-4 text-emerald-600" />
                <span>PIX</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPaymentMethod('dinheiro');
                  if (soundEnabled) playTapBeep();
                }}
                className={`min-h-[44px] rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all border ${
                  paymentMethod === 'dinheiro'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-400 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Banknote className="w-4 h-4 text-emerald-600" />
                <span>Dinheiro</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPaymentMethod('cartao_debito');
                  if (soundEnabled) playTapBeep();
                }}
                className={`min-h-[44px] rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all border ${
                  paymentMethod === 'cartao_debito'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-400 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>Débito</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPaymentMethod('cartao_credito');
                  if (soundEnabled) playTapBeep();
                }}
                className={`min-h-[44px] rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all border ${
                  paymentMethod === 'cartao_credito'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-400 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>Crédito</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPaymentMethod('fiado');
                  if (soundEnabled) playTapBeep();
                }}
                className={`min-h-[44px] rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all border col-span-2 ${
                  paymentMethod === 'fiado'
                    ? 'bg-amber-50 text-amber-800 border-amber-300 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <BookUser className="w-4 h-4 text-amber-600" />
                <span>Venda A Prazo</span>
              </button>
            </div>
          </div>

          {/* Troco Calculator when Cash is selected */}
          {paymentMethod === 'dinheiro' && totalAmount > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-600">Dinheiro entregue pelo cliente:</span>
                <span className="font-mono-numbers text-slate-900 font-bold">
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
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    R$ {bill}
                  </button>
                ))}
                {receivedCents > 0 && (
                  <button
                    type="button"
                    onClick={() => setReceivedCents(0)}
                    className="px-2 py-1.5 rounded-xl text-xs text-slate-500 hover:text-slate-800 shrink-0"
                  >
                    Valor Exato
                  </button>
                )}
              </div>

              {/* Troco Result */}
              {changeGiven > 0 && (
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800">Devolver de Troco:</span>
                  <span className="text-xl font-black text-emerald-700 font-mono-numbers">
                    {formatCurrency(changeGiven)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Customer / Fiado details */}
          {(paymentMethod === 'fiado' || totalAmount > 50) && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <User className="w-3.5 h-3.5 text-emerald-600" />
                <span>Dados do Cliente {paymentMethod === 'fiado' ? '(Obrigatório para venda a prazo)' : '(Opcional)'}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Nome do Cliente (ex: Seu José da Padaria)"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-emerald-500"
                />
                <input
                  type="tel"
                  placeholder="WhatsApp (ex: 11999998888)"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-emerald-500"
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
              className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs focus:outline-none focus:border-emerald-500"
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
                  className={`min-h-[50px] rounded-2xl font-bold text-lg flex items-center justify-center transition-all touch-press ${
                    isClear
                      ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                      : isBack
                      ? 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
                      : 'bg-slate-100 text-slate-900 border border-slate-200 hover:bg-slate-200 font-mono-numbers'
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
            className={`w-full min-h-[50px] rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 shadow-xs transition-all touch-press ${
              totalAmount > 0
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-[0.98]'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
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
