import React, { useState, useEffect } from 'react';
import { X, Check, Banknote, QrCode, CreditCard } from 'lucide-react';
import { Expense, BusinessSettings } from '../types';
import { DEFAULT_EXPENSE_CATEGORIES } from '../utils/storage';
import { getExpenseCategoryIcon } from '../utils/expenseCategories';
import { playExpenseSound, playTapBeep } from '../utils/audio';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveExpense: (expense: Expense) => void;
  soundEnabled: boolean;
  settings?: BusinessSettings;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  onSaveExpense,
  soundEnabled,
  settings,
}) => {
  const activeCategories = settings?.expenseCategories && settings.expenseCategories.length > 0
    ? settings.expenseCategories
    : DEFAULT_EXPENSE_CATEGORIES;

  const [amountStr, setAmountStr] = useState<string>('');
  const [category, setCategory] = useState<string>(activeCategories[0] || 'Outras Despesas');
  const [description, setDescription] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'dinheiro' | 'pix' | 'cartao'>('dinheiro');

  useEffect(() => {
    if (activeCategories.length > 0 && !activeCategories.includes(category)) {
      setCategory(activeCategories[0]);
    }
  }, [activeCategories, category]);

  if (!isOpen) return null;

  const handleSelectCategory = (catName: string) => {
    if (soundEnabled) playTapBeep();
    setCategory(catName);
    if (!description || activeCategories.includes(description)) {
      setDescription(catName);
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
      description: description.trim() || category || 'Despesa na rua',
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto no-scrollbar pb-safe">
        
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md px-5 pt-4 pb-2 border-b border-slate-200 flex items-center justify-between z-10">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
              <span>Registrar Despesa</span>
            </h2>
            <p className="text-xs text-slate-500">Controle o que sai do seu bolso ou conta</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Amount Input */}
          <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-4 text-center">
            <span className="text-xs uppercase tracking-wider text-rose-800 font-semibold block mb-1">
              Valor Gasto (R$)
            </span>
            <div className="flex items-center justify-center">
              <span className="text-2xl font-bold text-rose-600 mr-2">R$</span>
              <input
                type="text"
                inputMode="decimal"
                autoFocus
                placeholder="0,00"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="text-4xl font-black text-rose-600 bg-transparent border-none text-center focus:outline-none w-48 font-mono-numbers"
              />
            </div>

            {/* Quick Presets */}
            <div className="flex items-center justify-center gap-2 mt-3">
              {[10, 20, 30, 50, 100].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => handleQuickAdd(v)}
                  className="px-2.5 py-1 rounded-lg bg-white text-slate-800 text-xs font-semibold border border-rose-200 hover:bg-rose-50 transition-colors touch-press font-mono-numbers shadow-xs"
                >
                  +{v}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Categories Grid */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1.5">
              Categoria da Despesa
            </label>
            <div className="grid grid-cols-2 gap-2">
              {activeCategories.map((catName) => {
                const Icon = getExpenseCategoryIcon(catName);
                const isSelected = category === catName;

                return (
                  <button
                    key={catName}
                    type="button"
                    onClick={() => handleSelectCategory(catName)}
                    className={`min-h-[44px] p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all touch-press ${
                      isSelected
                        ? 'bg-rose-50 border-rose-400 text-rose-800 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-rose-600 text-white font-bold' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold truncate leading-tight">
                      {catName}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payment Source */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1.5">
              De onde saiu o dinheiro?
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('dinheiro')}
                className={`min-h-[42px] rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold border transition-colors ${
                  paymentMethod === 'dinheiro'
                    ? 'bg-rose-50 text-rose-800 border-rose-400 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Banknote className="w-3.5 h-3.5 text-rose-600" />
                <span>Dinheiro Bolso</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('pix')}
                className={`min-h-[42px] rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold border transition-colors ${
                  paymentMethod === 'pix'
                    ? 'bg-rose-50 text-rose-800 border-rose-400 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <QrCode className="w-3.5 h-3.5 text-rose-600" />
                <span>Pix / Conta</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('cartao')}
                className={`min-h-[42px] rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold border transition-colors ${
                  paymentMethod === 'cartao'
                    ? 'bg-rose-50 text-rose-800 border-rose-400 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5 text-rose-600" />
                <span>Cartão</span>
              </button>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              Descrição / Observação
            </label>
            <input
              type="text"
              placeholder="Ex: Gasolina moto para ir ao centro"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-rose-500"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!parseFloat(amountStr.replace(',', '.'))}
            className="w-full min-h-[50px] rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-xs transition-colors touch-press disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check className="w-5 h-5 stroke-[2.5]" />
            <span>SALVAR DESPESA</span>
          </button>
        </form>

      </div>
    </div>
  );
};
