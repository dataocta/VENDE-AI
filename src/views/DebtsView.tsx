import React, { useState } from 'react';
import {
  BookUser,
  Plus,
  Share2,
  DollarSign,
  Calendar,
  Phone,
  MapPin,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  History,
  X,
  UserPlus,
} from 'lucide-react';
import { CustomerDebt, BusinessSettings } from '../types';
import { formatCurrency, formatDateOnlyBR, generateWhatsAppDebtReminder } from '../utils/receipt';

interface DebtsViewProps {
  debts: CustomerDebt[];
  settings: BusinessSettings;
  onOpenPaymentModal: (debt: CustomerDebt) => void;
  onSaveDebt: (debt: CustomerDebt) => void;
}

export const DebtsView: React.FC<DebtsViewProps> = ({
  debts,
  settings,
  onOpenPaymentModal,
  onSaveDebt,
}) => {
  const [isNewDebtOpen, setIsNewDebtOpen] = useState(false);
  const [selectedDebtHistory, setSelectedDebtHistory] = useState<CustomerDebt | null>(null);

  // New debt form state
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newSpot, setNewSpot] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // Active debts (with balance > 0)
  const activeDebts = debts.filter((d) => d.totalOwed > 0);
  const paidDebts = debts.filter((d) => d.totalOwed <= 0);

  const totalOwedOnStreet = activeDebts.reduce((acc, d) => acc + d.totalOwed, 0);

  const todayStr = new Date().toISOString().split('T')[0];

  const getDueStatus = (dueDate?: string) => {
    if (!dueDate) return { label: 'Sem data', color: 'text-slate-500', isOverdue: false };
    if (dueDate < todayStr) {
      return { label: 'Vencido!', color: 'text-rose-600 font-bold', isOverdue: true };
    }
    if (dueDate === todayStr) {
      return { label: 'Vence Hoje!', color: 'text-amber-600 font-bold', isOverdue: false };
    }
    return { label: `Vence ${formatDateOnlyBR(dueDate)}`, color: 'text-slate-500', isOverdue: false };
  };

  const handleChargeWhatsApp = (debt: CustomerDebt) => {
    const text = generateWhatsAppDebtReminder(debt, settings);
    let cleanPhone = debt.phone.replace(/\D/g, '');
    if (cleanPhone.length >= 10 && !cleanPhone.startsWith('55')) {
      cleanPhone = `55${cleanPhone}`;
    }
    const url = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleCreateNewDebt = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(newAmount.replace(',', '.'));
    if (!newName.trim() || !amount || amount <= 0) return;

    const newCustomerDebt: CustomerDebt = {
      id: `debt_${Date.now()}`,
      name: newName.trim(),
      phone: newPhone.trim(),
      addressOrSpot: newSpot.trim() || undefined,
      totalOwed: amount,
      lastPurchaseDate: new Date().toISOString(),
      dueDate: newDueDate || undefined,
      history: [
        {
          id: `hist_${Date.now()}`,
          date: new Date().toISOString(),
          type: 'compra',
          amount,
          notes: newNotes.trim() || 'Anotado no Caderninho',
        },
      ],
    };

    onSaveDebt(newCustomerDebt);
    setIsNewDebtOpen(false);
    setNewName('');
    setNewPhone('');
    setNewSpot('');
    setNewAmount('');
    setNewDueDate('');
    setNewNotes('');
  };

  return (
    <div className="space-y-4 pb-28">
      {/* 1. Header Card: Total Owed on Street */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookUser className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Vendas A Prazo (A Receber)
            </span>
          </div>
          <span className="text-xs text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-md">
            {activeDebts.length} clientes a prazo
          </span>
        </div>

        <div>
          <div className="text-3xl sm:text-4xl font-black text-amber-700 font-mono-numbers tracking-tight">
            {formatCurrency(totalOwedOnStreet)}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Total a receber na praça / clientes da rua
          </p>
        </div>
      </div>

      {/* 2. Big Action CTA: Cadastrar Nova Venda A Prazo */}
      <button
        type="button"
        onClick={() => setIsNewDebtOpen(true)}
        className="w-full min-h-[50px] rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-xs touch-press transition-colors"
      >
        <UserPlus className="w-4 h-4 stroke-[2.5]" />
        <span>+ ANOTAR NOVA VENDA A PRAZO</span>
      </button>

      {/* 3. Debts List */}
      <div className="space-y-2.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
          Clientes com Saldo A Prazo ({activeDebts.length})
        </h3>

        {activeDebts.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-500 text-xs shadow-xs">
            Nenhum cliente com saldo a prazo no momento!
          </div>
        ) : (
          activeDebts.map((debt) => {
            const status = getDueStatus(debt.dueDate);

            return (
              <div
                key={debt.id}
                className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 text-sm truncate">
                        {debt.name}
                      </h4>
                      {status.isOverdue && (
                        <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider bg-rose-50 px-1.5 py-0.5 rounded">
                          Atrasado
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 mt-0.5">
                      {debt.addressOrSpot && (
                        <span className="flex items-center gap-1 text-slate-600">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span className="truncate max-w-[140px]">{debt.addressOrSpot}</span>
                        </span>
                      )}
                      {debt.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{debt.phone}</span>
                        </span>
                      )}
                      <span className={status.color}>{status.label}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs text-slate-500 block font-medium">Deve</span>
                    <span className="text-xl font-black text-amber-700 font-mono-numbers">
                      {formatCurrency(debt.totalOwed)}
                    </span>
                  </div>
                </div>

                {/* 1-Tap Action Buttons */}
                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleChargeWhatsApp(debt)}
                    className="min-h-[38px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 touch-press transition-colors shadow-xs"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Cobrar Zap</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenPaymentModal(debt)}
                    className="min-h-[38px] rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs flex items-center justify-center gap-1.5 touch-press transition-colors"
                  >
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Receber</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedDebtHistory(debt)}
                    className="min-h-[38px] rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs flex items-center justify-center gap-1 transition-colors"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>Histórico</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* New Debt Form Modal */}
      {isNewDebtOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto no-scrollbar pb-safe">
            <div className="sticky top-0 bg-white/95 backdrop-blur-md px-5 pt-4 pb-2 border-b border-slate-200 flex items-center justify-between z-10">
              <div>
                <h2 className="text-base font-bold text-slate-900">Anotar Venda A Prazo</h2>
                <p className="text-xs text-slate-500">Cadastre o cliente e o valor a receber</p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewDebtOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewDebt} className="p-4 space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Nome do Cliente *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Dona Neusa Costureira"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    WhatsApp (com DDD)
                  </label>
                  <input
                    type="tel"
                    placeholder="11999998888"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    Ponto / Localização
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Box 14 / Rua 5"
                    value={newSpot}
                    onChange={(e) => setNewSpot(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    Valor Total A Prazo (R$) *
                  </label>
                  <input
                    type="text"
                    required
                    inputMode="decimal"
                    placeholder="Ex: 50,00"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-amber-700 font-bold font-mono-numbers text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    Data Combinada Vencimento
                  </label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  O que ele levou? (Observação)
                </label>
                <input
                  type="text"
                  placeholder="Ex: 2 garrafas de café e 3 trufas"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                className="w-full min-h-[50px] rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-xs touch-press transition-colors"
              >
                SALVAR VENDA A PRAZO
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Customer History Modal */}
      {selectedDebtHistory && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-y-auto no-scrollbar pb-safe p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {selectedDebtHistory.name}
                </h3>
                <span className="text-xs text-slate-500">Histórico de Compras e Pagamentos</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDebtHistory(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center justify-between">
              <span className="text-xs text-slate-500">Saldo Atual Devedor:</span>
              <span className="text-xl font-black text-amber-700 font-mono-numbers">
                {formatCurrency(selectedDebtHistory.totalOwed)}
              </span>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Movimentações
              </span>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {selectedDebtHistory.history.map((h) => (
                  <div
                    key={h.id}
                    className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-900">
                        {h.type === 'compra' ? '🛍️ Venda A Prazo' : '💰 Pagamento Recebido'}
                      </div>
                      <div className="text-slate-500 text-[11px]">{h.notes}</div>
                      <div className="text-slate-400 text-[10px]">{formatDateOnlyBR(h.date)}</div>
                    </div>
                    <span
                      className={`font-black font-mono-numbers text-sm ${
                        h.type === 'compra' ? 'text-amber-700' : 'text-emerald-700'
                      }`}
                    >
                      {h.type === 'compra' ? '+' : '-'}{formatCurrency(h.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const d = selectedDebtHistory;
                setSelectedDebtHistory(null);
                onOpenPaymentModal(d);
              }}
              className="w-full min-h-[46px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 touch-press transition-colors shadow-xs"
            >
              <DollarSign className="w-4 h-4 stroke-[3]" />
              <span>Receber Pagamento Deste Cliente</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
