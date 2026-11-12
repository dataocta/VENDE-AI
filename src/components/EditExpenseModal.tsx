import React, { useState } from 'react';
import { X, Check, Trash2, Banknote, QrCode, CreditCard, Calendar } from 'lucide-react';
import { Expense, BusinessSettings } from '../types';
import { formatCurrency } from '../utils/receipt';
import { DEFAULT_EXPENSE_CATEGORIES } from '../utils/storage';
import { getExpenseCategoryIcon, normalizeExpenseCategoryName } from '../utils/expenseCategories';

interface EditExpenseModalProps {
  isOpen: boolean;
  expense: Expense | null;
  onClose: () => void;
  onSave: (updatedExpense: Expense) => void;
  onDelete: (id: string) => void;
  settings?: BusinessSettings;
}

export const EditExpenseModal: React.FC<EditExpenseModalProps> = ({
  isOpen,
  expense,
  onClose,
  onSave,
  onDelete,
  settings,
}) => {
  if (!isOpen || !expense) return null;

  const activeCategories = settings?.expenseCategories && settings.expenseCategories.length > 0
    ? settings.expenseCategories
    : DEFAULT_EXPENSE_CATEGORIES;

  const currentNormalized = normalizeExpenseCategoryName(expense.category);

  // If the expense's category isn't in activeCategories, prepend or append it so user can keep it
  const allAvailableCategories = activeCategories.includes(currentNormalized)
    ? activeCategories
    : [currentNormalized, ...activeCategories];

  const [amountStr, setAmountStr] = useState<string>(expense.amount.toFixed(2).replace('.', ','));
  const [category, setCategory] = useState<string>(currentNormalized);
  const [description, setDescription] = useState<string>(expense.description);
  const [paymentMethod, setPaymentMethod] = useState<'dinheiro' | 'pix' | 'cartao'>(expense.paymentMethod);
  const [dateStr, setDateStr] = useState<string>(expense.date.split('T')[0]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amountStr.replace(',', '.'));
    if (!num || num <= 0) return;

    // Retain existing time part or current time if date changed
    const originalTime = expense.date.includes('T') ? expense.date.split('T')[1] : new Date().toISOString().split('T')[1];
    const newDateISO = `${dateStr}T${originalTime}`;

    onSave({
      ...expense,
      amount: num,
      category,
      description: description.trim() || category || 'Despesa',
      paymentMethod,
      date: newDateISO,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full sm:max-w-md bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        
        {/* Header */}
        <div className="shrink-0 bg-white px-5 pt-4 pb-3 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Editar Despesa</h2>
            <p className="text-xs text-slate-500">Altere valor, categoria ou forma de pagamento</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 overscroll-contain">
          {/* Amount input */}
          <div className="bg-rose-50/60 border border-rose-200 rounded-2xl p-3.5 text-center">
            <span className="text-xs uppercase tracking-wider text-rose-700 font-bold block mb-1">
              Valor da Despesa (R$)
            </span>
            <div className="relative max-w-[200px] mx-auto">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-black text-rose-400 font-mono-numbers">
                R$
              </span>
              <input
                type="text"
                inputMode="decimal"
                required
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-full pl-10 pr-3 py-2 text-2xl font-black text-rose-700 font-mono-numbers text-center bg-white border border-rose-300 rounded-xl focus:outline-none focus:border-rose-500 shadow-2xs"
              />
            </div>
          </div>

          {/* Date Picker */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Data do Lançamento</span>
            </label>
            <input
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs font-medium focus:outline-none focus:border-rose-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              Descrição / Observação
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Gasolina, Almoço..."
              className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-rose-500 font-medium"
            />
          </div>

          {/* Categories Grid */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1.5">
              Categoria da Despesa
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {allAvailableCategories.map((catName) => {
                const Icon = getExpenseCategoryIcon(catName);
                const isSelected = category === catName;
                return (
                  <button
                    key={catName}
                    type="button"
                    onClick={() => setCategory(catName)}
                    className={`p-2 rounded-xl border text-left flex items-center gap-2 text-xs font-semibold transition-all ${
                      isSelected
                        ? 'bg-rose-50 border-rose-400 text-rose-800 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-rose-600 shrink-0" />
                    <span className="truncate">{catName}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1.5">
              Forma de Pagamento
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setPaymentMethod('dinheiro')}
                className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1 text-xs font-bold border transition-colors ${
                  paymentMethod === 'dinheiro'
                    ? 'bg-rose-50 text-rose-800 border-rose-400 shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Banknote className="w-3.5 h-3.5 text-rose-600" />
                <span>Dinheiro</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('pix')}
                className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1 text-xs font-bold border transition-colors ${
                  paymentMethod === 'pix'
                    ? 'bg-rose-50 text-rose-800 border-rose-400 shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <QrCode className="w-3.5 h-3.5 text-rose-600" />
                <span>Pix</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('cartao')}
                className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1 text-xs font-bold border transition-colors ${
                  paymentMethod === 'cartao'
                    ? 'bg-rose-50 text-rose-800 border-rose-400 shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5 text-rose-600" />
                <span>Cartão</span>
              </button>
            </div>
          </div>

          {/* Inline Delete Confirmation */}
          {confirmDelete && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between gap-2 text-xs text-rose-900">
              <span>Excluir despesa de {formatCurrency(expense.amount)}?</span>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    onDelete(expense.id);
                    onClose();
                  }}
                  className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-700"
                >
                  Confirmar
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-2.5 py-1 rounded-lg bg-slate-200 text-slate-700 font-bold hover:bg-slate-300"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100">
            {!confirmDelete && (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="p-2.5 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 text-xs font-bold flex items-center gap-1 shrink-0"
              >
                <Trash2 className="w-4 h-4" />
                <span>Excluir</span>
              </button>
            )}

            <div className="flex-1 flex gap-2 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold shadow-sm transition-colors flex items-center gap-1.5 touch-press"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Salvar Alterações</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
