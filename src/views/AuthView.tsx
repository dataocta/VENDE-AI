import React, { useState } from 'react';
import {
  Lock,
  Mail,
  User,
  Phone,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { registerUser, loginUser, saveRegisteredUsers, getRegisteredUsers, setCurrentUser } from '../utils/authStorage';
import { getUserProfileFirestore, saveUserProfileFirestore } from '../utils/firestoreService';
import { UserAccount } from '../types';

interface AuthViewProps {
  onAuthSuccess: (user: UserAccount) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onAuthSuccess }) => {
  // Start directly in login mode for simplicity
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Login inputs
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Register inputs
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    setTimeout(() => {
      const res = loginUser(loginIdentifier, loginPassword);
      setIsLoading(false);
      if (res.success && res.user) {
        onAuthSuccess(res.user);
      } else {
        setErrorMessage(res.error || 'E-mail, WhatsApp ou senha incorretos.');
      }
    }, 200);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    const res = registerUser({
      name: regName,
      email: regEmail,
      phone: regPhone,
      password: regPassword,
      businessName: `Vendas de ${regName.split(' ')[0] || 'Rua'}`,
    });

    if (res.success && res.user) {
      try {
        await saveUserProfileFirestore(res.user);
      } catch (err) {
        console.warn('Could not save user profile to Firestore immediately', err);
      }
      setIsLoading(false);
      onAuthSuccess(res.user);
    } else {
      setIsLoading(false);
      setErrorMessage(res.error || 'Erro ao criar conta.');
    }
  };

  const handleGoogleRealLogin = async () => {
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;
      const cleanEmail = (fbUser.email || '').trim().toLowerCase();
      const cleanName = fbUser.displayName || cleanEmail.split('@')[0] || 'Vendedor';

      // Check if user profile already exists in Firestore or locally
      let userAccount = await getUserProfileFirestore(fbUser.uid);

      if (!userAccount) {
        // Also check if local user matched by email
        const localUsers = getRegisteredUsers();
        const existingLocal = localUsers.find((u) => u.email.toLowerCase() === cleanEmail);

        const now = new Date();
        const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        userAccount = {
          id: fbUser.uid,
          name: cleanName,
          email: cleanEmail,
          phone: fbUser.phoneNumber || existingLocal?.phone || '',
          businessName: existingLocal?.businessName || `Vendas de ${cleanName.split(' ')[0]}`,
          createdAt: existingLocal?.createdAt || now.toISOString(),
          trialEndsAt: existingLocal?.trialEndsAt || sevenDaysLater.toISOString(),
          subscriptionStatus: existingLocal?.subscriptionStatus || 'trial',
          planPrice: 15.97,
        };

        // Save in Firestore database
        await saveUserProfileFirestore(userAccount);
      }

      // Keep local users list up to date
      const users = getRegisteredUsers();
      const idx = users.findIndex((u) => u.id === userAccount!.id || u.email.toLowerCase() === cleanEmail);
      if (idx >= 0) {
        users[idx] = userAccount;
      } else {
        users.unshift(userAccount);
      }
      saveRegisteredUsers(users);
      setCurrentUser(userAccount);

      setIsLoading(false);
      onAuthSuccess(userAccount);
    } catch (err: any) {
      setIsLoading(false);
      console.error('Google Auth Error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setErrorMessage('O login com o Google foi fechado antes de concluir.');
      } else if (err.code === 'auth/cancelled-popup-request') {
        // Ignore rapid clicks
      } else if (err.code === 'auth/popup-blocked') {
        setErrorMessage('A janela de login com o Google foi bloqueada pelo navegador. Permita pop-ups para entrar.');
      } else {
        setErrorMessage(err.message || 'Falha ao autenticar com o Google. Tente novamente.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center px-4 py-8">
      <div className="w-full max-w-sm mx-auto space-y-4">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="max-w-[190px] mx-auto rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 p-2.5 shadow-sm">
            <img
              src="/assets/aistudio/WhatsApp_Image_2026-10-19_at_16.38.36_cfc68798.jpeg"
              alt="Vende.ai Logo"
              className="w-full h-auto object-contain mx-auto"
            />
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Gestão de vendas, caixa e clientes com banco em nuvem seguro
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Clean Auth Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
          
          {/* 1. Botão Oficial: Login com o Google (Autenticação Real) */}
          <button
            type="button"
            onClick={handleGoogleRealLogin}
            disabled={isLoading}
            className="w-full min-h-[48px] rounded-2xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold text-xs flex items-center justify-center gap-2.5 shadow-xs touch-press transition-colors disabled:opacity-50"
          >
            {/* Google G Multi-Color SVG */}
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{isLoading ? 'Conectando ao Google...' : 'Continuar com o Google'}</span>
          </button>

          {/* Clean Divider */}
          <div className="relative flex items-center justify-center">
            <div className="w-full border-t border-slate-200" />
            <span className="bg-white px-2.5 text-[11px] text-slate-400 font-medium">
              ou com e-mail/senha
            </span>
          </div>

          {/* Modo Login Simples */}
          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  E-mail ou WhatsApp
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    required
                    placeholder="ex: seuemail@gmail.com ou DDD"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Sua senha"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-emerald-500 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="w-8 h-8 absolute right-1.5 top-1.5 flex items-center justify-center text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full min-h-[46px] rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-xs touch-press transition-colors tracking-wide mt-1"
              >
                <span>{isLoading ? 'ENTRANDO...' : 'ENTRAR'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setErrorMessage(null);
                  }}
                  className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold"
                >
                  Não tem uma conta? Cadastre-se
                </button>
              </div>
            </form>
          ) : (
            /* Modo Cadastro Básico */
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Seu Nome
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    required
                    placeholder="Ex: Carlos Silva"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  WhatsApp (com DDD)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="tel"
                    required
                    placeholder="11999998888"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="email"
                    required
                    placeholder="seuemail@gmail.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Criar Senha
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="password"
                    required
                    placeholder="Mínimo 4 dígitos"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full min-h-[46px] rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-xs touch-press transition-colors tracking-wide mt-1"
              >
                <span>{isLoading ? 'CRIANDO CONTA...' : 'CRIAR CONTA'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMessage(null);
                  }}
                  className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold"
                >
                  Já possui conta? Fazer login
                </button>
              </div>
            </form>
          )}

        </div>

      </div>
    </div>
  );
};
