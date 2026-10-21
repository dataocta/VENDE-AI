import React, { useState } from 'react';
import { Clock, Sparkles, ChevronRight, Sliders, ShieldCheck } from 'lucide-react';
import { UserAccount } from '../types';
import { getTrialInfo, simulateUserTrial } from '../utils/authStorage';

interface TrialBannerProps {
  user: UserAccount | null;
  onOpenSubscription: () => void;
  onUserUpdated: (user: UserAccount) => void;
}

export const TrialBanner: React.FC<TrialBannerProps> = ({
  user,
  onOpenSubscription,
  onUserUpdated,
}) => {
  const [showSimulator, setShowSimulator] = useState(false);
  if (!user) return null;
  const trialInfo = getTrialInfo(user);

  if (user.subscriptionStatus === 'active') {
    return (
      <div className="bg-emerald-50 border-b border-emerald-200/80 px-4 py-1.5 text-[11px] flex items-center justify-between text-emerald-800">
        <div className="flex items-center gap-1.5 font-semibold">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Assinatura Ativa (R$ 15,97/mês)</span>
        </div>
        <button
          type="button"
          onClick={() => setShowSimulator(!showSimulator)}
          className="text-slate-500 hover:text-slate-800 text-[10px] underline"
        >
          {showSimulator ? 'Fechar Simulador' : 'Simulador'}
        </button>
      </div>
    );
  }

  const handleSimulate = (mode: 'trial_7' | 'trial_1' | 'expired' | 'active') => {
    const updated = simulateUserTrial(user.id, mode);
    if (updated) {
      onUserUpdated(updated);
    }
  };

  return (
    <div className="bg-emerald-50 border-b border-emerald-200/80 px-3.5 py-1.5">
      <div className="max-w-md mx-auto flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-emerald-600/10 text-emerald-700 flex items-center justify-center shrink-0">
            <Clock className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5 truncate">
              <span>
                {trialInfo.daysRemaining > 0
                  ? `Teste Grátis: ${trialInfo.daysRemaining} dia${trialInfo.daysRemaining > 1 ? 's' : ''}`
                  : 'Teste Encerrado'}
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className="text-emerald-700 font-mono-numbers">R$ 15,97/mês</span>
            </div>
            <p className="text-[10px] text-slate-500 truncate">
              Válido até {trialInfo.trialEndsFormatted}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onOpenSubscription}
            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 touch-press transition-colors shadow-xs"
          >
            <span>Ativar</span>
            <ChevronRight className="w-3 h-3 stroke-[3]" />
          </button>

          {/* Quick simulator dropdown toggle */}
          <button
            type="button"
            onClick={() => setShowSimulator(!showSimulator)}
            title="Simular dias de teste (7 dias, 1 dia, expirado)"
            className="w-7 h-7 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 flex items-center justify-center transition-colors text-[10px]"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Simulator Drawer for testing */}
      {showSimulator && (
        <div className="mt-2 pt-2 border-t border-emerald-200 text-xs space-y-1.5 animate-in fade-in duration-150">
          <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">
            Simulador de Teste:
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            <button
              type="button"
              onClick={() => handleSimulate('trial_7')}
              className="px-2 py-1 rounded-md bg-white border border-slate-200 hover:bg-slate-50 text-[10px] text-slate-700"
            >
              7 Dias
            </button>
            <button
              type="button"
              onClick={() => handleSimulate('trial_1')}
              className="px-2 py-1 rounded-md bg-white border border-slate-200 hover:bg-slate-50 text-[10px] text-slate-700"
            >
              1 Dia
            </button>
            <button
              type="button"
              onClick={() => handleSimulate('expired')}
              className="px-2 py-1 rounded-md bg-rose-50 border border-rose-200 hover:bg-rose-100 text-[10px] text-rose-700 font-bold"
            >
              Expirado
            </button>
            <button
              type="button"
              onClick={() => handleSimulate('active')}
              className="px-2 py-1 rounded-md bg-emerald-100 border border-emerald-300 hover:bg-emerald-200 text-[10px] text-emerald-800 font-bold"
            >
              Assinado
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
