import React, { useEffect, useState } from 'react';
import {
  X,
  Check,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  ExternalLink,
  AlertCircle,
  Loader2,
  Settings2,
} from 'lucide-react';
import { UserAccount } from '../types';
import { formatCurrency } from '../utils/receipt';
import { getTrialInfo } from '../utils/authStorage';

interface SubscriptionModalProps {
  isOpen: boolean;
  user: UserAccount;
  onClose: () => void;
  onSuccess: (updatedUser: UserAccount) => void;
  isMandatoryBlock?: boolean;
  initialPaidSuccess?: boolean;
}

type StripePlan = 'monthly' | 'annual';

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  user,
  onClose,
  onSuccess,
  isMandatoryBlock = false,
  initialPaidSuccess = false,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<StripePlan>(
    user.selectedPlan === 'annual' ? 'annual' : 'monthly'
  );
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const [stripeConfigured, setStripeConfigured] = useState<boolean | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [externalRedirectUrl, setExternalRedirectUrl] = useState<string | null>(null);
  const [externalRedirectLabel, setExternalRedirectLabel] = useState<string>(
    'Abrir Checkout Seguro da Stripe'
  );
  const [paidSuccess, setPaidSuccess] = useState(initialPaidSuccess);

  useEffect(() => {
    setPaidSuccess(initialPaidSuccess);
  }, [initialPaidSuccess]);

  useEffect(() => {
    if (!isOpen) {
      setErrorMsg(null);
      setExternalRedirectUrl(null);
      return;
    }

    let cancelled = false;
    setIsLoadingConfig(true);
    fetch('/api/stripe/config')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setStripeConfigured(Boolean(data?.configured));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStripeConfigured(false);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingConfig(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const trialInfo = getTrialInfo(user);
  const monthlyPrice = 15.97;
  const annualPrice = 149.9;
  const displayPrice = selectedPlan === 'annual' ? annualPrice : monthlyPrice;

  const handleNavigateToStripe = (url: string, label: string) => {
    const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
    if (!isInIframe) {
      window.location.assign(url);
      return;
    }
    setExternalRedirectLabel(label);
    setExternalRedirectUrl(url);
  };

  const handleStartCheckout = async () => {
    setErrorMsg(null);
    setExternalRedirectUrl(null);
    setIsProcessing(true);

    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          name: user.name,
          customerId: user.stripeCustomerId,
          plan: selectedPlan,
          returnUrl: window.location.origin,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMsg(data?.error || 'Não foi possível iniciar o pagamento na Stripe.');
        return;
      }

      if (data.customerId && data.customerId !== user.stripeCustomerId) {
        onSuccess({
          ...user,
          stripeCustomerId: data.customerId,
          selectedPlan,
        });
      }

      if (data.url) {
        handleNavigateToStripe(data.url, 'Ir para Checkout Seguro da Stripe');
      } else {
        setErrorMsg('A Stripe não retornou o link de checkout.');
      }
    } catch {
      setErrorMsg('Erro de comunicação com o servidor de pagamentos.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenBillingPortal = async () => {
    setErrorMsg(null);
    setExternalRedirectUrl(null);
    setIsOpeningPortal(true);

    try {
      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: user.stripeCustomerId,
          email: user.email,
          userId: user.id,
          name: user.name,
          returnUrl: window.location.origin,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMsg(data?.error || 'Não foi possível abrir o portal de assinaturas.');
        return;
      }

      if (data.url) {
        handleNavigateToStripe(data.url, 'Abrir Portal do Cliente Stripe');
      }
    } catch {
      setErrorMsg('Erro de comunicação ao abrir o portal da Stripe.');
    } finally {
      setIsOpeningPortal(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full sm:max-w-md bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto no-scrollbar pb-safe">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md px-5 pt-4 pb-2.5 border-b border-slate-200 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
            <h2 className="text-base font-bold text-slate-900">
              {user.subscriptionStatus === 'active'
                ? 'Minha Assinatura Stripe'
                : trialInfo.isExpired
                ? 'Assinatura Vende.ai (Bloqueio)'
                : 'Assinar Vende.ai via Stripe'}
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
                Assinatura Confirmada na Stripe!
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Seu acesso completo ao Vende.ai foi liberado automaticamente.
              </p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs text-slate-700 space-y-1">
              <div>
                Plano ativo:{' '}
                <strong className="text-emerald-700">
                  {user.selectedPlan === 'annual' ? 'Anual' : 'Mensal'} (
                  {formatCurrency(user.planPrice || 15.97)})
                </strong>
              </div>
              {user.subscriptionExpiresAt && (
                <div className="text-[11px] text-slate-500">
                  Próxima renovação:{' '}
                  {new Intl.DateTimeFormat('pt-BR').format(
                    new Date(user.subscriptionExpiresAt)
                  )}
                </div>
              )}
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
          <div className="p-5 space-y-4">
            {/* Brand & Active Status */}
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
                {user.subscriptionStatus === 'active'
                  ? 'Assinatura Ativa'
                  : 'Stripe Billing • Assinatura Recorrente'}
              </span>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-3xl sm:text-4xl font-black text-slate-900 font-mono-numbers tracking-tight">
                  {formatCurrency(displayPrice)}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {selectedPlan === 'annual' ? '/ ano' : '/ mês'}
                </span>
              </div>
              <p className="text-[11px] text-slate-600">
                {selectedPlan === 'annual'
                  ? 'Equivalente a R$ 12,49/mês — economia de 22% no ano'
                  : 'Apenas R$ 0,53 por dia para controlar vendas, despesas e fiado'}
              </p>
            </div>

            {/* Trial expiration banner */}
            {trialInfo.isExpired && user.subscriptionStatus !== 'active' && (
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                <Lock className="w-4 h-4 shrink-0 text-amber-600" />
                <span>
                  Seu período de acesso expirou. Conclua a assinatura segura pela Stripe para desbloquear imediatamente.
                </span>
              </div>
            )}

            {/* Plan Selector */}
            {user.subscriptionStatus !== 'active' && (
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                  Escolha seu Plano
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPlan('monthly');
                      setExternalRedirectUrl(null);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      selectedPlan === 'monthly'
                        ? 'bg-emerald-50 border-emerald-500 shadow-xs'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs font-extrabold text-slate-900">Mensal</div>
                    <div className="text-sm font-black text-emerald-700 font-mono-numbers mt-0.5">
                      R$ 15,97
                    </div>
                    <div className="text-[10px] text-slate-500">Cobrança mensal</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPlan('annual');
                      setExternalRedirectUrl(null);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all relative ${
                      selectedPlan === 'annual'
                        ? 'bg-emerald-50 border-emerald-500 shadow-xs'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className="absolute -top-2 right-2 px-1.5 py-0.5 rounded-md bg-emerald-600 text-white text-[9px] font-black uppercase">
                      -22%
                    </span>
                    <div className="text-xs font-extrabold text-slate-900">Anual</div>
                    <div className="text-sm font-black text-emerald-700 font-mono-numbers mt-0.5">
                      R$ 149,90
                    </div>
                    <div className="text-[10px] text-slate-500">12 meses liberados</div>
                  </button>
                </div>
              </div>
            )}

            {/* Included features */}
            <div className="space-y-1.5 text-xs text-slate-700">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                O que está incluso na assinatura:
              </span>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Vendas rápidas, teclado numérico e troco automático</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Comprovante e cobrança amigável via WhatsApp</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Gestão de despesas, fluxo de caixa e sincronização na nuvem</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Cancelamento ou troca de cartão a qualquer momento pelo Portal Stripe</span>
              </div>
            </div>

            {/* Missing Server Key Info */}
            {!isLoadingConfig && stripeConfigured === false && (
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-300 text-xs text-slate-700 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Chave Stripe não configurada no servidor</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Para ativar o checkout real, adicione a variável{' '}
                  <code className="px-1 py-0.5 rounded bg-slate-200 font-mono text-[10px]">
                    STRIPE_SECRET_KEY
                  </code>{' '}
                  (ex: <code className="font-mono text-[10px]">sk_test_...</code>) nos Secrets/variáveis de ambiente do projeto.
                </p>
              </div>
            )}

            {/* Error Alert */}
            {errorMsg && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Iframe-Safe External Link Banner */}
            {externalRedirectUrl && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 space-y-2.5">
                <p className="text-xs text-emerald-900 font-semibold">
                  Sessão segura criada na Stripe! Clique abaixo para abrir o ambiente oficial de pagamento em uma nova aba:
                </p>
                <a
                  href={externalRedirectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full min-h-[46px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
                >
                  <span>{externalRedirectLabel}</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            )}

            {/* Primary CTA Buttons */}
            {user.subscriptionStatus !== 'active' && (
              <button
                type="button"
                disabled={isProcessing || isLoadingConfig || stripeConfigured === false}
                onClick={handleStartCheckout}
                className="w-full min-h-[50px] rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:text-slate-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-xs touch-press transition-colors"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>CONECTANDO À STRIPE...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    <span>ASSINAR NA STRIPE ({formatCurrency(displayPrice)})</span>
                    <ArrowRight className="w-4 h-4 stroke-[3]" />
                  </>
                )}
              </button>
            )}

            {(user.subscriptionStatus === 'active' || user.stripeCustomerId) && (
              <button
                type="button"
                disabled={isOpeningPortal || stripeConfigured === false}
                onClick={handleOpenBillingPortal}
                className="w-full min-h-[46px] rounded-2xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                {isOpeningPortal ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Abrindo Portal Stripe...</span>
                  </>
                ) : (
                  <>
                    <Settings2 className="w-4 h-4 text-emerald-400" />
                    <span>Gerenciar Assinatura e Cartão (Portal Stripe)</span>
                  </>
                )}
              </button>
            )}

            <div className="text-center text-[10px] text-slate-500 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Processado com criptografia PCI-DSS pela Stripe</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
