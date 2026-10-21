import React from 'react';
import { LogOut } from 'lucide-react';
import { BusinessSettings, UserAccount } from '../types';

interface HeaderProps {
  settings: BusinessSettings;
  user: UserAccount | null;
  onUpdateSettings?: (newSettings: BusinessSettings) => void;
  activeTab?: string;
  onOpenQuickSale?: () => void;
  onLogout: () => void;
  todaySalesTotal?: number;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  user,
  onLogout,
}) => {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 py-2.5 transition-colors">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
        {/* Brand Zone (Logo Vende.ai + Business Name) */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-9 px-1 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
            <img
              src="/assets/aistudio/WhatsApp_Image_2026-10-19_at_16.38.36_cfc68798.jpeg"
              alt="Vende.ai"
              className="h-7 w-auto object-contain"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-slate-900 tracking-tight text-sm truncate">
                {user?.businessName || settings.businessName || 'Vende.ai'}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium truncate">
              {user?.name || settings.sellerName || 'Vendedor'}
            </div>
          </div>
        </div>

        {/* Clean Right Zone - Logout only if user authenticated */}
        {user && (
          <button
            type="button"
            onClick={onLogout}
            title="Sair da Conta (Logout)"
            aria-label="Sair da conta"
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-500 hover:text-rose-600 flex items-center justify-center transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
};
