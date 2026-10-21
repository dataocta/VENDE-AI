import React, { useState } from 'react';
import { CheckCircle2, Share2, Copy, ArrowRight, X, Check } from 'lucide-react';
import { Sale, BusinessSettings } from '../types';
import { formatCurrency, formatDateBR, generateWhatsAppSaleReceipt, getPaymentMethodLabel } from '../utils/receipt';

interface SaleSuccessModalProps {
  sale: Sale | null;
  settings: BusinessSettings;
  onClose: () => void;
  onNewSale: () => void;
}

export const SaleSuccessModal: React.FC<SaleSuccessModalProps> = ({
  sale,
  settings,
  onClose,
  onNewSale,
}) => {
  const [copied, setCopied] = useState(false);

  if (!sale) return null;

  const receiptText = generateWhatsAppSaleReceipt(sale, settings);

  const handleShareWhatsApp = () => {
    let cleanPhone = (sale.customerPhone || '').replace(/\D/g, '');
    if (cleanPhone.length >= 10 && !cleanPhone.startsWith('55')) {
      cleanPhone = `55${cleanPhone}`;
    }
    const url = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(receiptText)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(receiptText)}`;
    window.open(url, '_blank');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(receiptText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full sm:max-w-md bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl flex flex-col space-y-4 pb-safe">
        
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Venda Concluída!
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Big Celebration Amount */}
        <div className="text-center py-2 bg-emerald-50/60 border border-emerald-100 rounded-2xl p-4">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto mb-2">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div className="text-3xl sm:text-4xl font-black text-slate-900 font-mono-numbers">
            {formatCurrency(sale.totalAmount)}
          </div>
          <div className="text-xs text-slate-600 mt-1 flex items-center justify-center gap-1.5 font-medium">
            <span>{getPaymentMethodLabel(sale.paymentMethod)}</span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span>{sale.code}</span>
          </div>

          {sale.changeGiven && sale.changeGiven > 0 ? (
            <div className="mt-2.5 pt-2 border-t border-emerald-200/80 text-xs text-emerald-800 font-bold flex items-center justify-center gap-1">
              <span>Troco Devolvido:</span>
              <span className="font-mono-numbers text-sm font-extrabold">{formatCurrency(sale.changeGiven)}</span>
            </div>
          ) : null}
        </div>

        {/* Items Summary */}
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 max-h-32 overflow-y-auto text-xs space-y-1">
          {sale.items.map((it, idx) => (
            <div key={idx} className="flex items-center justify-between text-slate-700">
              <span className="truncate pr-2 font-medium">
                {it.quantity}x {it.name}
              </span>
              <span className="font-mono-numbers text-slate-500 shrink-0">
                {formatCurrency(it.subtotal)}
              </span>
            </div>
          ))}
          {sale.customerName && (
            <div className="pt-1.5 border-t border-slate-200 text-slate-600 flex items-center justify-between">
              <span>Cliente:</span>
              <span className="font-semibold text-slate-900">{sale.customerName}</span>
            </div>
          )}
        </div>

        {/* WhatsApp Share Button */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="w-full min-h-[48px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs touch-press transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span>ENVIAR COMPROVANTE NO WHATSAPP</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="min-h-[44px] rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs flex items-center justify-center gap-1.5 border border-slate-200 transition-colors touch-press"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-500" />
                  <span>Copiar Recibo</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onNewSale();
              }}
              className="min-h-[44px] rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors touch-press shadow-xs"
            >
              <span>Nova Venda</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
