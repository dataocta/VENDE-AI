import React, { useState, useMemo } from 'react';
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
  Calendar,
  Filter,
  Search,
  X,
} from 'lucide-react';
import { Expense, ExpenseCategory } from '../types';
import { formatCurrency, formatDateBR, formatDateOnlyBR } from '../utils/receipt';

type DateFilterOption = 'hoje' | 'ontem' | '7dias' | 'mes' | 'todos' | 'custom';

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
  const [filterPeriod, setFilterPeriod] = useState<DateFilterOption>('hoje');
  const [customDate, setCustomDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [filterCategory, setFilterCategory] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const todayStr = new Date().toISOString().split('T')[0];

  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }, []);

  const sevenDaysAgoStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  }, []);

  const currentMonthPrefix = useMemo(() => {
    return todayStr.substring(0, 7);
  }, [todayStr]);

  // Label for period
  const periodLabel = useMemo(() => {
    switch (filterPeriod) {
      case 'hoje':
        return `Hoje (${formatDateOnlyBR(todayStr)})`;
      case 'ontem':
        return `Ontem (${formatDateOnlyBR(yesterdayStr)})`;
      case '7dias':
        return 'Últimos 7 Dias';
      case 'mes':
        return 'Este Mês';
      case 'todos':
        return 'Todo o Período';
      case 'custom':
        return `Data: ${formatDateOnlyBR(customDate)}`;
      default:
        return 'Período';
    }
  }, [filterPeriod, todayStr, yesterdayStr, customDate]);

  // 1. Filter by period
  const periodExpenses = useMemo(() => {
    switch (filterPeriod) {
      case 'hoje':
        return expenses.filter((e) => e.date.startsWith(todayStr));
      case 'ontem':
        return expenses.filter((e) => e.date.startsWith(yesterdayStr));
      case '7dias':
        return expenses.filter((e) => e.date.split('T')[0] >= sevenDaysAgoStr && e.date.split('T')[0] <= todayStr);
      case 'mes':
        return expenses.filter((e) => e.date.startsWith(currentMonthPrefix));
      case 'todos':
        return expenses;
      case 'custom':
        return expenses.filter((e) => e.date.startsWith(customDate));
      default:
        return expenses;
    }
  }, [expenses, filterPeriod, todayStr, yesterdayStr, sevenDaysAgoStr, currentMonthPrefix, customDate]);

  // 2. Filter by category and search
  const filteredExpenses = useMemo(() => {
    return periodExpenses.filter((e) => {
      const matchCat = filterCategory === 'todos' || e.category === filterCategory;
      const term = searchTerm.toLowerCase().trim();
      const matchSearch =
        !term ||
        e.description.toLowerCase().includes(term) ||
        e.category.toLowerCase().includes(term);
      return matchCat && matchSearch;
    });
  }, [periodExpenses, filterCategory, searchTerm]);

  const totalFilteredAmount = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);

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
    combustivel: 'Combustível',
    alimentacao: 'Alimentação',
    estoque: 'Estoque',
    embalagem: 'Embalagens',
    taxa: 'Taxas',
    manutencao: 'Manutenção',
    outros: 'Outros',
  };

  // Group by category for distribution
  const categoryTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    filteredExpenses.forEach((e) => {
      totals[e.category] = (totals[e.category] || 0) + e.amount;
    });
    return totals;
  }, [filteredExpenses]);

  return (
    <div className="space-y-4 pb-28">
      {/* 0. Filter Bar (Período & Categoria) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <Filter className="w-3.5 h-3.5 text-rose-600" />
            <span>Filtrar Despesas:</span>
          </div>
          <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md">
            {periodLabel}
          </span>
        </div>

        {/* Quick Period Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {(['hoje', 'ontem', '7dias', 'mes', 'todos'] as DateFilterOption[]).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setFilterPeriod(opt)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                filterPeriod === opt
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {opt === 'hoje'
                ? 'Hoje'
                : opt === 'ontem'
                ? 'Ontem'
                : opt === '7dias'
                ? 'Últimos 7 dias'
                : opt === 'mes'
                ? 'Este Mês'
                : 'Todas'}
            </button>
          ))}
        </div>

        {/* Custom Date Input */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
          <label htmlFor="custom-expense-date" className="text-xs text-slate-500 font-medium flex items-center gap-1 shrink-0">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Data específica:</span>
          </label>
          <input
            id="custom-expense-date"
            type="date"
            value={customDate}
            onChange={(e) => {
              if (e.target.value) {
                setCustomDate(e.target.value);
                setFilterPeriod('custom');
              }
            }}
            className="px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:border-rose-500"
          />
        </div>

        {/* Category Pills */}
        <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            type="button"
            onClick={() => setFilterCategory('todos')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition-all ${
              filterCategory === 'todos'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todas Categorias
          </button>
          {Object.entries(categoryLabels).map(([cat, label]) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilterCategory(cat)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition-all ${
                filterCategory === cat
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 1. Main Expense Header Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <ArrowDownRight className="w-3.5 h-3.5 text-rose-600" />
            <span>Total de Despesas ({periodLabel})</span>
          </span>
          <span className="text-xs text-rose-700 bg-rose-50 font-bold px-2 py-0.5 rounded-md">
            {filteredExpenses.length} despesas
          </span>
        </div>

        {/* Big total */}
        <div>
          <div className="text-3xl sm:text-4xl font-black text-rose-600 font-mono-numbers tracking-tight">
            {formatCurrency(totalFilteredAmount)}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Total gasto no período selecionado
          </p>
        </div>

        {/* Category Breakdown Bar */}
        {Object.keys(categoryTotals).length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Distribuição por Categoria
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(categoryTotals).map(([cat, total]) => {
                const Icon = categoryIcons[cat as ExpenseCategory] || MoreHorizontal;
                const label = categoryLabels[cat as ExpenseCategory] || cat;

                return (
                  <div key={cat} className="bg-slate-50 border border-slate-100 rounded-xl p-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0 pr-1">
                      <Icon className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span className="truncate text-slate-700 font-medium">{label}</span>
                    </div>
                    <span className="font-mono-numbers font-bold text-slate-900 shrink-0">
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
        className="w-full min-h-[50px] rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-xs touch-press transition-colors tracking-wide"
      >
        <Plus className="w-4 h-4 stroke-[3]" />
        <span>LANÇAR NOVA DESPESA</span>
      </button>

      {/* 3. Search Bar for Expenses */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Buscar despesa por descrição..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:border-rose-500 shadow-xs"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 4. Filtered Expenses List */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Lançamentos ({filteredExpenses.length})
          </h3>
          <span className="text-xs font-black text-rose-600 font-mono-numbers">
            {formatCurrency(totalFilteredAmount)}
          </span>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-2">
            <ArrowDownRight className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-800">Nenhuma despesa encontrada</h4>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Nenhum lançamento no período ou categoria selecionada. Toque no botão acima para registrar um gasto.
            </p>
          </div>
        ) : (
          filteredExpenses.map((expense) => {
            const Icon = categoryIcons[expense.category] || MoreHorizontal;
            const catLabel = categoryLabels[expense.category] || expense.category;

            return (
              <div
                key={expense.id}
                className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="min-w-0">
                    <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm truncate">
                      {expense.description || catLabel}
                    </h4>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <span className="font-medium text-slate-600">{catLabel}</span>
                      <span>·</span>
                      <span>{formatDateBR(expense.date)}</span>
                      <span>·</span>
                      <span className="capitalize">{expense.paymentMethod}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm sm:text-base font-extrabold text-rose-600 font-mono-numbers">
                    -{formatCurrency(expense.amount)}
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Excluir despesa de ${formatCurrency(expense.amount)}?`)) {
                        onDeleteExpense(expense.id);
                      }
                    }}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Excluir despesa"
                  >
                    <Trash2 className="w-4 h-4" />
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
