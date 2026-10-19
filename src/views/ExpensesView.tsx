import React, { useState } from 'react';
import {
  ArrowDownRight,
  Plus,
  Trash2,
  Fuel,
  Utensils,
  Package,
  ShoppingBag,
  Percent,
  Wrench,
  MoreHorizontal,
  Banknote,
  QrCode,
  CreditCard,
  TrendingDown,
} from 'lucide-react';
import { Expense, ExpenseCategory } from '../types';
import { formatCurrency, formatDateBR } from '../utils/receipt';

interface ExpensesViewProps {
  expenses: Expense[];
  todaySalesTotal: number;
  onOpenNewExpense: () => void;
  onDeleteExpense: (id: string) => void;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  expenses,
  todaySalesTotal,
  onOpenNewExpense,
  onDeleteExpense,
}) => {
  const [filterCategory, setFilterCategory] = useState<string>('todos');

  const todayStr = new Date().toISOString().split('T')[0];
  const todayExpenses = expenses.filter((e) => e.date.startsWith(todayStr));
  const todayExpensesTotal = todayExpenses.reduce((acc, e) => acc + e.amount, 0);

  // Expense ratio compared to revenue
  const expenseRatio = todaySalesTotal > 0 ? Math.round((todayExpensesTotal / todaySalesTotal) * 100) : 0;

  const categoryIcons: Record<ExpenseCategory, React.FC<{ className?: string }>> = {
    combustivel: Fuel,
    alimentacao: Utensils,
    estoque: Package,
    embalagem: ShoppingBag,
    taxa: Percent,
    manutencao: Wrench,
    outros: MoreHorizontal,
  };

  const categoryLabels: Record<ExpenseCategory, string> = {
    combustivel: 'Combustível / Rota',
    alimentacao: 'Almoço / Lanche',
    estoque: 'Reposição Estoque',
    embalagem: 'Embalagens / Sacolas',
    taxa: 'Taxa Maquininha',
    manutencao: 'Manutenção',
    outros: 'Outros',
  };

  // Group today's expenses by category
  const categoryTotals: Record<string, number> = {};
  todayExpenses.forEach((e) => {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
  });

  const filteredExpenses = filterCategory === 'todos'
    ? expenses
    : expenses.filter((e) => e.category === filterCategory);

  return (
    <div className="space-y-4 pb-28">
      {/* 1. Main Expense Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
            <span>Despesas da Rua Hoje</span>
          </span>
          <span className="text-xs text-slate-400">
            {todayExpenses.length} saídas registradas
          </span>
        </div>

        {/* Big total */}
        <div className="flex items-baseline justify-between py-1">
          <div>
            <div className="text-3xl sm:text-4xl font-black text-rose-400 font-mono-numbers tracking-tight">
              {formatCurrency(todayExpensesTotal)}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Gasto total nas ruas durante o dia
            </div>
          </div>

          {todaySalesTotal > 0 && (
            <div className="text-right">
              <span className="text-xs text-slate-400 block font-medium">Impacto no Faturamento</span>
              <span className={`text-xl font-bold font-mono-numbers ${expenseRatio > 35 ? 'text-amber-400' : 'text-slate-200'}`}>
                {expenseRatio}%
              </span>
            </div>
          )}
        </div>

        {/* Category Breakdown Bar */}
        {todayExpenses.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Distribuição dos Gastos de Hoje
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(categoryTotals).map(([cat, total]) => {
                const Icon = categoryIcons[cat as ExpenseCategory] || MoreHorizontal;
                const label = categoryLabels[cat as ExpenseCategory] || cat;
                const pct = todayExpensesTotal > 0 ? Math.round((total / todayExpensesTotal) * 100) : 0;

                return (
                  <div key={cat} className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0 pr-1">
                      <Icon className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span className="truncate text-slate-300 font-medium">{label}</span>
                    </div>
                    <span className="font-mono-numbers font-bold text-slate-200 shrink-0">
                      {formatCurrency(total)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 2. Big + Nova Despesa Button (Thumb Zone) */}
      <button
        type="button"
        onClick={onOpenNewExpense}
        className="w-full min-h-[54px] rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-950/40 touch-press transition-all hover:brightness-105 active:scale-[0.98]"
      >
        <Plus className="w-5 h-5 stroke-[3]" />
        <span>LANÇAR NOVA DESPESA NA RUA</span>
      </button>

      {/* 3. Category Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        <button
          type="button"
          onClick={() => setFilterCategory('todos')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors touch-press ${
            filterCategory === 'todos'
              ? 'bg-slate-200 text-slate-950 font-bold'
              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          Todas as Despesas
        </button>
        {Object.keys(categoryLabels).map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setFilterCategory(cat)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors touch-press ${
              filterCategory === cat
                ? 'bg-slate-200 text-slate-950 font-bold'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {categoryLabels[cat as ExpenseCategory]}
          </button>
        ))}
      </div>

      {/* 4. Expenses List */}
      <div className="space-y-2">
        {expenses.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <ArrowDownRight className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-100">
                Nenhuma despesa lançada hoje
              </h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
                Anote cada saída de dinheiro na rua (combustível, almoço, embalagens, taxas) para calcular exatamente quanto sobrou no seu bolso.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenNewExpense}
              className="px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-black text-xs inline-flex items-center gap-1.5 touch-press transition-colors"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>REGISTRAR PRIMEIRA DESPESA</span>
            </button>
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 text-center text-slate-400 text-xs">
            Nenhuma despesa encontrada nesta categoria.
          </div>
        ) : (
          filteredExpenses.map((exp) => {
            const Icon = categoryIcons[exp.category] || MoreHorizontal;
            const label = categoryLabels[exp.category] || exp.category;

            return (
              <div
                key={exp.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-100 text-xs sm:text-sm truncate">
                      {exp.description}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5 font-medium">
                      <span>{label}</span>
                      <span aria-hidden="true" className="text-slate-600">·</span>
                      <span className="capitalize">{exp.paymentMethod}</span>
                      <span aria-hidden="true" className="text-slate-600">·</span>
                      <span>{formatDateBR(exp.date)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm sm:text-base font-extrabold text-rose-400 font-mono-numbers">
                    -{formatCurrency(exp.amount)}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Deseja excluir esta despesa?')) {
                        onDeleteExpense(exp.id);
                      }
                    }}
                    title="Excluir despesa"
                    className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 flex items-center justify-center transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
