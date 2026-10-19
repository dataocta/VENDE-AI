import React from 'react';
import { Sun, Volume2, VolumeX, ShieldCheck, Zap, LogOut, User } from 'lucide-react';
import { BusinessSettings, UserAccount } from '../types';

interface HeaderProps {
  settings: BusinessSettings;
  user: UserAccount | null;
  onUpdateSettings: (newSettings: BusinessSettings) => void;
  activeTab: string;
  onOpenQuickSale: () => void;
  onLogout: () => void;
  todaySalesTotal: number;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  user,
  onUpdateSettings,
  activeTab,
  onOpenQuickSale,
  onLogout,
  todaySalesTotal,
}) => {
  const toggleContrast = () => {
    onUpdateSettings({
      ...settings,
      highContrastMode: !settings.highContrastMode,
    });
  };

  const toggleSound = () => {
    onUpdateSettings({
      ...settings,
      soundEnabled: !settings.soundEnabled,
    });
  };

  return (
    <header className="sticky top-0 z-30 w-full border-b border-slate-800 bg-slate-950/95 backdrop-blur-md px-4 py-2.5 transition-colors">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
        {/* Brand Zone (Logo Vende.ai + Business Name) */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-9 px-1 rounded-xl bg-black border border-slate-800 flex items-center justify-center shrink-0 overflow-hidden">
            <img
              src="/assets/aistudio/WhatsApp_Image_2026-10-19_at_16.38.36_cfc68798.jpeg"
              alt="Vende.ai"
              className="h-7 w-auto object-contain"
              referrerPolicy="no-referrer"
              onError={(e) => {
                // fallback if image blocked
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-slate-100 tracking-tight text-xs sm:text-sm truncate">
                {user?.businessName || settings.businessName || 'Vende.ai'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
              <span className="truncate">{user?.name || settings.sellerName || 'Vendedor'}</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-emerald-400 flex items-center gap-0.5">
                <ShieldCheck className="w-3 h-3 inline" /> 100% Offline
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions Zone */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Sunlight Mode Toggle */}
          <button
            type="button"
            onClick={toggleContrast}
            title={settings.highContrastMode ? 'Modo Normal' : 'Modo Sol Forte (Alto Contraste)'}
            aria-label="Alternar modo de luz solar"
            className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-colors ${
              settings.highContrastMode
                ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sun className="w-4 h-4" />
          </button>

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={toggleSound}
            title={settings.soundEnabled ? 'Sons Ativados' : 'Sons Desativados'}
            aria-label="Alternar som de confirmação"
            className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 flex items-center justify-center transition-colors"
          >
            {settings.soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          {/* Quick Sale Direct Trigger */}
          {activeTab !== 'pos' && (
            <button
              type="button"
              onClick={onOpenQuickSale}
              className="min-h-[38px] px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1 shadow-md shadow-emerald-500/10 active:scale-95 transition-all whitespace-nowrap"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Vender</span>
            </button>
          )}

          {/* Logout Button */}
          {user && (
            <button
              type="button"
              onClick={onLogout}
              title="Sair da Conta (Logout)"
              aria-label="Sair da conta"
              className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 flex items-center justify-center transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
