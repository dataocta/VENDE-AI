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
  Check,
  ShieldCheck,
  ArrowLeft,
  ChevronDown,
  Calculator,
  Receipt,
  RotateCcw,
  Plus,
} from 'lucide-react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import {
  registerUser,
  loginUser,
  saveRegisteredUsers,
  getRegisteredUsers,
  setCurrentUser,
} from '../utils/authStorage';
import { getUserProfileFirestore, saveUserProfileFirestore } from '../utils/firestoreService';
import { UserAccount } from '../types';

import vendorHeroImg from '../assets/images/vendeai_vendor_hero_1794571379307.jpg';
import posShowcaseImg from '../assets/images/vendeai_pos_showcase_1794503121729.jpg';
import dashboardShowcaseImg from '../assets/images/vendeai_dashboard_showcase_1794503140016.jpg';
import whatsappFiadoImg from '../assets/images/vendeai_whatsapp_fiado_1794571379188.jpg';

type PlanId = 'trial' | 'monthly' | 'annual';
type TourTabId = 'pdv' | 'caixa' | 'whatsapp';

interface AuthViewProps {
  onAuthSuccess: (user: UserAccount) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onAuthSuccess }) => {
  // Page view: 'landing' (apresentação + planos) ou 'auth' (login / cadastro)
  const [pageView, setPageView] = useState<'landing' | 'auth'>('landing');

  // Selected plan state
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('monthly');

  // Landing page interactive states
  const [heroMode, setHeroMode] = useState<'photo' | 'simulator'>('photo');
  const [simTotal, setSimTotal] = useState<number>(14);
  const [simItems, setSimItems] = useState<{ name: string; price: number }[]>([
    { name: 'Pastel Especial', price: 8 },
    { name: 'Caldo de Cana', price: 6 },
  ]);
  const [simPayment, setSimPayment] = useState<'Pix' | 'Dinheiro'>('Pix');
  const [simReceiptSent, setSimReceiptSent] = useState(false);

  const [activeTourTab, setActiveTourTab] = useState<TourTabId>('pdv');
  const [dailySalesEstimate, setDailySalesEstimate] = useState<number>(350);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Auth form mode
  const [mode, setMode] = useState<'login' | 'register'>('register');

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

  const plansConfig: Record<
    PlanId,
    {
      id: PlanId;
      name: string;
      priceStr: string;
      period: string;
      kicker: string;
      highlight?: boolean;
      description: string;
      priceNumber: number;
      features: string[];
      buttonLabel: string;
    }
  > = {
    trial: {
      id: 'trial',
      name: 'Teste Grátis',
      priceStr: 'R$ 0,00',
      period: 'por 7 dias',
      kicker: 'Sem cartão de crédito',
      highlight: false,
      description: 'Experimente na prática durante uma semana completa, sem compromisso.',
      priceNumber: 15.97,
      features: [
        'Acesso completo a todas as funções',
        'Cadastro ilimitado de produtos e clientes',
        'Comprovante no WhatsApp com sua Chave Pix',
        'Controle de fiado e fechamento de caixa',
        'Sem pedir dados de cartão no cadastro',
      ],
      buttonLabel: 'Começar 7 Dias Grátis',
    },
    monthly: {
      id: 'monthly',
      name: 'Plano Mensal Pro',
      priceStr: 'R$ 15,97',
      period: '/mês',
      kicker: 'Mais escolhido · R$ 0,53 por dia',
      highlight: true,
      description: 'Tudo liberado com sincronização automática em nuvem e suporte direto.',
      priceNumber: 15.97,
      features: [
        '7 dias iniciais grátis para testar',
        'Sincronização em nuvem no celular e no PC',
        'Controle de fiado com histórico e cobrança',
        'Relatório automático de lucro limpo do dia',
        'Categorias personalizadas de produtos e despesas',
        'Suporte direto e cancelamento sem multa',
      ],
      buttonLabel: 'Escolher Plano Mensal',
    },
    annual: {
      id: 'annual',
      name: 'Plano Anual',
      priceStr: 'R$ 149,90',
      period: '/ano',
      kicker: 'Economize 20% · Equivale a R$ 12,49/mês',
      highlight: false,
      description: 'Um ano inteiro de caixa organizado pagando bem menos por mês.',
      priceNumber: 149.9,
      features: [
        '12 meses de acesso completo sem mensalidades',
        'Economia superior a R$ 40,00 no ano',
        'Backup permanente em nuvem criptografada',
        'Acesso imediato a todas as atualizações',
        'Suporte prioritário no WhatsApp',
      ],
      buttonLabel: 'Escolher Plano Anual',
    },
  };

  const tourSections: Record<
    TourTabId,
    {
      id: TourTabId;
      tabLabel: string;
      eyebrow: string;
      title: string;
      description: string;
      image: string;
      imageAlt: string;
      highlights: string[];
    }
  > = {
    pdv: {
      id: 'pdv',
      tabLabel: '01. Venda Rápida',
      eyebrow: 'Frente de Caixa Ágil',
      title: 'Registre vendas, serviços ou estornos em segundos',
      description:
        'Na correria da barraca ou do balcão, você não pode perder tempo. Digite direto no teclado numérico grande do celular ou use as teclas do computador para lançar na hora.',
      image: posShowcaseImg,
      imageAlt: 'Tela de Venda Rápida do Vende.ai com teclado numérico e Pix',
      highlights: [
        'Teclado numérico imediato no celular e atalhos físicos no PC',
        'Cálculo automático de troco quando o pagamento for em dinheiro',
        'Selecione um cliente cadastrado ou crie um novo sem sair da venda',
        'Aceite entradas de Venda, Estorno, Serviço ou Aporte de Caixa',
      ],
    },
    caixa: {
      id: 'caixa',
      tabLabel: '02. Caixa e Lucro',
      eyebrow: 'Gestão Financeira Clara',
      title: 'Saiba exatamente quanto entrou, saiu e sobrou no bolso',
      description:
        'Pare de misturar o dinheiro pessoal com o da barraca. Acompanhe o saldo por forma de pagamento, lance despesas com categorias personalizadas e veja seu lucro líquido real.',
      image: dashboardShowcaseImg,
      imageAlt: 'Painel Financeiro do Vende.ai exibindo vendas, lucro limpo e resumo diário',
      highlights: [
        'Separação clara entre Pix, Dinheiro Físico, Cartão e Fiado',
        'Categorias personalizadas para produtos e também para suas despesas',
        'Conferência e fechamento de caixa diário em menos de 1 minuto',
        'Edite ou corrija qualquer lançamento antigo direto pelo histórico',
      ],
    },
    whatsapp: {
      id: 'whatsapp',
      tabLabel: '03. WhatsApp e Fiado',
      eyebrow: 'Cobrança Profissional',
      title: 'Recibos no WhatsApp e caderno de fiado organizado',
      description:
        'Passe mais confiança aos clientes enviando o comprovante completo com um toque, já com sua Chave Pix. Controle quem está devendo e envie lembretes educados sem constrangimento.',
      image: whatsappFiadoImg,
      imageAlt: 'Comprovante de pagamento Pix e controle de fiado no WhatsApp pelo Vende.ai',
      highlights: [
        'Comprovante formatado com nome da barraca, itens e Chave Pix',
        'Controle de amortização e pagamentos parciais no fiado',
        'Histórico individual de compras e pagamentos por cliente',
        'Botão direto para cobrar no WhatsApp com texto pronto',
      ],
    },
  };

  const faqs = [
    {
      q: 'Preciso ter internet o tempo todo para usar na rua?',
      a: 'Não! O sistema grava as vendas, despesas e clientes diretamente no aparelho mesmo se o sinal cair. Assim que a conexão voltar, tudo é salvo automaticamente na sua nuvem.',
    },
    {
      q: 'Como funciona o período de 7 dias grátis?',
      a: 'Você cria sua conta em segundos escolhendo qualquer plano e usa todas as ferramentas liberadas por 7 dias sem cadastrar cartão de crédito. Depois, só continua se aprovar o sistema.',
    },
    {
      q: 'Funciona tanto no celular quanto no computador?',
      a: 'Sim. Você pode vender na rua pelo celular e conferir o fechamento, cadastrar produtos ou lançar valores pelo teclado do seu computador usando a mesma conta.',
    },
    {
      q: 'Se eu trocar de celular ou perder o aparelho, perco minhas vendas?',
      a: 'Não. Todos os seus produtos, clientes, vendas e saldos de fiado ficam salvos com segurança na nuvem. Basta entrar com seu e-mail ou conta Google em outro aparelho.',
    },
  ];

  // Interactive Hero Simulator actions
  const handleSimAddItem = (name: string, price: number) => {
    setSimReceiptSent(false);
    setSimItems((prev) => [...prev, { name, price }]);
    setSimTotal((prev) => prev + price);
  };

  const handleSimReset = () => {
    setSimItems([]);
    setSimTotal(0);
    setSimReceiptSent(false);
  };

  const handleSelectPlanAndProceed = (planId: PlanId) => {
    setSelectedPlan(planId);
    setMode('register');
    setErrorMessage(null);
    setPageView('auth');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGoToLoginDirect = () => {
    setMode('login');
    setErrorMessage(null);
    setPageView('auth');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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

    const planData = plansConfig[selectedPlan];

    const res = registerUser({
      name: regName,
      email: regEmail,
      phone: regPhone,
      password: regPassword,
      businessName: `Vendas de ${regName.split(' ')[0] || 'Rua'}`,
      planPrice: planData.priceNumber,
      selectedPlan,
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

      let userAccount = await getUserProfileFirestore(fbUser.uid);

      if (!userAccount) {
        const localUsers = getRegisteredUsers();
        const existingLocal = localUsers.find((u) => u.email.toLowerCase() === cleanEmail);

        const now = new Date();
        const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const planData = plansConfig[selectedPlan];

        userAccount = {
          id: fbUser.uid,
          name: cleanName,
          email: cleanEmail,
          phone: fbUser.phoneNumber || existingLocal?.phone || '',
          businessName: existingLocal?.businessName || `Vendas de ${cleanName.split(' ')[0]}`,
          createdAt: existingLocal?.createdAt || now.toISOString(),
          trialEndsAt: existingLocal?.trialEndsAt || sevenDaysLater.toISOString(),
          subscriptionStatus: existingLocal?.subscriptionStatus || 'trial',
          planPrice: planData.priceNumber,
          selectedPlan,
        };

        await saveUserProfileFirestore(userAccount);
      }

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
      } else if (err.code === 'auth/popup-blocked') {
        setErrorMessage('A janela de login com o Google foi bloqueada pelo navegador. Permita pop-ups para entrar.');
      } else {
        setErrorMessage(err.message || 'Falha ao autenticar com o Google. Tente novamente.');
      }
    }
  };

  // =========================================================================
  // VIEW 1: LANDING PAGE DINÂMICA (APRESENTAÇÃO, SIMULADOR, IMAGENS E PLANOS)
  // =========================================================================
  if (pageView === 'landing') {
    const activeTour = tourSections[activeTourTab];
    const monthlyVolume = dailySalesEstimate * 26;
    const planCostPercent = ((15.97 / monthlyVolume) * 100).toFixed(2).replace('.', ',');

    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-emerald-600 selection:text-white">
        
        {/* Clean 3-Zone Header */}
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 py-3">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-8">
            {/* Zone 1: Brand Wordmark */}
            <a
              href="#"
              className="flex items-center gap-2.5 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-emerald-600 rounded-lg"
            >
              <div className="h-8 w-8 rounded-lg bg-slate-950 overflow-hidden flex items-center justify-center shrink-0">
                <img
                  src="/assets/aistudio/WhatsApp_Image_2026-10-19_at_16.38.36_cfc68798.jpeg"
                  alt="Vende.ai"
                  className="h-7 w-7 object-contain"
                />
              </div>
              <span className="font-display text-lg font-extrabold tracking-tight text-slate-900">
                Vende.ai
              </span>
            </a>

            {/* Zone 2: Concise Navigation Links */}
            <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
              <a href="#sistema" className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
                O Sistema
              </a>
              <a href="#simulador" className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
                Economia
              </a>
              <a href="#planos" className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
                Planos
              </a>
              <a href="#duvidas" className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
                Dúvidas
              </a>
            </nav>

            {/* Zone 3: Primary Action */}
            <div className="flex items-center shrink-0">
              <button
                type="button"
                onClick={handleGoToLoginDirect}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 touch-press"
              >
                <span>Entrar</span>
                <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
              </button>
            </div>
          </div>
        </header>

        {/* 1. HERO SECTION — Editorial Split Layout */}
        <section className="pt-10 pb-14 sm:pt-16 sm:pb-20 px-4 sm:px-8 bg-white border-b border-slate-200">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            
            {/* Left Copy Column */}
            <div className="lg:col-span-6 space-y-6 text-left">
              <div className="text-xs sm:text-sm font-semibold text-emerald-700 tracking-tight">
                Feito para vendas na rua · Barracas · Feiras · Balcão
              </div>

              <h1 className="font-display text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.12] text-balance">
                Controle suas vendas, seu Pix e seu fiado sem caderno de papel.
              </h1>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
                Um caixa completo no seu celular ou computador. Registre vendas em segundos, envie recibos no WhatsApp com sua Chave Pix e descubra seu lucro limpo no fim do dia.
              </p>

              {/* Primary CTA + Secondary Link */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => handleSelectPlanAndProceed('trial')}
                  className="min-h-[50px] px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-sm transition-colors touch-press whitespace-nowrap"
                >
                  <span>Começar 7 Dias Grátis</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <a
                  href="#planos"
                  className="min-h-[50px] px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm flex items-center justify-center transition-colors whitespace-nowrap"
                >
                  Ver planos a partir de R$ 15,97
                </a>
              </div>

              {/* Clean Unboxed Trust Line */}
              <div className="pt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-slate-500 font-medium">
                <span>7 dias sem cartão</span>
                <span aria-hidden="true">·</span>
                <span>Funciona mesmo offline</span>
                <span aria-hidden="true">·</span>
                <span>Salvo em nuvem</span>
              </div>
            </div>

            {/* Right Interactive Showcase Column */}
            <div className="lg:col-span-6 space-y-3">
              {/* Interactive Toggle: Foto Real vs Simulador Ao Vivo */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-500">
                  {heroMode === 'photo' ? 'Vendedores reais usando no dia a dia' : 'Experimente registrar uma venda aqui:'}
                </span>
                <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setHeroMode('photo')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                      heroMode === 'photo'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Na Rua
                  </button>
                  <button
                    type="button"
                    onClick={() => setHeroMode('simulator')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 whitespace-nowrap ${
                      heroMode === 'simulator'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    <span>Testar PDV</span>
                  </button>
                </div>
              </div>

              {/* Content Frame */}
              {heroMode === 'photo' ? (
                <div className="relative rounded-3xl overflow-hidden border border-slate-200 shadow-lg bg-slate-100 animate-reveal">
                  <img
                    src={vendorHeroImg}
                    alt="Vendedora de pastel na feira usando o aplicativo Vende.ai no celular"
                    className="w-full aspect-[4/3] object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/85 via-slate-950/40 to-transparent p-5 text-white flex items-end justify-between gap-4">
                    <div>
                      <div className="text-sm font-bold">Feito para o ritmo da rua</div>
                      <div className="text-xs text-slate-200">
                        Interface simples com números grandes para usar sob o sol ou em movimento.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setHeroMode('simulator')}
                      className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shrink-0 transition-colors whitespace-nowrap"
                    >
                      Simular venda
                    </button>
                  </div>
                </div>
              ) : (
                /* Interactive Live Mini-PDV Simulator */
                <div className="rounded-3xl border border-slate-200 bg-slate-900 text-white p-5 sm:p-6 shadow-lg space-y-4 animate-reveal">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <div className="text-xs text-slate-400 font-medium">Simulador Interativo Vende.ai</div>
                      <div className="text-3xl font-extrabold font-mono-numbers text-emerald-400 tabular-nums mt-0.5">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(simTotal)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleSimReset}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Limpar</span>
                    </button>
                  </div>

                  {/* Quick Tap Products */}
                  <div>
                    <div className="text-xs text-slate-400 mb-2">Toque para adicionar itens ao pedido:</div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { name: 'Pastel Especial', price: 8 },
                        { name: 'Caldo de Cana', price: 6 },
                        { name: 'Água Mineral', price: 4 },
                      ].map((item) => (
                        <button
                          key={item.name}
                          type="button"
                          onClick={() => handleSimAddItem(item.name, item.price)}
                          className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-left transition-all touch-press"
                        >
                          <div className="text-xs font-bold text-white truncate">{item.name}</div>
                          <div className="text-xs font-bold text-emerald-400 tabular-nums mt-0.5 flex items-center justify-between">
                            <span>+ R$ {item.price},00</span>
                            <Plus className="w-3 h-3" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Cart preview + Payment */}
                  <div className="bg-slate-950 rounded-2xl p-3.5 border border-slate-800 space-y-2.5">
                    <div className="text-xs text-slate-400 flex items-center justify-between">
                      <span>Itens no pedido ({simItems.length})</span>
                      <div className="inline-flex gap-1">
                        {(['Pix', 'Dinheiro'] as const).map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setSimPayment(m)}
                            className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-colors ${
                              simPayment === m
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="text-xs text-slate-200 truncate">
                      {simItems.length === 0
                        ? 'Nenhum item selecionado ainda.'
                        : simItems.map((i) => i.name).join(' · ')}
                    </div>

                    {simReceiptSent ? (
                      <div className="p-2.5 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-xs text-emerald-300 flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 font-semibold">
                          <Check className="w-4 h-4 text-emerald-400" />
                          Comprovante de R$ {simTotal.toFixed(2).replace('.', ',')} ({simPayment}) pronto para WhatsApp!
                        </span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={simTotal <= 0}
                        onClick={() => setSimReceiptSent(true)}
                        className="w-full min-h-[42px] rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Receipt className="w-4 h-4" />
                        <span>Simular Finalizar Venda</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>
        </section>

        {/* 2. INTERACTIVE SYSTEM TOUR SECTION (#sistema) */}
        <section id="sistema" className="py-14 sm:py-20 px-4 sm:px-8">
          <div className="max-w-6xl mx-auto space-y-10">
            
            <div className="max-w-2xl space-y-2">
              <div className="text-xs sm:text-sm font-bold text-emerald-700">
                Conheça o aplicativo por dentro
              </div>
              <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight text-balance">
                Tudo o que você precisa para vender e lucrar mais, em três telas simples.
              </h2>
            </div>

            {/* Interactive Tab Switcher */}
            <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-200/70 rounded-2xl w-full sm:w-fit">
              {(Object.keys(tourSections) as TourTabId[]).map((tabId) => {
                const t = tourSections[tabId];
                const isActive = activeTourTab === tabId;

                return (
                  <button
                    key={tabId}
                    type="button"
                    onClick={() => setActiveTourTab(tabId)}
                    className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {t.tabLabel}
                  </button>
                );
              })}
            </div>

            {/* Dynamic Tour Content Area */}
            <div
              key={activeTour.id}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center bg-white border border-slate-200 rounded-3xl p-5 sm:p-8 shadow-xs animate-reveal"
            >
              {/* Mockup Image */}
              <div className="lg:col-span-7">
                <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
                  <img
                    src={activeTour.image}
                    alt={activeTour.imageAlt}
                    className="w-full aspect-[16/9] object-cover"
                    loading="lazy"
                  />
                </div>
              </div>

              {/* Description & Highlights */}
              <div className="lg:col-span-5 space-y-5 text-left">
                <div className="space-y-2">
                  <div className="text-xs font-bold text-emerald-700">{activeTour.eyebrow}</div>
                  <h3 className="font-display text-xl sm:text-2xl font-extrabold text-slate-900 leading-snug">
                    {activeTour.title}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{activeTour.description}</p>
                </div>

                <ul className="space-y-2.5 pt-2 border-t border-slate-100 text-xs sm:text-sm text-slate-700">
                  {activeTour.highlights.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => handleSelectPlanAndProceed('trial')}
                    className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold inline-flex items-center gap-2 transition-colors touch-press"
                  >
                    <span>Testar esta função grátis</span>
                    <ArrowRight className="w-4 h-4 text-emerald-400" />
                  </button>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* 3. INTERACTIVE PROFIT & VALUE CALCULATOR (#simulador) */}
        <section id="simulador" className="py-12 sm:py-16 px-4 sm:px-8 bg-slate-900 text-white">
          <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            <div className="lg:col-span-7 space-y-4">
              <div className="text-xs sm:text-sm font-bold text-emerald-400">
                Custo-benefício na ponta do lápis
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-balance">
                Menos que um cafezinho por semana para nunca mais perder um fiado.
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed max-w-xl">
                Arraste a barra ao lado para ver quanto você movimenta por mês e como o investimento mensal de R$ 15,97 representa praticamente zero perto do seu faturamento.
              </p>

              {/* Interactive Range Control */}
              <div className="pt-3 space-y-2.5 max-w-md">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-slate-300 font-medium">Quanto você vende em média por dia?</span>
                  <span className="font-extrabold text-emerald-400 font-mono-numbers tabular-nums">
                    R$ {dailySalesEstimate},00 / dia
                  </span>
                </div>
                <input
                  type="range"
                  min={100}
                  max={1500}
                  step={50}
                  value={dailySalesEstimate}
                  onChange={(e) => setDailySalesEstimate(Number(e.target.value))}
                  aria-label="Média de vendas por dia"
                  className="w-full accent-emerald-500 cursor-pointer h-2 rounded-lg bg-slate-800"
                />
                <div className="flex justify-between text-[11px] text-slate-500 font-mono-numbers">
                  <span>R$ 100/dia</span>
                  <span>R$ 800/dia</span>
                  <span>R$ 1.500/dia</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-4">
              <div className="space-y-1">
                <div className="text-xs text-slate-400 font-medium">Faturamento estimado em 26 dias de trabalho</div>
                <div className="text-3xl sm:text-4xl font-black text-white font-mono-numbers tabular-nums">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(monthlyVolume)}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="text-slate-400">Valor do Vende.ai Pro</div>
                  <div className="text-base font-extrabold text-emerald-400 font-mono-numbers tabular-nums mt-0.5">
                    R$ 15,97 / mês
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Peso no seu faturamento</div>
                  <div className="text-base font-extrabold text-white font-mono-numbers tabular-nums mt-0.5">
                    Apenas {planCostPercent}%
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* 4. PRICING / PLAN SELECTION SECTION (#planos) */}
        <section id="planos" className="py-14 sm:py-20 px-4 sm:px-8 bg-white border-b border-slate-200">
          <div className="max-w-6xl mx-auto space-y-10">
            
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <div className="text-xs sm:text-sm font-bold text-emerald-700">
                Escolha seu plano para continuar
              </div>
              <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight text-balance">
                Escolha o plano ideal antes de criar sua conta
              </h2>
              <p className="text-sm sm:text-base text-slate-600">
                Todos os planos incluem 7 dias iniciais para você testar no trabalho real antes de pagar qualquer valor.
              </p>
            </div>

            {/* 3-Column Plan Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
              {(Object.keys(plansConfig) as PlanId[]).map((pId) => {
                const plan = plansConfig[pId];
                const isPro = plan.highlight;

                return (
                  <div
                    key={pId}
                    className={`rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition-all ${
                      isPro
                        ? 'bg-slate-900 text-white border border-slate-800 shadow-xl'
                        : 'bg-slate-50 text-slate-900 border border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-5">
                      <div className="space-y-1.5">
                        <div className={`text-xs font-bold ${isPro ? 'text-emerald-400' : 'text-emerald-700'}`}>
                          {plan.kicker}
                        </div>
                        <h3 className="font-display text-xl font-extrabold">{plan.name}</h3>
                        <p className={`text-xs leading-relaxed ${isPro ? 'text-slate-300' : 'text-slate-600'}`}>
                          {plan.description}
                        </p>
                      </div>

                      <div className={`py-4 border-y ${isPro ? 'border-slate-800' : 'border-slate-200'}`}>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-3xl sm:text-4xl font-black font-mono-numbers tabular-nums">
                            {plan.priceStr}
                          </span>
                          <span className={`text-xs font-semibold ${isPro ? 'text-slate-400' : 'text-slate-500'}`}>
                            {plan.period}
                          </span>
                        </div>
                      </div>

                      <ul className={`space-y-2.5 text-xs sm:text-sm ${isPro ? 'text-slate-200' : 'text-slate-700'}`}>
                        {plan.features.map((feat, idx) => (
                          <li key={idx} className="flex items-start gap-2.5">
                            <Check className={`w-4 h-4 shrink-0 mt-0.5 ${isPro ? 'text-emerald-400' : 'text-emerald-600'}`} />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSelectPlanAndProceed(pId)}
                      className={`w-full min-h-[48px] rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors mt-7 touch-press ${
                        isPro
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                          : 'bg-slate-900 hover:bg-slate-800 text-white'
                      }`}
                    >
                      <span>{plan.buttonLabel}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Already have account callout */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200">
              <div className="text-center sm:text-left">
                <div className="text-sm font-bold text-slate-900">Já possui cadastro no Vende.ai?</div>
                <div className="text-xs text-slate-500">
                  Acesse sua conta para ver suas vendas de hoje, produtos e clientes salvos.
                </div>
              </div>
              <button
                type="button"
                onClick={handleGoToLoginDirect}
                className="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 border border-slate-300 font-bold text-xs sm:text-sm flex items-center gap-2 transition-colors shrink-0"
              >
                <span>Fazer Login Agora</span>
                <ArrowRight className="w-4 h-4 text-emerald-600" />
              </button>
            </div>

          </div>
        </section>

        {/* 5. INTERACTIVE FAQ ACCORDION (#duvidas) */}
        <section id="duvidas" className="py-14 sm:py-16 px-4 sm:px-8">
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Dúvidas Frequentes
              </h2>
              <p className="text-sm text-slate-600">
                Respostas rápidas sobre o funcionamento do Vende.ai no dia a dia.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl divide-y divide-slate-200 overflow-hidden">
              {faqs.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div key={idx}>
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      aria-expanded={isOpen}
                      className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
                    >
                      <span className="text-sm font-bold text-slate-900">{faq.q}</span>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-200 ${
                          isOpen ? 'rotate-180 text-emerald-600' : ''
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-4 text-xs sm:text-sm text-slate-600 leading-relaxed animate-reveal">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Quiet Footer */}
        <footer className="mt-auto py-8 border-t border-slate-200 bg-white px-4 sm:px-8">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-slate-900">Vende.ai</span>
              <span aria-hidden="true">·</span>
              <span>Sistema de Vendas e Caixa</span>
            </div>
            <div className="flex items-center gap-5">
              <a href="#sistema" className="hover:text-slate-900 transition-colors">
                O Sistema
              </a>
              <a href="#planos" className="hover:text-slate-900 transition-colors">
                Planos
              </a>
              <button
                type="button"
                onClick={handleGoToLoginDirect}
                className="hover:text-emerald-700 font-semibold transition-colors"
              >
                Acessar Conta
              </button>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: AUTH SCREEN (LOGIN & CADASTRO COM PLANO ESCOLHIDO)
  // =========================================================================
  const activePlanInfo = plansConfig[selectedPlan];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center px-4 py-8">
      <div className="w-full max-w-sm mx-auto space-y-4 animate-reveal">
        
        {/* Back to plans button */}
        <div>
          <button
            type="button"
            onClick={() => setPageView('landing')}
            className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1.5 transition-colors font-semibold py-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar para a apresentação e planos</span>
          </button>
        </div>

        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="max-w-[170px] mx-auto rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 p-2.5 shadow-sm">
            <img
              src="/assets/aistudio/WhatsApp_Image_2026-10-19_at_16.38.36_cfc68798.jpeg"
              alt="Vende.ai Logo"
              className="w-full h-auto object-contain mx-auto"
            />
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Gestão de vendas, caixa e clientes com nuvem segura
          </p>
        </div>

        {/* Selected Plan Banner (no modo cadastro) */}
        {mode === 'register' && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <Check className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="font-extrabold text-slate-900 block truncate">{activePlanInfo.name}</span>
                <span className="text-[11px] text-emerald-800 font-semibold font-mono-numbers">
                  {activePlanInfo.priceStr} {activePlanInfo.period}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setPageView('landing')}
              className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 hover:underline shrink-0"
            >
              Alterar
            </button>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Clean Auth Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
          
          {/* Mode Switcher: Login vs Cadastro */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMessage(null);
              }}
              className={`py-2 text-xs font-bold rounded-xl transition-all ${
                mode === 'login'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Fazer Login
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMessage(null);
              }}
              className={`py-2 text-xs font-bold rounded-xl transition-all ${
                mode === 'register'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Criar Conta
            </button>
          </div>

          {/* 1. Botão Oficial: Login com o Google */}
          <button
            type="button"
            onClick={handleGoogleRealLogin}
            disabled={isLoading}
            className="w-full min-h-[46px] rounded-2xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold text-xs flex items-center justify-center gap-2.5 shadow-xs touch-press transition-colors disabled:opacity-50"
          >
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

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="w-full border-t border-slate-200" />
            <span className="bg-white px-2.5 text-[11px] text-slate-400 font-medium">
              ou com e-mail e senha
            </span>
          </div>

          {/* Modo Login */}
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
                    placeholder="seuemail@gmail.com ou DDD"
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
                className="w-full min-h-[46px] rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-xs touch-press transition-colors tracking-wide mt-2"
              >
                <span>{isLoading ? 'ENTRANDO...' : 'ENTRAR NA CONTA'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          ) : (
            /* Modo Cadastro */
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Seu Nome Completo
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
                className="w-full min-h-[46px] rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-xs touch-press transition-colors tracking-wide mt-2"
              >
                <span>{isLoading ? 'CRIANDO CONTA...' : 'CRIAR CONTA E COMEÇAR'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          )}

        </div>

        {/* Security guarantee note */}
        <div className="text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5 pt-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Seus dados ficam protegidos com criptografia</span>
        </div>

      </div>
    </div>
  );
};
