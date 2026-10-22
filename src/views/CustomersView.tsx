import React, { useState, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Search,
  MessageCircle,
  Phone,
  DollarSign,
  Calendar,
  AlertTriangle,
  CheckCircle,
  MapPin,
  ChevronRight,
  ChevronDown,
  History,
  X,
  Plus,
  BookUser,
  ShoppingBag,
  Trash2,
  Edit2,
} from 'lucide-react';
import { Customer, CustomerDebt, BusinessSettings, Sale } from '../types';
import { formatCurrency, formatDateOnlyBR, generateWhatsAppDebtReminder } from '../utils/receipt';

interface CustomersViewProps {
  customers: Customer[];
  debts: CustomerDebt[];
  sales: Sale[];
  settings: BusinessSettings;
  onSaveCustomer: (customer: Customer) => void;
  onDeleteCustomer: (id: string) => void;
  onOpenPaymentModal: (debt: CustomerDebt) => void;
  onSaveDebt: (debt: CustomerDebt) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  debts,
  sales,
  settings,
  onSaveCustomer,
  onDeleteCustomer,
  onOpenPaymentModal,
  onSaveDebt,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'debts' | 'clear'>('all');
  const [lastSaleFilter, setLastSaleFilter] = useState<'all' | 'today' | '7days' | '30days' | 'inactive' | 'custom'>('all');
  const [customLastSaleDate, setCustomLastSaleDate] = useState<string>('');
  const [isNewCustomerOpen, setIsNewCustomerOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formSpot, setFormSpot] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formInitialDebt, setFormInitialDebt] = useState('');
  const [formDueDate, setFormDueDate] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];

  // Merge customer data with sales and debts
  const clientList = useMemo(() => {
    // Collect all unique clients
    const map = new Map<string, {
      customer: Customer;
      debt?: CustomerDebt;
      clientSales: Sale[];
      totalSpent: number;
      lastSaleDate: string | null;
      lastSale: Sale | null;
    }>();

    // 1. Add all customers
    customers.forEach((c) => {
      const normKey = (c.name || '').trim().toLowerCase();
      const matchedDebt = debts.find(
        (d) => d.name.trim().toLowerCase() === normKey || (c.phone && d.phone && d.phone.replace(/\D/g, '') === c.phone.replace(/\D/g, ''))
      );
      const clientSales = sales
        .filter(
          (s) => (s.customerName && s.customerName.trim().toLowerCase() === normKey) ||
                 (c.phone && s.customerPhone && s.customerPhone.replace(/\D/g, '') === c.phone.replace(/\D/g, ''))
        )
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      const totalSpent = clientSales.reduce((acc, s) => acc + s.totalAmount, 0);
      const lastSale = clientSales.length > 0 ? clientSales[0] : null;
      const lastSaleDate = lastSale
        ? lastSale.date.split('T')[0]
        : (matchedDebt?.lastPurchaseDate ? matchedDebt.lastPurchaseDate.split('T')[0] : null);

      map.set(c.id, {
        customer: c,
        debt: matchedDebt,
        clientSales,
        totalSpent,
        lastSaleDate,
        lastSale,
      });
    });

    // 2. Also ensure any debt customer not in map is added
    debts.forEach((d) => {
      const alreadyInMap = Array.from(map.values()).some(
        (item) => item.customer.name.trim().toLowerCase() === d.name.trim().toLowerCase() ||
                  (d.phone && item.customer.phone && item.customer.phone.replace(/\D/g, '') === d.phone.replace(/\D/g, ''))
      );

      if (!alreadyInMap) {
        const tempCust: Customer = {
          id: `cust_${d.id}`,
          name: d.name,
          phone: d.phone,
          addressOrSpot: d.addressOrSpot,
          createdAt: d.lastPurchaseDate || new Date().toISOString(),
        };
        const clientSales = sales
          .filter(
            (s) => s.customerName && s.customerName.trim().toLowerCase() === d.name.trim().toLowerCase()
          )
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const totalSpent = clientSales.reduce((acc, s) => acc + s.totalAmount, 0);
        const lastSale = clientSales.length > 0 ? clientSales[0] : null;
        const lastSaleDate = lastSale
          ? lastSale.date.split('T')[0]
          : (d.lastPurchaseDate ? d.lastPurchaseDate.split('T')[0] : null);

        map.set(tempCust.id, {
          customer: tempCust,
          debt: d,
          clientSales,
          totalSpent,
          lastSaleDate,
          lastSale,
        });
      }
    });

    return Array.from(map.values());
  }, [customers, debts, sales]);

  // Totals
  const totalClientsCount = clientList.length;
  const clientsWithDebts = clientList.filter((item) => (item.debt?.totalOwed || 0) > 0);
  const totalDebtsAmount = clientsWithDebts.reduce((acc, item) => acc + (item.debt?.totalOwed || 0), 0);

  // Filtered clients
  const filteredClients = useMemo(() => {
    return clientList.filter((item) => {
      const term = searchTerm.toLowerCase().trim();
      const matchSearch =
        !term ||
        item.customer.name.toLowerCase().includes(term) ||
        item.customer.phone.replace(/\D/g, '').includes(term.replace(/\D/g, '')) ||
        (item.customer.addressOrSpot && item.customer.addressOrSpot.toLowerCase().includes(term));

      if (!matchSearch) return false;

      const hasDebt = (item.debt?.totalOwed || 0) > 0;
      if (activeFilter === 'debts' && !hasDebt) return false;
      if (activeFilter === 'clear' && hasDebt) return false;

      // Filter by last sale date
      if (lastSaleFilter === 'today') {
        if (item.lastSaleDate !== todayStr) return false;
      } else if (lastSaleFilter === '7days') {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        if (!item.lastSaleDate || item.lastSaleDate < sevenDaysAgo || item.lastSaleDate > todayStr) return false;
      } else if (lastSaleFilter === '30days') {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        if (!item.lastSaleDate || item.lastSaleDate < thirtyDaysAgo || item.lastSaleDate > todayStr) return false;
      } else if (lastSaleFilter === 'inactive') {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        if (item.lastSaleDate && item.lastSaleDate >= thirtyDaysAgo) return false;
      } else if (lastSaleFilter === 'custom') {
        if (!customLastSaleDate || item.lastSaleDate !== customLastSaleDate) return false;
      }

      return true;
    });
  }, [clientList, searchTerm, activeFilter, lastSaleFilter, customLastSaleDate, todayStr]);

  const handleOpenWhatsApp = (customer: Customer, debt?: CustomerDebt) => {
    let cleanPhone = customer.phone.replace(/\D/g, '');
    if (cleanPhone.length >= 10 && !cleanPhone.startsWith('55')) {
      cleanPhone = `55${cleanPhone}`;
    }

    let message = '';
    if (debt && debt.totalOwed > 0) {
      // Send polite debt reminder
      message = generateWhatsAppDebtReminder(debt, settings);
    } else {
      // Friendly customer check-in message
      message = `Olá ${customer.name}! Tudo bem?\nAqui é o ${settings.sellerName || 'Vendedor'} da ${settings.businessName || 'nossa loja'}. Passando para agradecer sua preferência! Sempre que precisar de algo, só me chamar por aqui. Boas vendas e um ótimo dia!`;
    }

    const url = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleOpenCall = (phoneStr: string) => {
    const cleanPhone = phoneStr.replace(/\D/g, '');
    if (cleanPhone) {
      window.location.href = `tel:${cleanPhone}`;
    }
  };

  const handleSaveCustomerForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const customerId = editingCustomer ? editingCustomer.id : `cust_${Date.now()}`;
    const newCustomer: Customer = {
      id: customerId,
      name: formName.trim(),
      phone: formPhone.trim(),
      addressOrSpot: formSpot.trim() || undefined,
      notes: formNotes.trim() || undefined,
      createdAt: editingCustomer ? editingCustomer.createdAt : new Date().toISOString(),
    };

    onSaveCustomer(newCustomer);

    // If an initial debt amount was entered
    const initialDebtVal = parseFloat(formInitialDebt.replace(',', '.'));
    if (initialDebtVal && initialDebtVal > 0) {
      const newDebt: CustomerDebt = {
        id: `debt_${Date.now()}`,
        name: newCustomer.name,
        phone: newCustomer.phone,
        addressOrSpot: newCustomer.addressOrSpot,
        totalOwed: initialDebtVal,
        lastPurchaseDate: new Date().toISOString(),
        dueDate: formDueDate || undefined,
        history: [
          {
            id: `hist_${Date.now()}`,
            date: new Date().toISOString(),
            type: 'compra',
            amount: initialDebtVal,
            notes: formNotes || 'Cadastro inicial a prazo',
          },
        ],
      };
      onSaveDebt(newDebt);
    }

    // Reset and close
    setEditingCustomer(null);
    setIsNewCustomerOpen(false);
    setFormName('');
    setFormPhone('');
    setFormSpot('');
    setFormNotes('');
    setFormInitialDebt('');
    setFormDueDate('');
  };

  const handleStartEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormName(customer.name);
    setFormPhone(customer.phone);
    setFormSpot(customer.addressOrSpot || '');
    setFormNotes(customer.notes || '');
    setFormInitialDebt('');
    setFormDueDate('');
    setIsNewCustomerOpen(true);
  };

  const getDueStatus = (dueDate?: string) => {
    if (!dueDate) return { label: 'Sem data limite', color: 'text-slate-500', isOverdue: false };
    if (dueDate < todayStr) {
      return { label: 'Vencido!', color: 'text-rose-600 font-bold', isOverdue: true };
    }
    if (dueDate === todayStr) {
      return { label: 'Vence Hoje!', color: 'text-amber-600 font-bold', isOverdue: false };
    }
    return { label: `Vence ${formatDateOnlyBR(dueDate)}`, color: 'text-slate-500', isOverdue: false };
  };

  return (
    <div className="space-y-4 pb-28">
      {/* 1. Metric Header Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Cadastro de Clientes
            </span>
          </div>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
            {totalClientsCount} clientes
          </span>
        </div>

        {/* Big Numbers */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div>
            <div className="text-xs text-slate-500 font-medium">Cadastrados</div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono-numbers">
              {totalClientsCount}
            </div>
          </div>

          <div className="border-l border-slate-100 pl-3">
            <div className="text-xs text-amber-700 font-medium">A Receber (A Prazo)</div>
            <div className="text-2xl sm:text-3xl font-black text-amber-700 font-mono-numbers">
              {formatCurrency(totalDebtsAmount)}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Action: Cadastrar Novo Cliente */}
      <button
        type="button"
        onClick={() => {
          setEditingCustomer(null);
          setFormName('');
          setFormPhone('');
          setFormSpot('');
          setFormNotes('');
          setFormInitialDebt('');
          setFormDueDate('');
          setIsNewCustomerOpen(true);
        }}
        className="w-full min-h-[50px] rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-xs touch-press transition-colors"
      >
        <UserPlus className="w-4 h-4" />
        <span>CADASTRAR NOVO CLIENTE</span>
      </button>

      {/* 3. Search and Filter Chips */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome, telefone ou local..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 shadow-xs"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors ${
              activeFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Todos ({clientList.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('debts')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors ${
              activeFilter === 'debts'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-amber-700 border border-amber-200 hover:bg-amber-50'
            }`}
          >
            A Prazo / Devedores ({clientsWithDebts.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('clear')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors ${
              activeFilter === 'clear'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
            }`}
          >
            Em Dia ({clientList.length - clientsWithDebts.length})
          </button>
        </div>

        {/* Filter by Last Sale Date */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-2.5 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 px-1">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              <span>Filtrar por Data da Última Venda:</span>
            </span>
            {lastSaleFilter !== 'all' && (
              <button
                type="button"
                onClick={() => {
                  setLastSaleFilter('all');
                  setCustomLastSaleDate('');
                }}
                className="text-emerald-700 hover:text-emerald-800 font-semibold text-[10px]"
              >
                Limpar filtro
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {[
              { id: 'all', label: 'Todas as datas' },
              { id: 'today', label: 'Comprou Hoje' },
              { id: '7days', label: 'Últimos 7 dias' },
              { id: '30days', label: 'Últimos 30 dias' },
              { id: 'inactive', label: '+30 dias sem compras' },
              { id: 'custom', label: 'Data Específica' },
            ].map((f) => (
              <button
                key={`lsf-${f.id}`}
                type="button"
                onClick={() => setLastSaleFilter(f.id as any)}
                className={`px-2.5 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors touch-press ${
                  lastSaleFilter === f.id
                    ? 'bg-emerald-600 text-white font-bold shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {lastSaleFilter === 'custom' && (
            <div className="pt-1 flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium shrink-0">Selecione a data:</span>
              <input
                type="date"
                value={customLastSaleDate}
                onChange={(e) => setCustomLastSaleDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-medium focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* 4. Client Cards List */}
      <div className="space-y-3">
        {filteredClients.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-2">
            <Users className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-800">Nenhum cliente encontrado</h4>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              {searchTerm
                ? 'Tente buscar com outro nome ou número de telefone.'
                : 'Cadastre seus clientes ou realize uma venda para registrar os dados e contatos de WhatsApp.'}
            </p>
          </div>
        ) : (
          filteredClients.map((item) => {
            const { customer, debt, clientSales, totalSpent } = item;
            const hasDebt = debt && debt.totalOwed > 0;
            const dueStatus = getDueStatus(debt?.dueDate);
            const isExpanded = expandedCustomerId === customer.id;

            return (
              <div
                key={customer.id}
                className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3 transition-all"
              >
                {/* Header row: Name, Avatar, Edit */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 font-extrabold flex items-center justify-center shrink-0 text-sm">
                      {customer.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-slate-900 text-sm truncate">
                          {customer.name}
                        </h4>
                        {hasDebt && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold">
                            A Prazo
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mt-0.5">
                        {customer.phone ? (
                          <span>{customer.phone}</span>
                        ) : (
                          <span className="text-slate-400 italic">Sem telefone</span>
                        )}
                        {customer.addressOrSpot && (
                          <>
                            <span>·</span>
                            <span className="truncate flex items-center gap-0.5 text-slate-600">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {customer.addressOrSpot}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Edit action */}
                  <button
                    type="button"
                    onClick={() => handleStartEdit(customer)}
                    title="Editar Cliente"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Last purchase date display */}
                <div className="flex items-center justify-between text-xs bg-slate-50/70 border border-slate-100 px-3 py-1.5 rounded-xl">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Última Compra:</span>
                  </span>
                  {item.lastSaleDate ? (
                    <span className={`text-xs font-bold font-mono-numbers ${
                      item.lastSaleDate === todayStr ? 'text-emerald-700 font-black' : 'text-slate-700'
                    }`}>
                      {item.lastSaleDate === todayStr ? 'Hoje' : formatDateOnlyBR(item.lastSaleDate)}
                      {item.lastSale ? ` · ${formatCurrency(item.lastSale.totalAmount)}` : ''}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 italic">
                      Nenhuma compra registrada
                    </span>
                  )}
                </div>

                {/* Financial Summary Box */}
                <div className="grid grid-cols-2 gap-2 bg-slate-50/70 border border-slate-100 rounded-xl p-2.5 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Total em Compras:</span>
                    <span className="font-bold text-slate-800 font-mono-numbers">
                      {formatCurrency(totalSpent)} ({clientSales.length} compras)
                    </span>
                  </div>

                  <div className="border-l border-slate-200 pl-2.5">
                    <span className="text-slate-500 block text-[11px]">Saldo A Prazo:</span>
                    {hasDebt ? (
                      <span className="font-black text-amber-700 font-mono-numbers text-sm">
                        {formatCurrency(debt.totalOwed)}
                      </span>
                    ) : (
                      <span className="font-semibold text-emerald-700 flex items-center gap-1 text-xs">
                        <CheckCircle className="w-3 h-3 text-emerald-600 inline" /> Em dia
                      </span>
                    )}
                  </div>
                </div>

                {/* If has debt, show due date alert */}
                {hasDebt && (
                  <div className="flex items-center justify-between text-xs bg-amber-50/60 border border-amber-100 px-3 py-1.5 rounded-xl">
                    <span className="text-amber-900 font-medium flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-amber-600" />
                      Status do prazo:
                    </span>
                    <span className={`text-xs ${dueStatus.color}`}>
                      {dueStatus.label}
                    </span>
                  </div>
                )}

                {/* PRIMARY ACTIONS: WhatsApp button + Call + Pay */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {/* WhatsApp Direct Contact Button */}
                  <button
                    type="button"
                    onClick={() => handleOpenWhatsApp(customer, debt)}
                    className="min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs touch-press transition-colors"
                  >
                    <MessageCircle className="w-4 h-4 fill-white" />
                    <span>{hasDebt ? 'Cobrar WhatsApp' : 'Chamar WhatsApp'}</span>
                  </button>

                  {/* Second Action: Receber Pagamento if debt, or Call */}
                  {hasDebt ? (
                    <button
                      type="button"
                      onClick={() => onOpenPaymentModal(debt)}
                      className="min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs touch-press transition-colors"
                    >
                      <DollarSign className="w-4 h-4" />
                      <span>Receber Pagamento</span>
                    </button>
                  ) : customer.phone ? (
                    <button
                      type="button"
                      onClick={() => handleOpenCall(customer.phone)}
                      className="min-h-[44px] rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-200 transition-colors"
                    >
                      <Phone className="w-4 h-4 text-slate-600" />
                      <span>Ligar</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleStartEdit(customer)}
                      className="min-h-[44px] rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1 border border-slate-200 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Adicionar Telefone</span>
                    </button>
                  )}
                </div>

                {/* Expand / Details Toggle */}
                {(clientSales.length > 0 || (debt && debt.history.length > 0) || customer.notes) && (
                  <div className="pt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setExpandedCustomerId(isExpanded ? null : customer.id)}
                      className="w-full flex items-center justify-between text-[11px] text-slate-500 hover:text-slate-800 py-1 font-medium"
                    >
                      <span>
                        {isExpanded ? 'Ocultar Histórico' : 'Ver Histórico de Compras e Pagamentos'}
                      </span>
                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </button>

                    {isExpanded && (
                      <div className="mt-2 space-y-2 pt-2 border-t border-slate-100 text-xs">
                        {customer.notes && (
                          <div className="bg-amber-50/50 p-2 rounded-lg text-slate-600 text-[11px]">
                            <strong>Obs:</strong> {customer.notes}
                          </div>
                        )}

                        {debt && debt.history.length > 0 && (
                          <div>
                            <div className="text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                              <History className="w-3 h-3 text-amber-600" />
                              <span>Movimentações A Prazo:</span>
                            </div>
                            <div className="space-y-1">
                              {debt.history.slice(0, 4).map((h) => (
                                <div
                                  key={h.id}
                                  className="flex items-center justify-between py-1 px-2 rounded-lg bg-slate-50 text-[11px]"
                                >
                                  <span className="text-slate-600">
                                    {formatDateOnlyBR(h.date.split('T')[0])} · {h.notes || (h.type === 'compra' ? 'Compra' : 'Pagamento')}
                                  </span>
                                  <span
                                    className={`font-black font-mono-numbers ${
                                      h.type === 'pagamento' ? 'text-emerald-700' : 'text-amber-700'
                                    }`}
                                  >
                                    {h.type === 'pagamento' ? '-' : '+'}
                                    {formatCurrency(h.amount)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {clientSales.length > 0 && (
                          <div>
                            <div className="text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                              <ShoppingBag className="w-3 h-3 text-emerald-600" />
                              <span>Últimas Vendas:</span>
                            </div>
                            <div className="space-y-1">
                              {clientSales.slice(0, 3).map((s) => (
                                <div
                                  key={s.id}
                                  className="flex items-center justify-between py-1 px-2 rounded-lg bg-slate-50 text-[11px]"
                                >
                                  <span className="text-slate-600">
                                    {s.code} · {s.items.map((i) => `${i.quantity}x ${i.name}`).join(', ') || 'Venda'}
                                  </span>
                                  <span className="font-bold text-emerald-700 font-mono-numbers">
                                    {formatCurrency(s.totalAmount)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 5. Modal / Drawer para Cadastrar ou Editar Cliente */}
      {isNewCustomerOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl border border-slate-200 p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-extrabold text-slate-900">
                  {editingCustomer ? 'Editar Cliente' : 'Novo Cliente'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewCustomerOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomerForm} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nome do Cliente *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Dona Maria do Pastel"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  WhatsApp / Celular com DDD
                </label>
                <input
                  type="tel"
                  placeholder="Ex: 11999998888"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs focus:outline-none focus:border-emerald-500 font-medium"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Usado para enviar mensagens no WhatsApp com 1 toque.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ponto de Venda / Endereço (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Barraca 14 na Feira / Rua 5"
                  value={formSpot}
                  onChange={(e) => setFormSpot(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              {!editingCustomer && (
                <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-3.5 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                    <BookUser className="w-4 h-4 text-amber-700" />
                    <span>Já tem valor a prazo a anotar? (Opcional)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-amber-800 mb-1">
                        Valor (R$)
                      </label>
                      <input
                        type="text"
                        placeholder="R$ 0,00"
                        value={formInitialDebt}
                        onChange={(e) => setFormInitialDebt(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white text-amber-900 text-xs font-bold font-mono-numbers focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-amber-800 mb-1">
                        Data para pagar
                      </label>
                      <input
                        type="date"
                        value={formDueDate}
                        onChange={(e) => setFormDueDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white text-slate-800 text-xs focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Observações (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Paga sempre nas sextas-feiras..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs focus:outline-none focus:border-emerald-500 resize-none font-medium"
                />
              </div>

              <div className="pt-2 flex items-center justify-between gap-2">
                {editingCustomer && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Excluir ${editingCustomer.name}?`)) {
                        onDeleteCustomer(editingCustomer.id);
                        setIsNewCustomerOpen(false);
                      }
                    }}
                    className="p-2.5 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 text-xs font-bold flex items-center gap-1"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Excluir</span>
                  </button>
                )}

                <div className="flex-1 flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setIsNewCustomerOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-xs transition-colors"
                  >
                    Salvar Cliente
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
