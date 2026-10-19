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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full sm:max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto no-scrollbar pb-safe">
        
        {/* Header with Vende.ai */}
        <div className="sticky top-0 bg-slate-900/95 backdrop-blur-md px-5 pt-4 pb-2 border-b border-slate-800 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <h2 className="text-base font-bold text-slate-100">
              {trialInfo.isExpired ? 'Assinatura Vende.ai (Bloqueio)' : 'Assinar Vende.ai'}
            </h2>
          </div>
          {!isMandatoryBlock && (
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-slate-200 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {paidSuccess ? (
          /* Payment Success State */
          <div className="p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-100">
                Assinatura Ativada com Sucesso!
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Seu acesso completo ao Vende.ai está liberado por 30 dias.
              </p>
            </div>
            <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 text-xs text-slate-300">
              <span>Valor mensal: </span>
              <strong className="text-emerald-400 font-mono-numbers">
                {formatCurrency(planPrice)}
              </strong>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Obrigado por apoiar o desenvolvimento do Vende.ai!
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full min-h-[48px] rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center transition-colors"
            >
              Começar a Usar Agora
            </button>
          </div>
        ) : (
          /* Payment Selection Form */
          <div className="p-5 space-y-4">
            
            {/* Logo and Price Box */}
            <div className="bg-gradient-to-br from-emerald-950/60 to-slate-950 border border-emerald-800/40 rounded-2xl p-4 text-center space-y-2">
              <div className="h-8 max-w-[140px] mx-auto overflow-hidden flex items-center justify-center">
                <img
                  src="/assets/aistudio/WhatsApp_Image_2026-10-19_at_16.38.36_cfc68798.jpeg"
                  alt="Vende.ai Logo"
                  className="h-full w-auto object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <span className="text-[11px] uppercase font-bold text-emerald-400 tracking-wider block">
                Plano Mensal Vende.ai
              </span>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-3xl sm:text-4xl font-black text-slate-100 font-mono-numbers tracking-tight">
                  {formatCurrency(planPrice)}
                </span>
                <span className="text-xs text-slate-400 font-medium">/ mês</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Apenas R$ 0,53 por dia para gerenciar todas as suas vendas e despesas na rua
              </p>
            </div>

            {/* Trial expiration reason */}
            {trialInfo.isExpired && (
              <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-800/50 text-amber-300 text-xs flex items-center gap-2">
                <Lock className="w-4 h-4 shrink-0 text-amber-400" />
                <span>
                  Seu teste gratuito de 07 dias chegou ao fim. Para continuar vendendo e anotando fiados, ative seu plano.
                </span>
              </div>
            )}

            {/* Included Features */}
            <div className="space-y-1.5 text-xs text-slate-300">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                O que você ganha com o Vende.ai:
              </span>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Vendas rápidas e calculadora de troco na hora</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Envio de comprovante no WhatsApp com sua chave Pix</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Controle de despesas da rua e fechamento de caixa</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Caderninho de fiado com lembrete amigável no Zap</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>100% Offline (funciona mesmo sem sinal 4G)</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">
                Escolha a Forma de Pagamento
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentType('pix')}
                  className={`min-h-[46px] rounded-xl flex items-center justify-center gap-2 text-xs font-bold border transition-all ${
                    paymentType === 'pix'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <QrCode className="w-4 h-4 text-emerald-400" />
                  <span>PIX Instantâneo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentType('cartao')}
                  className={`min-h-[46px] rounded-xl flex items-center justify-center gap-2 text-xs font-bold border transition-all ${
                    paymentType === 'cartao'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-emerald-400" />
                  <span>Cartão de Crédito</span>
                </button>
              </div>
            </div>

            {/* Pix QR Code Display */}
            {paymentType === 'pix' ? (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-center space-y-3">
                {/* Visual simulated QR code */}
                <div className="w-36 h-36 bg-white p-2 rounded-xl mx-auto flex items-center justify-center shadow-md">
                  <div className="w-full h-full border-4 border-slate-900 flex flex-col items-center justify-center p-1 bg-slate-50">
                    <QrCode className="w-24 h-24 text-slate-950" />
                    <span className="text-[9px] font-black text-slate-950 uppercase tracking-wider">
                      PIX R$ 15,97
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-400">
                  Escaneie o QR Code ou copie o código Pix abaixo:
                </div>

                <button
                  type="button"
                  onClick={handleCopyPix}
                  className="w-full min-h-[42px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition-colors"
                >
                  {copiedPix ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400">Código Pix Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-slate-400" />
                      <span>Copiar Chave Pix Copia e Cola</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              /* Credit Card Mock Input */
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-2.5 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Número do Cartão</label>
                  <input
                    type="text"
                    placeholder="0000 0000 0000 0000"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 font-mono-numbers focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-1">Validade</label>
                    <input
                      type="text"
                      placeholder="MM/AA"
                      value={cardExp}
                      onChange={(e) => setCardExp(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 font-mono-numbers focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">CVV</label>
                    <input
                      type="text"
                      placeholder="123"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 font-mono-numbers focus:outline-none focus:border-emerald-500"
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
              className="w-full min-h-[52px] rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 touch-press transition-all hover:brightness-105 active:scale-[0.98]"
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
              <span>Pagamento seguro e liberação imediata da sua conta</span>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
