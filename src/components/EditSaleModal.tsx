import React, { useState } from 'react';
import { X, Check, Trash2, Banknote, QrCode, CreditCard, BookUser, User, Calendar, Tag, ChevronDown } from 'lucide-react';
import { Sale, PaymentMethod } from '../types';
import { formatCurrency } from '../utils/receipt';

interface EditSaleModalProps {
  isOpen: boolean;
  sale: Sale | null;
  onClose: () => void;
  onSave: (updatedSale: Sale) => void;
  onDelete: (id: string) => void;
}

export const EditSaleModal: React.FC<EditSaleModalProps> = ({
  isOpen,
  sale,
  onClose,
  onSave,
  onDelete,
}) => {
  if (!isOpen || !sale) return null;

  const [totalAmountStr, setTotalAmountStr] = useState<string>(sale.totalAmount.toFixed(2).replace('.', ','));
  const [description, setDescription] = useState<string>(
    sale.items.map((i) => `${i.quantity}x ${i.name}`).join(', ') || sale.notes || ''
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(sale.paymentMethod);
  const [customerName, setCustomerName] = useState<string>(sale.customerName || '');
  const [customerPhone, setCustomerPhone] = useState<string>(sale.customerPhone || '');
  const [dateStr, setDateStr] = useState<string>(sale.date.split('T')[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(totalAmountStr.replace(',', '.'));
    if (!num || num <= 0) return;

    if (paymentMethod === 'fiado' && !customerName.trim()) {
      alert('Para venda a prazo, informe o nome do cliente!');
      return;
    }

    const originalTime = sale.date.includes('T') ? sale.date.split('T')[1] : new Date().toISOString().split('T')[1];
    const newDateISO = `${dateStr}T${originalTime}`;

    // Update first item name/subtotal or keep items
    const updatedItems = sale.items.length > 0
      ? [
          {
            ...sale.items[0],
            name: description.trim() || sale.items[0].name,
            unitPrice: num,
            subtotal: num,
          },
          ...sale.items.slice(1),
        ]
      : [
          {
            name: description.trim() || 'Item Registrado',
            quantity: 1,
            unitPrice: num,
            subtotal: num,
            costPrice: num * 0.45,
          },
        ];

    onSave({
      ...sale,
      totalAmount: num,
      items: updatedItems,
      paymentMethod,
      customerName: customerName.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      notes: description.trim() || sale.notes,
      date: newDateISO,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full sm:max-w-md bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden">
        
        {/* Header */}
        <div className="shrink-0 bg-white px-5 pt-4 pb-3 border-b border-slate-100 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                {sale.code}
              </span>
              <h2 className="text-base font-bold text-slate-900">Editar Venda</h2>
            </div>
            <p className="text-xs text-slate-500">Altere valor, itens, forma de pagamento ou cliente</p>
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-3.5 overscroll-contain">
          {/* Amount input */}
          <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-3.5 text-center">
            <span className="text-xs uppercase tracking-wider text-emerald-700 font-bold block mb-1">
              Valor Total da Venda (R$)
            </span>
            <div className="relative max-w-[200px] mx-auto">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-black text-emerald-400 font-mono-numbers">
                R$
              </span>
              <input
                type="text"
                inputMode="decimal"
                required
                value={totalAmountStr}
                onChange={(e) => setTotalAmountStr(e.target.value)}
                className="w-full pl-10 pr-3 py-2 text-2xl font-black text-emerald-700 font-mono-numbers text-center bg-white border border-emerald-300 rounded-xl focus:outline-none focus:border-emerald-500 shadow-2xs"
              />
            </div>
          </div>

          {/* Date Picker */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Data da Venda</span>
            </label>
            <input
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs font-medium focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Product / Description */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              Produtos / Descrição da Venda
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: 2x Pastel de Carne, 1x Coca"
              className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-emerald-500 font-medium"
            />
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              Forma de Pagamento
            </label>
            <div className="relative">
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full h-11 pl-10 pr-9 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-bold focus:outline-none focus:border-emerald-500 appearance-none shadow-xs cursor-pointer"
              >
                <option value="pix">PIX (Chave ou QR Code)</option>
                <option value="dinheiro">Dinheiro Físico</option>
                <option value="cartao_debito">Cartão de Débito</option>
                <option value="cartao_credito">Cartão de Crédito</option>
                <option value="fiado">Venda a Prazo (Fiado / Notinha)</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-emerald-600">
                {paymentMethod === 'pix' && <QrCode className="w-4 h-4" />}
                {paymentMethod === 'dinheiro' && <Banknote className="w-4 h-4" />}
                {paymentMethod === 'cartao_debito' && <CreditCard className="w-4 h-4" />}
                {paymentMethod === 'cartao_credito' && <CreditCard className="w-4 h-4" />}
                {paymentMethod === 'fiado' && <BookUser className="w-4 h-4 text-amber-600" />}
              </div>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Customer info */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2">
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-600" />
              <span>Cliente (Opcional ou obrigatório se fiado)</span>
            </span>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Nome do Cliente"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-emerald-500 font-medium"
              />
              <input
                type="tel"
                placeholder="WhatsApp"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-emerald-500 font-medium"
              />
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                if (confirm(`Deseja realmente excluir a venda ${sale.code} de ${formatCurrency(sale.totalAmount)}? O estoque será devolvido.`)) {
                  onDelete(sale.id);
                  onClose();
                }
              }}
              className="p-2.5 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 text-xs font-bold flex items-center gap-1 shrink-0"
            >
              <Trash2 className="w-4 h-4" />
              <span>Excluir</span>
            </button>

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
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-sm transition-colors flex items-center gap-1.5 touch-press"
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
