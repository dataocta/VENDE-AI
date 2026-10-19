import React, { useState } from 'react';
import { Clock, Sparkles, ChevronRight, Sliders, ShieldCheck } from 'lucide-react';
import { UserAccount } from '../types';
import { getTrialInfo, simulateUserTrial } from '../utils/authStorage';

interface TrialBannerProps {
  user: UserAccount;
  onOpenSubscription: () => void;
  onUserUpdated: (user: UserAccount) => void;
}

export const TrialBanner: React.FC<TrialBannerProps> = ({
  user,
  onOpenSubscription,
  onUserUpdated,
}) => {
  const [showSimulator, setShowSimulator] = useState(false);
  const trialInfo = getTrialInfo(user);

  if (user.subscriptionStatus === 'active') {
    return (
      <div className="bg-emerald-950/40 border-b border-emerald-900/40 px-4 py-1.5 text-[11px] flex items-center justify-between text-emerald-300">
        <div className="flex items-center gap-1.5 font-semibold">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Assinatura Ativa (R$ 15,97/mês)</span>
        </div>
        <button
          type="button"
          onClick={() => setShowSimulator(!showSimulator)}
          className="text-slate-400 hover:text-slate-200 text-[10px] underline"
        >
          {showSimulator ? 'Fechar Simulador' : 'Simulador de Teste'}
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
    <div className="bg-gradient-to-r from-emerald-950/90 via-slate-900 to-amber-950/80 border-b border-emerald-800/40 px-3.5 py-2">
      <div className="max-w-md mx-auto flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Clock className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5 truncate">
              <span>
                {trialInfo.daysRemaining > 0
                  ? `Teste Grátis: ${trialInfo.daysRemaining} dia${trialInfo.daysRemaining > 1 ? 's' : ''} restante${trialInfo.daysRemaining > 1 ? 's' : ''}`
                  : 'Período de Teste Terminou'}
              </span>
              <span aria-hidden="true" className="text-slate-500">·</span>
              <span className="text-emerald-400 font-mono-numbers">R$ 15,97/mês</span>
            </div>
            <p className="text-[10px] text-slate-400 truncate">
              Válido até {trialInfo.trialEndsFormatted}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onOpenSubscription}
            className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold flex items-center gap-1 touch-press transition-colors"
          >
            <span>Assinar</span>
            <ChevronRight className="w-3 h-3 stroke-[3]" />
          </button>

          {/* Quick simulator dropdown toggle */}
          <button
            type="button"
            onClick={() => setShowSimulator(!showSimulator)}
            title="Simular dias de teste (7 dias, 1 dia, expirado)"
            className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200 flex items-center justify-center transition-colors text-[10px]"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Simulator Drawer for easily evaluating test conditions */}
      {showSimulator && (
        <div className="mt-2 pt-2 border-t border-slate-800 text-xs space-y-1.5 animate-in fade-in duration-150">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Simulador de Período (Para testar o fluxo):
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            <button
              type="button"
              onClick={() => handleSimulate('trial_7')}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-200"
            >
              7 Dias
            </button>
            <button
              type="button"
              onClick={() => handleSimulate('trial_1')}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-200"
            >
              1 Dia
            </button>
            <button
              type="button"
              onClick={() => handleSimulate('expired')}
              className="px-2 py-1 rounded bg-rose-950/80 border border-rose-800/80 text-[10px] text-rose-300 font-bold"
            >
              Expirado
            </button>
            <button
              type="button"
              onClick={() => handleSimulate('active')}
              className="px-2 py-1 rounded bg-emerald-950/80 border border-emerald-800/80 text-[10px] text-emerald-300 font-bold"
            >
              Assinado
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
