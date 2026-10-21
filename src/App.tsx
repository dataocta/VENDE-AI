import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { BottomNav, TabType } from './components/BottomNav';
import { NumpadSaleModal } from './components/NumpadSaleModal';
import { SaleSuccessModal } from './components/SaleSuccessModal';
import { ExpenseModal } from './components/ExpenseModal';
import { DebtPaymentModal } from './components/DebtPaymentModal';
import { CloseRegisterModal } from './components/CloseRegisterModal';
import { SubscriptionModal } from './components/SubscriptionModal';
import { TrialBanner } from './components/TrialBanner';
import { PosView } from './views/PosView';
import { ExpensesView } from './views/ExpensesView';
import { CashView } from './views/CashView';
import { CustomersView } from './views/CustomersView';
import { ProductsView } from './views/ProductsView';
import { AuthView } from './views/AuthView';
import {
  getProducts,
  saveProduct,
  deleteProduct,
  getSales,
  saveSale,
  cancelSale,
  getExpenses,
  saveExpense,
  deleteExpense,
  getDebts,
  saveCustomerDebt,
  amortizeDebt,
  getCustomers,
  saveCustomer,
  deleteCustomer,
  getDailyRegister,
  saveDailyRegister,
  getSettings,
  saveSettings,
  exportAllDataJSON,
  importAllDataJSON,
  resetUserData,
} from './utils/storage';
import {
  getCurrentUser,
  logoutUser,
  getTrialInfo,
} from './utils/authStorage';
import { Sale, Expense, CustomerDebt, Customer, Product, DailyRegister, BusinessSettings, UserAccount } from './types';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('pos');
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [debts, setDebts] = useState<CustomerDebt[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [settings, setSettings] = useState<BusinessSettings>(getSettings());

  const todayStr = new Date().toISOString().split('T')[0];
  const [register, setRegister] = useState<DailyRegister>(getDailyRegister(todayStr));

  // Modals state
  const [isNumpadOpen, setIsNumpadOpen] = useState(false);
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  const [lastCompletedSale, setLastCompletedSale] = useState<Sale | null>(null);
  const [payingDebt, setPayingDebt] = useState<CustomerDebt | null>(null);
  const [isCloseRegisterOpen, setIsCloseRegisterOpen] = useState(false);
  const [isSubscriptionOpen, setIsSubscriptionOpen] = useState(false);

  // Load user and app data on mount
  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
    refreshAllData(user);
  }, []);

  const refreshAllData = (user?: UserAccount | null) => {
    const uid = user ? user.id : currentUser ? currentUser.id : undefined;
    setProducts(getProducts(uid));
    setSales(getSales(uid));
    setExpenses(getExpenses(uid));
    setDebts(getDebts(uid));
    setCustomers(getCustomers(uid));
    const currentSettings = getSettings(uid);
    if (user) {
      if (user.businessName) {
        currentSettings.businessName = user.businessName;
      }
      if (user.name) {
        currentSettings.sellerName = user.name;
      }
      if (user.phone) {
        currentSettings.phone = user.phone;
        if (!currentSettings.pixKey) {
          currentSettings.pixKey = user.phone;
        }
      }
    }
    setSettings(currentSettings);
    setRegister(getDailyRegister(todayStr, uid));
  };

  const handleAuthSuccess = (user: UserAccount) => {
    setCurrentUser(user);
    // Sync user business name to settings for this specific user
    const updatedSettings: BusinessSettings = {
      ...getSettings(user.id),
      sellerName: user.name,
      businessName: user.businessName,
      phone: user.phone,
      pixKey: user.phone,
    };
    saveSettings(updatedSettings, user.id);
    setSettings(updatedSettings);
    refreshAllData(user);
  };

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
    setProducts([]);
    setSales([]);
    setExpenses([]);
    setDebts([]);
    setCustomers([]);
  };

  // Sale handlers
  const handleCompleteSale = (sale: Sale) => {
    const uid = currentUser?.id;
    const updatedSales = saveSale(sale, uid);
    setSales(updatedSales);
    setProducts(getProducts(uid));
    setDebts(getDebts(uid));
    setCustomers(getCustomers(uid));
    setIsNumpadOpen(false);
    setLastCompletedSale(sale);
  };

  const handleCancelSale = (saleId: string) => {
    const uid = currentUser?.id;
    const updatedSales = cancelSale(saleId, uid);
    setSales(updatedSales);
    setProducts(getProducts(uid));
  };

  // Expense handlers
  const handleSaveExpense = (expense: Expense) => {
    const uid = currentUser?.id;
    const updatedExpenses = saveExpense(expense, uid);
    setExpenses(updatedExpenses);
  };

  const handleDeleteExpense = (id: string) => {
    const uid = currentUser?.id;
    const updatedExpenses = deleteExpense(id, uid);
    setExpenses(updatedExpenses);
  };

  // Debt & Customer handlers
  const handleConfirmDebtPayment = (
    debtId: string,
    amount: number,
    method: 'dinheiro' | 'pix' | 'cartao',
    notes?: string
  ) => {
    const uid = currentUser?.id;
    const res = amortizeDebt(debtId, amount, method, notes, uid);
    setDebts(res.debts);
    setSales(getSales(uid));
    setCustomers(getCustomers(uid));
  };

  const handleSaveDebt = (debt: CustomerDebt) => {
    const uid = currentUser?.id;
    const updated = saveCustomerDebt(debt, uid);
    setDebts(updated);
    setCustomers(getCustomers(uid));
  };

  const handleSaveCustomer = (customer: Customer) => {
    const uid = currentUser?.id;
    const updated = saveCustomer(customer, uid);
    setCustomers(updated);
  };

  const handleDeleteCustomer = (id: string) => {
    const uid = currentUser?.id;
    const updated = deleteCustomer(id, uid);
    setCustomers(updated);
  };

  // Product handlers
  const handleSaveProduct = (prod: Product) => {
    const uid = currentUser?.id;
    const updated = saveProduct(prod, uid);
    setProducts(updated);
  };

  const handleDeleteProduct = (id: string) => {
    const uid = currentUser?.id;
    const updated = deleteProduct(id, uid);
    setProducts(updated);
  };

  // Settings handlers
  const handleUpdateSettings = (newSettings: BusinessSettings) => {
    const uid = currentUser?.id;
    saveSettings(newSettings, uid);
    setSettings(newSettings);
  };

  const handleUpdateOpeningBalance = (amt: number) => {
    const uid = currentUser?.id;
    const updatedReg = { ...register, openingBalance: amt };
    saveDailyRegister(updatedReg, uid);
    setRegister(updatedReg);
  };

  const handleConfirmCloseRegister = (actualCash: number, notes?: string) => {
    const updatedReg: DailyRegister = {
      ...register,
      isClosed: true,
      closedAt: new Date().toISOString(),
      notes: notes || `Fechado com ${actualCash} conferido em dinheiro`,
    };
    saveDailyRegister(updatedReg);
    setRegister(updatedReg);
  };

  // Export / Import
  const handleExportData = () => {
    const uid = currentUser?.id;
    const jsonStr = exportAllDataJSON(uid);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vendeai_backup_${todayStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = (jsonStr: string) => {
    const uid = currentUser?.id;
    const ok = importAllDataJSON(jsonStr, uid);
    if (ok) {
      alert('Backup importado com sucesso!');
      refreshAllData(currentUser);
    } else {
      alert('Arquivo de backup inválido.');
    }
  };

  const handleResetData = () => {
    const uid = currentUser?.id;
    resetUserData(uid);
    refreshAllData(currentUser);
  };

  // If user is not logged in, show AuthView (Cadastro with 07 Days Free Trial or Login)
  if (!currentUser) {
    return <AuthView onAuthSuccess={handleAuthSuccess} />;
  }

  // Calculate trial info
  const trialInfo = getTrialInfo(currentUser);
  const isTrialExpired = trialInfo.isExpired && currentUser.subscriptionStatus !== 'active';

  // Calculations for header and bottom bar
  const todaySales = sales.filter((s) => s.status === 'concluida' && s.date.startsWith(todayStr));
  const todaySalesTotal = todaySales.reduce((acc, s) => acc + s.totalAmount, 0);
  const activeDebtsCount = debts.filter((d) => d.totalOwed > 0).length;

  return (
    <div
      className={`min-h-screen text-slate-900 flex flex-col transition-colors ${
        settings.highContrastMode ? 'bg-white contrast-125' : 'bg-slate-50'
      }`}
    >
      {/* 7-Day Free Trial / Subscription Banner */}
      <TrialBanner
        user={currentUser}
        onOpenSubscription={() => setIsSubscriptionOpen(true)}
        onUserUpdated={(updated) => setCurrentUser({ ...updated })}
      />

      {/* Top Header (Clean, sem 100% offline, sem abas de luz, volume ou vender) */}
      <Header
        settings={settings}
        user={currentUser}
        onUpdateSettings={handleUpdateSettings}
        activeTab={activeTab}
        onOpenQuickSale={() => setIsNumpadOpen(true)}
        onLogout={handleLogout}
        todaySalesTotal={todaySalesTotal}
      />

      {/* Main Mobile-First Content Canvas with fixed bottom menu spacing */}
      <main className="flex-1 w-full max-w-md mx-auto px-4 pt-3 pb-28 sm:pb-32">
        {activeTab === 'pos' && (
          <PosView
            products={products}
            sales={sales}
            customers={customers}
            settings={settings}
            onCompleteSale={handleCompleteSale}
            onCancelSale={handleCancelSale}
            onOpenNumpadSale={() => setIsNumpadOpen(true)}
            onNavigateToTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'customers' && (
          <CustomersView
            customers={customers}
            debts={debts}
            sales={sales}
            settings={settings}
            onSaveCustomer={handleSaveCustomer}
            onDeleteCustomer={handleDeleteCustomer}
            onOpenPaymentModal={(debt) => setPayingDebt(debt)}
            onSaveDebt={handleSaveDebt}
          />
        )}

        {activeTab === 'expenses' && (
          <ExpensesView
            expenses={expenses}
            todaySalesTotal={todaySalesTotal}
            onOpenNewExpense={() => setIsExpenseOpen(true)}
            onDeleteExpense={handleDeleteExpense}
          />
        )}

        {activeTab === 'cash' && (
          <CashView
            sales={sales}
            expenses={expenses}
            register={register}
            settings={settings}
            dateStr={todayStr}
            onUpdateOpeningBalance={handleUpdateOpeningBalance}
            onOpenCloseRegister={() => setIsCloseRegisterOpen(true)}
          />
        )}

        {activeTab === 'products' && (
          <ProductsView
            products={products}
            settings={settings}
            user={currentUser}
            onSaveProduct={handleSaveProduct}
            onDeleteProduct={handleDeleteProduct}
            onUpdateSettings={handleUpdateSettings}
            onExportData={handleExportData}
            onImportData={handleImportData}
            onResetData={handleResetData}
            onOpenSubscriptionModal={() => setIsSubscriptionOpen(true)}
            onLogout={handleLogout}
          />
        )}
      </main>

      {/* Fixed Ergonomic Mobile Bottom Nav Bar */}
      <BottomNav
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        debtsCount={activeDebtsCount}
      />

      {/* Modals */}
      <NumpadSaleModal
        isOpen={isNumpadOpen}
        onClose={() => setIsNumpadOpen(false)}
        onCompleteSale={handleCompleteSale}
        soundEnabled={settings.soundEnabled}
        customers={customers}
      />

      <SaleSuccessModal
        sale={lastCompletedSale}
        settings={settings}
        onClose={() => setLastCompletedSale(null)}
        onNewSale={() => {
          setLastCompletedSale(null);
          setIsNumpadOpen(true);
        }}
      />

      <ExpenseModal
        isOpen={isExpenseOpen}
        onClose={() => setIsExpenseOpen(false)}
        onSaveExpense={handleSaveExpense}
        soundEnabled={settings.soundEnabled}
      />

      <DebtPaymentModal
        isOpen={!!payingDebt}
        debt={payingDebt}
        settings={settings}
        soundEnabled={settings.soundEnabled}
        onClose={() => setPayingDebt(null)}
        onConfirmPayment={handleConfirmDebtPayment}
      />

      <CloseRegisterModal
        isOpen={isCloseRegisterOpen}
        onClose={() => setIsCloseRegisterOpen(false)}
        dateStr={todayStr}
        register={register}
        sales={sales}
        expenses={expenses}
        settings={settings}
        onConfirmClose={handleConfirmCloseRegister}
      />

      <SubscriptionModal
        isOpen={isSubscriptionOpen}
        onClose={() => setIsSubscriptionOpen(false)}
        user={currentUser}
        onSuccess={(updatedUser: UserAccount) => {
          setCurrentUser(updatedUser);
          refreshAllData(updatedUser);
        }}
      />
    </div>
  );
}
