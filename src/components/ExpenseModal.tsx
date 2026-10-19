import React, { useState } from 'react';
import { X, Check, Fuel, Utensils, Package, ShoppingBag, Percent, Wrench, MoreHorizontal, Banknote, QrCode, CreditCard } from 'lucide-react';
import { Expense, ExpenseCategory } from '../types';
import { formatCurrency } from '../utils/receipt';
import { playExpenseSound, playTapBeep } from '../utils/audio';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveExpense: (expense: Expense) => void;
  soundEnabled: boolean;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  onSaveExpense,
  soundEnabled,
}) => {
  const [amountStr, setAmountStr] = useState<string>('');
  const [category, setCategory] = useState<ExpenseCategory>('combustivel');
  const [description, setDescription] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'dinheiro' | 'pix' | 'cartao'>('dinheiro');

  if (!isOpen) return null;

  const categories: {
    id: ExpenseCategory;
    label: string;
    icon: React.FC<{ className?: string }>;
    defaultDesc: string;
  }[] = [
    { id: 'combustivel', label: 'Combustível', icon: Fuel, defaultDesc: 'Gasolina / Passagem na rua' },
    { id: 'alimentacao', label: 'Almoço / Lanche', icon: Utensils, defaultDesc: 'Almoço / Café na rua' },
    { id: 'estoque', label: 'Reposição Estoque', icon: Package, defaultDesc: 'Compra de mercadoria / atacado' },
    { id: 'embalagem', label: 'Sacolas / Embalagem', icon: ShoppingBag, defaultDesc: 'Sacolas e potes' },
    { id: 'taxa', label: 'Taxa Maquininha', icon: Percent, defaultDesc: 'Taxa / aluguel maquininha' },
    { id: 'manutencao', label: 'Manutenção', icon: Wrench, defaultDesc: 'Manutenção veículo / carrinho' },
    { id: 'outros', label: 'Outras Despesas', icon: MoreHorizontal, defaultDesc: 'Despesa avulsa' },
  ];

  const handleSelectCategory = (cat: ExpenseCategory, defDesc: string) => {
    if (soundEnabled) playTapBeep();
    setCategory(cat);
    if (!description || categories.some((c) => c.defaultDesc === description)) {
      setDescription(defDesc);
    }
  };

  const handleQuickAdd = (val: number) => {
    if (soundEnabled) playTapBeep();
    const curr = parseFloat(amountStr.replace(',', '.')) || 0;
    setAmountStr((curr + val).toFixed(2).replace('.', ','));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amountStr.replace(',', '.'));
    if (!num || num <= 0) return;

    const newExpense: Expense = {
      id: `exp_${Date.now()}`,
      date: new Date().toISOString(),
      amount: num,
      category,
      description: description.trim() || 'Despesa na rua',
      paymentMethod,
    };

    if (soundEnabled) {
      playExpenseSound();
    }

    onSaveExpense(newExpense);
    setAmountStr('');
    setDescription('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto no-scrollbar pb-safe">
        
        {/* Header */}
        <div className="sticky top-0 bg-slate-900/95 backdrop-blur-md px-5 pt-4 pb-2 border-b border-slate-800 flex items-center justify-between z-10">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-1.5">
              <span>📉 Registrar Despesa da Rua</span>
            </h2>
            <p className="text-xs text-slate-400">Controle tudo que sai do seu bolso ou conta</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Amount Input */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-center">
            <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold block mb-1">
              Valor Gasto (R$)
            </span>
            <div className="flex items-center justify-center">
              <span className="text-2xl font-bold text-rose-400 mr-2">R$</span>
              <input
                type="text"
                inputMode="decimal"
                autoFocus
                placeholder="0,00"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="text-4xl font-black text-rose-400 bg-transparent border-none text-center focus:outline-none w-48 font-mono-numbers"
              />
            </div>

            {/* Quick Presets */}
            <div className="flex items-center justify-center gap-2 mt-3">
              {[10, 20, 30, 50, 100].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => handleQuickAdd(v)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700 hover:bg-slate-700 transition-colors touch-press font-mono-numbers"
                >
                  +{v}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Categories Grid */}
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5">
              Categoria da Despesa
            </label>
            <div className="grid grid-cols-2 gap-2">
              {categories.map((cat) => {
                const Icon = cat.icon;
                const isSelected = category === cat.id;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleSelectCategory(cat.id, cat.defaultDesc)}
                    className={`min-h-[46px] p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all touch-press ${
                      isSelected
                        ? 'bg-rose-500/15 border-rose-500/50 text-rose-200'
                        : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-rose-500 text-slate-950 font-bold' : 'bg-slate-700/80 text-slate-300'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold truncate leading-tight">
                      {cat.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payment Source */}
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5">
              De onde saiu o dinheiro?
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('dinheiro')}
                className={`min-h-[44px] rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold border transition-colors ${
                  paymentMethod === 'dinheiro'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                    : 'bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                <Banknote className="w-3.5 h-3.5 text-rose-400" />
                <span>Dinheiro Bolso</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('pix')}
                className={`min-h-[44px] rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold border transition-colors ${
                  paymentMethod === 'pix'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                    : 'bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                <QrCode className="w-3.5 h-3.5 text-rose-400" />
                <span>Pix / Conta</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('cartao')}
                className={`min-h-[44px] rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold border transition-colors ${
                  paymentMethod === 'cartao'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                    : 'bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5 text-rose-400" />
                <span>Cartão</span>
              </button>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">
              Descrição / Observação
            </label>
            <input
              type="text"
              placeholder="Ex: Gasolina moto para ir ao centro"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-rose-500"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!parseFloat(amountStr.replace(',', '.'))}
            className="w-full min-h-[50px] rounded-2xl bg-rose-500 hover:bg-rose-400 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-950/40 transition-all touch-press disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check className="w-5 h-5 stroke-[2.5]" />
            <span>SALVAR DESPESA</span>
          </button>
        </form>

      </div>
    </div>
  );
};
