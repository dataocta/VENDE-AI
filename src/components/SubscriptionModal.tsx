import React, { useState } from 'react';
import {
  X,
  Check,
  QrCode,
  CreditCard,
  Sparkles,
  ShieldCheck,
  Copy,
  CheckCircle2,
  Lock,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { UserAccount } from '../types';
import { formatCurrency } from '../utils/receipt';
import { activateUserSubscription, getTrialInfo } from '../utils/authStorage';
import { playSaleChime } from '../utils/audio';

interface SubscriptionModalProps {
  isOpen: boolean;
  user: UserAccount;
  onClose: () => void;
  onSuccess: (updatedUser: UserAccount) => void;
  isMandatoryBlock?: boolean;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  user,
  onClose,
  onSuccess,
  isMandatoryBlock = false,
}) => {
  const [paymentType, setPaymentType] = useState<'pix' | 'cartao'>('pix');
  const [copiedPix, setCopiedPix] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [cardExp, setCardExp] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paidSuccess, setPaidSuccess] = useState(false);

  if (!isOpen) return null;

  const trialInfo = getTrialInfo(user);
  const planPrice = user.planPrice || 15.97;
  const pixCopyPasteCode = `00020126580014BR.GOV.BCB.PIX0136vendeai-assina-${user.id}520400005303986540515.975802BR5925VENDE.AI SAAS TECNOLOGIA6009SAO PAULO62070503***6304E2C9`;

  const handleCopyPix = () => {
    navigator.clipboard.writeText(pixCopyPasteCode);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2500);
  };

  const handleConfirmPayment = () => {
    setIsProcessing(true);

    setTimeout(() => {
      const updated = activateUserSubscription(user.id);
      setIsProcessing(false);
      setPaidSuccess(true);
      playSaleChime();

      if (updated) {
        onSuccess(updated);
      }
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full sm:max-w-md bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto no-scrollbar pb-safe">
        
        {/* Header with Vende.ai */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md px-5 pt-4 pb-2 border-b border-slate-200 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
            <h2 className="text-base font-bold text-slate-900">
              {trialInfo.isExpired ? 'Assinatura Vende.ai (Bloqueio)' : 'Assinar Vende.ai'}
            </h2>
          </div>
          {!isMandatoryBlock && (
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {paidSuccess ? (
          /* Payment Success State */
          <div className="p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-300 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900">
                Assinatura Ativada com Sucesso!
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Seu acesso completo ao Vende.ai está liberado.
              </p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs text-slate-700">
              <span>Valor mensal: </span>
              <strong className="text-emerald-700 font-mono-numbers">
                {formatCurrency(planPrice)}
              </strong>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Obrigado por apoiar o desenvolvimento do Vende.ai!
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full min-h-[48px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center transition-colors shadow-xs"
            >
              Começar a Usar Agora
            </button>
          </div>
        ) : (
          /* Payment Selection Form */
          <div className="p-5 space-y-4">
            
            {/* Logo and Price Box */}
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 text-center space-y-2">
              <div className="h-8 max-w-[140px] mx-auto overflow-hidden flex items-center justify-center">
                <img
                  src="/assets/aistudio/WhatsApp_Image_2026-10-19_at_16.38.36_cfc68798.jpeg"
                  alt="Vende.ai Logo"
                  className="h-full w-auto object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <span className="text-[11px] uppercase font-bold text-emerald-800 tracking-wider block">
                Plano Mensal Vende.ai
              </span>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-3xl sm:text-4xl font-black text-slate-900 font-mono-numbers tracking-tight">
                  {formatCurrency(planPrice)}
                </span>
                <span className="text-xs text-slate-500 font-medium">/ mês</span>
              </div>
              <p className="text-[11px] text-slate-600">
                Apenas R$ 0,53 por dia para gerenciar todas as suas vendas e despesas na rua
              </p>
            </div>

            {/* Trial expiration reason */}
            {trialInfo.isExpired && (
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                <Lock className="w-4 h-4 shrink-0 text-amber-600" />
                <span>
                  Seu teste gratuito de 07 dias chegou ao fim. Para continuar vendendo e anotando vendas a prazo, ative seu plano.
                </span>
              </div>
            )}

            {/* Included Features */}
            <div className="space-y-1.5 text-xs text-slate-700">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                O que você ganha com o Vende.ai:
              </span>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Vendas rápidas e calculadora de troco na hora</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Envio de comprovante no WhatsApp com sua chave Pix</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Controle de despesas da rua e fechamento de caixa</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Caderninho de vendas a prazo com lembrete amigável no Zap</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>100% Offline (funciona mesmo sem sinal 4G)</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                Escolha a Forma de Pagamento
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentType('pix')}
                  className={`min-h-[44px] rounded-xl flex items-center justify-center gap-2 text-xs font-bold border transition-all ${
                    paymentType === 'pix'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-400 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <QrCode className="w-4 h-4 text-emerald-600" />
                  <span>PIX Instantâneo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentType('cartao')}
                  className={`min-h-[44px] rounded-xl flex items-center justify-center gap-2 text-xs font-bold border transition-all ${
                    paymentType === 'cartao'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-400 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  <span>Cartão de Crédito</span>
                </button>
              </div>
            </div>

            {/* Pix QR Code Display */}
            {paymentType === 'pix' ? (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center space-y-3">
                <div className="w-36 h-36 bg-white p-2 rounded-xl mx-auto flex items-center justify-center shadow-xs border border-slate-200">
                  <div className="w-full h-full border-4 border-slate-900 flex flex-col items-center justify-center p-1 bg-slate-50">
                    <QrCode className="w-24 h-24 text-slate-900" />
                    <span className="text-[9px] font-black text-slate-900 uppercase tracking-wider">
                      PIX R$ 15,97
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-600">
                  Escaneie o QR Code ou copie a chave Pix abaixo:
                </div>

                <button
                  type="button"
                  onClick={handleCopyPix}
                  className="w-full min-h-[42px] rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-semibold text-xs flex items-center justify-center gap-1.5 border border-slate-300 transition-colors shadow-xs"
                >
                  {copiedPix ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-700 font-bold">Chave Pix Copiada!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-slate-500" />
                      <span>Copiar Chave Pix Copia e Cola</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              /* Credit Card Mock Input */
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2.5 text-xs">
                <div>
                  <label className="text-slate-600 block mb-1">Número do Cartão</label>
                  <input
                    type="text"
                    placeholder="0000 0000 0000 0000"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono-numbers focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-600 block mb-1">Validade</label>
                    <input
                      type="text"
                      placeholder="MM/AA"
                      value={cardExp}
                      onChange={(e) => setCardExp(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono-numbers focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 block mb-1">CVV</label>
                    <input
                      type="text"
                      placeholder="123"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono-numbers focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Confirm Payment Button */}
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleConfirmPayment}
              className="w-full min-h-[50px] rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-xs touch-press transition-colors"
            >
              <span>
                {isProcessing
                  ? 'CONFIRMANDO PAGAMENTO...'
                  : `CONFIRMAR PAGAMENTO DE ${formatCurrency(planPrice)}`}
              </span>
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </button>

            <div className="text-center text-[10px] text-slate-500 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Pagamento seguro e liberação imediata</span>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
