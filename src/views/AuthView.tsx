import React, { useState } from 'react';
import {
  Lock,
  Mail,
  User,
  Phone,
  Store,
  Eye,
  EyeOff,
  CheckCircle2,
  Zap,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  AlertCircle,
  Clock,
  Check,
} from 'lucide-react';
import { registerUser, loginUser } from '../utils/authStorage';
import { UserAccount } from '../types';

interface AuthViewProps {
  onAuthSuccess: (user: UserAccount) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onAuthSuccess }) => {
  const [mode, setMode] = useState<'register' | 'login'>('register');

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Login states
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    setTimeout(() => {
      const res = registerUser({
        name,
        email,
        phone,
        password,
        businessName,
      });

      setIsLoading(false);
      if (res.success && res.user) {
        onAuthSuccess(res.user);
      } else {
        setErrorMessage(res.error || 'Erro ao realizar cadastro.');
      }
    }, 200);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    setTimeout(() => {
      const res = loginUser(loginIdentifier, loginPassword);
      setIsLoading(false);
      if (res.success && res.user) {
        onAuthSuccess(res.user);
      } else {
        setErrorMessage(res.error || 'Erro ao fazer login.');
      }
    }, 200);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center px-4 py-8">
      <div className="w-full max-w-md mx-auto space-y-5">
        
        {/* Brand Header with Attached Vende.ai Logo */}
        <div className="text-center space-y-3">
          <div className="max-w-[220px] mx-auto rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 p-3 shadow-md">
            <img
              src="/assets/aistudio/WhatsApp_Image_2026-10-19_at_16.38.36_cfc68798.jpeg"
              alt="Vende.ai Logo"
              className="w-full h-auto object-contain mx-auto"
            />
          </div>
          <p className="text-xs sm:text-sm text-slate-600 max-w-xs mx-auto font-medium">
            Gestão inteligente de vendas, despesas e vendas a prazo na rua
          </p>

          {/* 7 Days Free Trial Highlight Badge */}
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>07 Dias Grátis · Depois R$ 15,97/mês</span>
          </div>
        </div>

        {/* Auth Mode Tabs (Segmented control) */}
        <div className="grid grid-cols-2 p-1 bg-slate-200/80 border border-slate-200 rounded-2xl">
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMessage(null);
            }}
            className={`min-h-[44px] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              mode === 'register'
                ? 'bg-emerald-600 text-white shadow-xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Criar Conta (7 Dias Grátis)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMessage(null);
            }}
            className={`min-h-[44px] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              mode === 'login'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Já tenho Login</span>
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form Container */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
          {mode === 'register' ? (
            /* Cadastro Form (New Visitor via link) */
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div className="pb-1 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-900">
                  Cadastre-se e libere seus 07 dias grátis
                </h2>
                <p className="text-xs text-emerald-700 font-medium">
                  Base 100% limpa para você cadastrar seus produtos e começar a vender
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Seu Nome Completo *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    required
                    placeholder="Ex: Carlos Eduardo Silva"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    WhatsApp (com DDD) *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                    <input
                      type="tel"
                      required
                      placeholder="11999998888"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    Nome da Barraca / Negócio
                  </label>
                  <div className="relative">
                    <Store className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                    <input
                      type="text"
                      placeholder="Ex: Salgados do Carlinhos"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  E-mail (Para acessar o app) *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="email"
                    required
                    placeholder="seuemail@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Crie uma Senha *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Mínimo 4 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-emerald-500"
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

              {/* Free Trial Banner in form */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Plano 07 Dias Gratuitos Incluso</span>
                </div>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  Você terá acesso completo a todas as funções sem pagar nada. Após os 07 dias, o valor é de apenas <strong className="text-slate-900">R$ 15,97 por mês</strong>.
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full min-h-[50px] rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-xs touch-press transition-colors"
              >
                <span>{isLoading ? 'CRIANDO SEU LOGIN...' : 'CRIAR CONTA & LIBERAR 07 DIAS GRÁTIS'}</span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </button>
            </form>
          ) : (
            /* Login Form */
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="pb-1 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-900">
                  Acesse sua conta Vende.ai
                </h2>
                <p className="text-xs text-slate-500">
                  Entre com seu e-mail ou WhatsApp cadastrado
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  E-mail ou WhatsApp
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    required
                    placeholder="seuemail@exemplo.com ou telefone"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Sua Senha
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Sua senha"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-emerald-500"
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
                className="w-full min-h-[50px] rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-xs touch-press transition-colors"
              >
                <span>{isLoading ? 'ENTRANDO...' : 'ENTRAR NO VENDE.AI'}</span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
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
                  Ainda não tem cadastro? Comece 07 dias grátis aqui!
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Feature Highlights for Street Sellers */}
        <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
          <div className="flex items-center gap-1.5 p-2 rounded-xl bg-white border border-slate-200 shadow-xs">
            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Venda rápida em 3s</span>
          </div>
          <div className="flex items-center gap-1.5 p-2 rounded-xl bg-white border border-slate-200 shadow-xs">
            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Comprovante no Zap</span>
          </div>
          <div className="flex items-center gap-1.5 p-2 rounded-xl bg-white border border-slate-200 shadow-xs">
            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Vendas A Prazo</span>
          </div>
          <div className="flex items-center gap-1.5 p-2 rounded-xl bg-white border border-slate-200 shadow-xs">
            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>100% Offline na rua</span>
          </div>
        </div>

        {/* Security Footer Note */}
        <div className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
          <span>Acesso seguro com criptografia local e isolamento por vendedor</span>
        </div>

      </div>
    </div>
  );
};
