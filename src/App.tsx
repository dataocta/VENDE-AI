import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db, testFirestoreConnection } from './firebase';
import { Lock, Phone, CreditCard, LogOut } from 'lucide-react';
import { Header } from './components/Header';
import { BottomNav, TabType } from './components/BottomNav';
import { NumpadSaleModal } from './components/NumpadSaleModal';
import { SaleSuccessModal } from './components/SaleSuccessModal';
import { ExpenseModal } from './components/ExpenseModal';
import { DebtPaymentModal } from './components/DebtPaymentModal';
import { CloseRegisterModal } from './components/CloseRegisterModal';
import { SubscriptionModal } from './components/SubscriptionModal';
import { AdminPanelModal } from './components/AdminPanelModal';
import { PosView } from './views/PosView';
import { ExpensesView } from './views/ExpensesView';
import { CashView } from './views/CashView';
import { CustomersView } from './views/CustomersView';
import { ProductsView } from './views/ProductsView';
import { AccountSettingsView } from './views/AccountSettingsView';
import { AuthView } from './views/AuthView';
import {
  getProducts,
  saveProduct,
  deleteProduct,
  getSales,
  saveSale,
  updateSale,
  deleteSale,
  cancelSale,
  getExpenses,
  saveExpense,
  updateExpense,
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
  isCashInflowEntry,
  exportAllDataJSON,
  importAllDataJSON,
  resetUserData,
} from './utils/storage';
import {
  getCurrentUser,
  setCurrentUser as setLocalCurrentUser,
  upsertLocalUser,
  logoutUser,
  getTrialInfo,
  readPendingProfile,
  savePendingProfile,
} from './utils/authStorage';
import { playSaleChime } from './utils/audio';
import {
  saveProductFirestore,
  deleteProductFirestore,
  saveSaleFirestore,
  deleteSaleFirestore,
  saveExpenseFirestore,
  deleteExpenseFirestore,
  saveCustomerFirestore,
  deleteCustomerFirestore,
  saveDebtFirestore,
  saveRegisterFirestore,
  saveSettingsFirestore,
  loadAllDataFromFirestore,
  backupLocalDataToFirestore,
  getUserProfileFirestore,
  saveUserProfileFirestore,
} from './utils/firestoreService';
import { Sale, Expense, CustomerDebt, Customer, Product, DailyRegister, BusinessSettings, UserAccount, PendingStripeCheckout } from './types';

const PENDING_STRIPE_KEY = 'vendeai_pending_stripe_v1';

function readPendingStripe(): PendingStripeCheckout | null {
  try {
    const raw = localStorage.getItem(PENDING_STRIPE_KEY);
    return raw ? (JSON.parse(raw) as PendingStripeCheckout) : null;
  } catch {
    return null;
  }
}

function savePendingStripe(data: PendingStripeCheckout | null) {
  try {
    if (data) {
      localStorage.setItem(PENDING_STRIPE_KEY, JSON.stringify(data));
    } else {
      localStorage.removeItem(PENDING_STRIPE_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

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
  const [stripePaidSuccess, setStripePaidSuccess] = useState(false);
  const [pendingStripeCheckout, setPendingStripeCheckout] = useState<PendingStripeCheckout | null>(() =>
    readPendingStripe()
  );
  const [stripeCheckoutCancelled, setStripeCheckoutCancelled] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);

  // Load user and app data on mount + Listen to Firebase Auth
  useEffect(() => {
    // 1. Connection check on boot as mandated by Firebase skill
    testFirestoreConnection();

    // 2. Listen to real Firebase auth state (Google & Email/Password login)
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const pendingProfile = readPendingProfile();
        const pendingStripe = readPendingStripe();
        let user = await getUserProfileFirestore(fbUser.uid);

        if (!user) {
          const now = new Date();
          const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          const resolvedName =
            pendingProfile?.name ||
            fbUser.displayName ||
            pendingStripe?.customerName ||
            (fbUser.email ? fbUser.email.split('@')[0] : 'Vendedor');

          user = {
            id: fbUser.uid,
            name: resolvedName,
            email: (fbUser.email || pendingProfile?.email || pendingStripe?.customerEmail || '').toLowerCase(),
            phone: pendingProfile?.phone || fbUser.phoneNumber || '',
            businessName:
              pendingProfile?.businessName || `Vendas de ${(resolvedName || 'Rua').split(' ')[0]}`,
            createdAt: now.toISOString(),
            trialEndsAt:
              pendingStripe?.subscriptionStatus === 'trial' && pendingStripe.currentPeriodEnd
                ? pendingStripe.currentPeriodEnd
                : sevenDaysLater.toISOString(),
            subscriptionStatus: pendingStripe?.subscriptionStatus || 'trial',
            planPrice: pendingStripe?.planPrice || 15.97,
            selectedPlan: pendingStripe?.plan || 'trial',
            stripeCustomerId: pendingStripe?.stripeCustomerId,
            stripeSubscriptionId: pendingStripe?.stripeSubscriptionId,
            subscriptionPaidAt: pendingStripe ? now.toISOString() : undefined,
            subscriptionExpiresAt: pendingStripe?.currentPeriodEnd,
          };
          await saveUserProfileFirestore(user);
        } else {
          let needsSync = false;
          const merged = { ...user };
          if (!merged.name && (pendingProfile?.name || fbUser.displayName)) {
            merged.name = pendingProfile?.name || fbUser.displayName || 'Vendedor';
            needsSync = true;
          }
          if (!merged.phone && (pendingProfile?.phone || fbUser.phoneNumber)) {
            merged.phone = pendingProfile?.phone || fbUser.phoneNumber || '';
            needsSync = true;
          }
          if (!merged.email && fbUser.email) {
            merged.email = fbUser.email.toLowerCase();
            needsSync = true;
          }
          if (pendingStripe) {
            merged.subscriptionStatus = pendingStripe.subscriptionStatus || 'active';
            merged.stripeCustomerId = pendingStripe.stripeCustomerId || merged.stripeCustomerId;
            merged.stripeSubscriptionId =
              pendingStripe.stripeSubscriptionId || merged.stripeSubscriptionId;
            merged.selectedPlan = pendingStripe.plan || merged.selectedPlan;
            merged.planPrice = pendingStripe.planPrice || merged.planPrice;
            merged.subscriptionPaidAt = merged.subscriptionPaidAt || new Date().toISOString();
            merged.subscriptionExpiresAt =
              pendingStripe.currentPeriodEnd || merged.subscriptionExpiresAt;
            if (
              pendingStripe.subscriptionStatus === 'trial' &&
              pendingStripe.currentPeriodEnd
            ) {
              merged.trialEndsAt = pendingStripe.currentPeriodEnd;
            }
            needsSync = true;
          }
          if (needsSync) {
            user = merged;
            await saveUserProfileFirestore(user);
          }
        }

        if (pendingProfile) {
          savePendingProfile(null);
        }
        if (pendingStripe) {
          savePendingStripe(null);
          setPendingStripeCheckout(null);
        }

        upsertLocalUser(user);
        setLocalCurrentUser(user);
        setCurrentUser(user);
        await syncDataWithFirestore(user);
      } else {
        // Fall back to local current user if any
        const localUser = getCurrentUser();
        if (localUser) {
          setCurrentUser(localUser);
          refreshAllData(localUser);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Real-time synchronization of the current user's status (instant block/unblock)
  useEffect(() => {
    if (!currentUser?.id) return;
    try {
      const unsub = onSnapshot(
        doc(db, 'users', currentUser.id),
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            if (
              data.subscriptionStatus &&
              (data.subscriptionStatus !== currentUser.subscriptionStatus ||
                data.trialEndsAt !== currentUser.trialEndsAt ||
                data.stripeCustomerId !== currentUser.stripeCustomerId ||
                data.stripeSubscriptionId !== currentUser.stripeSubscriptionId ||
                data.subscriptionExpiresAt !== currentUser.subscriptionExpiresAt)
            ) {
              const updated: UserAccount = {
                ...currentUser,
                subscriptionStatus: data.subscriptionStatus,
                trialEndsAt: data.trialEndsAt || currentUser.trialEndsAt,
                blockedAt: data.blockedAt,
                subscriptionPaidAt: data.subscriptionPaidAt || currentUser.subscriptionPaidAt,
                subscriptionExpiresAt:
                  data.subscriptionExpiresAt || currentUser.subscriptionExpiresAt,
                stripeCustomerId: data.stripeCustomerId || currentUser.stripeCustomerId,
                stripeSubscriptionId:
                  data.stripeSubscriptionId || currentUser.stripeSubscriptionId,
                selectedPlan: data.selectedPlan || currentUser.selectedPlan,
              };
              setCurrentUser(updated);
              upsertLocalUser(updated);
            }
          }
        },
        (err) => {
          console.warn('Realtime user listener note:', err);
        }
      );
      return () => unsub();
    } catch {
      // Ignore if offline
    }
  }, [currentUser?.id]);

  // Handle Stripe Checkout return (?stripe_status=success&session_id=...) both before and after login
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stripeStatus = params.get('stripe_status');
    const sessionId = params.get('session_id');

    let cancelled = false;

    if (stripeStatus === 'success' && sessionId) {
      fetch('/api/stripe/verify-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, userId: currentUser?.id }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (cancelled) return;
          if (data?.verified) {
            if (currentUser) {
              const updated: UserAccount = {
                ...currentUser,
                subscriptionStatus: data.subscriptionStatus || 'active',
                stripeCustomerId: data.stripeCustomerId || currentUser.stripeCustomerId,
                stripeSubscriptionId:
                  data.stripeSubscriptionId || currentUser.stripeSubscriptionId,
                selectedPlan: data.plan || currentUser.selectedPlan,
                planPrice: data.planPrice || currentUser.planPrice,
                subscriptionPaidAt: new Date().toISOString(),
                subscriptionExpiresAt:
                  data.currentPeriodEnd || currentUser.subscriptionExpiresAt,
                trialEndsAt:
                  data.subscriptionStatus === 'trial' && data.currentPeriodEnd
                    ? data.currentPeriodEnd
                    : currentUser.trialEndsAt,
              };
              setCurrentUser(updated);
              upsertLocalUser(updated);
              saveUserProfileFirestore(updated).catch(console.error);
              savePendingStripe(null);
              setPendingStripeCheckout(null);
              playSaleChime();
              setStripePaidSuccess(true);
              setIsSubscriptionOpen(true);
            } else {
              const pending: PendingStripeCheckout = {
                sessionId,
                stripeCustomerId: data.stripeCustomerId,
                stripeSubscriptionId: data.stripeSubscriptionId,
                subscriptionStatus: data.subscriptionStatus || 'active',
                customerEmail: data.customerEmail,
                customerName: data.customerName,
                plan: data.plan || 'monthly',
                planPrice: data.planPrice || 15.97,
                currentPeriodEnd: data.currentPeriodEnd,
              };
              savePendingStripe(pending);
              setPendingStripeCheckout(pending);
              setStripeCheckoutCancelled(false);
              playSaleChime();
            }
          }
        })
        .catch((err) => {
          console.warn('Stripe return verification warning:', err);
        })
        .finally(() => {
          window.history.replaceState({}, document.title, window.location.pathname);
        });
    } else if (stripeStatus === 'cancel') {
      if (!currentUser) {
        setStripeCheckoutCancelled(true);
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (
      currentUser?.id &&
      currentUser.stripeCustomerId &&
      currentUser.subscriptionStatus !== 'blocked'
    ) {
      const qs = new URLSearchParams({
        userId: currentUser.id,
        customerId: currentUser.stripeCustomerId,
      });
      fetch(`/api/stripe/subscription-status?${qs.toString()}`)
        .then((res) => res.json())
        .then((data) => {
          if (cancelled || !data?.found || !data?.subscriptionStatus) return;
          if (
            data.subscriptionStatus !== currentUser.subscriptionStatus ||
            data.stripeSubscriptionId !== currentUser.stripeSubscriptionId ||
            data.subscriptionExpiresAt !== currentUser.subscriptionExpiresAt
          ) {
            const updated: UserAccount = {
              ...currentUser,
              subscriptionStatus: data.subscriptionStatus,
              stripeCustomerId: data.stripeCustomerId || currentUser.stripeCustomerId,
              stripeSubscriptionId:
                data.stripeSubscriptionId || currentUser.stripeSubscriptionId,
              selectedPlan: data.selectedPlan || currentUser.selectedPlan,
              subscriptionExpiresAt:
                data.subscriptionExpiresAt || currentUser.subscriptionExpiresAt,
            };
            setCurrentUser(updated);
            upsertLocalUser(updated);
            saveUserProfileFirestore(updated).catch(console.error);
          }
        })
        .catch(() => {
          // Non-blocking sync
        });
    }

    return () => {
      cancelled = true;
    };
  }, [currentUser?.id]);

  const syncDataWithFirestore = async (user: UserAccount) => {
    const uid = user.id;
    // Refresh local first
    refreshAllData(user);

    // Fetch cloud data from Firestore
    try {
      const cloudData = await loadAllDataFromFirestore(uid);

      // Merge products: keep any local not in cloud, and take cloud items
      if (cloudData.products.length > 0) {
        const localProds = getProducts(uid);
        const map = new Map<string, Product>();
        localProds.forEach((p) => map.set(p.id, p));
        cloudData.products.forEach((p) => map.set(p.id, p));
        const merged = Array.from(map.values());
        setProducts(merged);
        localStorage.setItem(`vendeai_${uid}_products`, JSON.stringify(merged));
      }

      // Merge sales
      if (cloudData.sales.length > 0) {
        const localSales = getSales(uid);
        const map = new Map<string, Sale>();
        localSales.forEach((s) => map.set(s.id, s));
        cloudData.sales.forEach((s) => map.set(s.id, s));
        const merged = Array.from(map.values()).sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setSales(merged);
        localStorage.setItem(`vendeai_${uid}_sales`, JSON.stringify(merged));
      }

      // Merge expenses
      if (cloudData.expenses.length > 0) {
        const localExp = getExpenses(uid);
        const map = new Map<string, Expense>();
        localExp.forEach((e) => map.set(e.id, e));
        cloudData.expenses.forEach((e) => map.set(e.id, e));
        const merged = Array.from(map.values()).sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setExpenses(merged);
        localStorage.setItem(`vendeai_${uid}_expenses`, JSON.stringify(merged));
      }

      // Merge customers
      if (cloudData.customers.length > 0) {
        const localCust = getCustomers(uid);
        const map = new Map<string, Customer>();
        localCust.forEach((c) => map.set(c.id, c));
        cloudData.customers.forEach((c) => map.set(c.id, c));
        const merged = Array.from(map.values());
        setCustomers(merged);
        localStorage.setItem(`vendeai_${uid}_customers`, JSON.stringify(merged));
      }

      // Merge debts
      if (cloudData.debts.length > 0) {
        const localDebts = getDebts(uid);
        const map = new Map<string, CustomerDebt>();
        localDebts.forEach((d) => map.set(d.id, d));
        cloudData.debts.forEach((d) => map.set(d.id, d));
        const merged = Array.from(map.values());
        setDebts(merged);
        localStorage.setItem(`vendeai_${uid}_debts`, JSON.stringify(merged));
      }

      // Merge settings
      if (cloudData.settings) {
        const mergedSettings = { ...getSettings(uid), ...cloudData.settings };
        setSettings(mergedSettings);
        saveSettings(mergedSettings, uid);
      }

      // Backup local data to Firestore to ensure any offline additions are synced
      const currentLocal = {
        products: getProducts(uid),
        sales: getSales(uid),
        expenses: getExpenses(uid),
        customers: getCustomers(uid),
        debts: getDebts(uid),
        settings: getSettings(uid),
      };
      await backupLocalDataToFirestore(uid, currentLocal);
    } catch (err) {
      console.warn('Sync with Firestore background completed with warnings', err);
    }
  };

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

  const handleAuthSuccess = async (user: UserAccount) => {
    setCurrentUser(user);
    setLocalCurrentUser(user);
    // Sync user business name to settings for this specific user
    const existingSettings = getSettings(user.id);
    const updatedSettings: BusinessSettings = {
      ...existingSettings,
      sellerName: user.name || existingSettings.sellerName,
      businessName: user.businessName || existingSettings.businessName,
      phone: user.phone || existingSettings.phone,
      pixKey: existingSettings.pixKey || user.phone || '',
    };
    saveSettings(updatedSettings, user.id);
    setSettings(updatedSettings);

    // Save profile and settings to Firestore cloud when signed into Firebase
    if (auth.currentUser && auth.currentUser.uid === user.id) {
      saveUserProfileFirestore(user).catch((err) =>
        console.error('Failed saving user profile on auth success:', err)
      );
      saveSettingsFirestore(updatedSettings, user.id).catch((err) =>
        console.error('Failed saving settings on auth success:', err)
      );
    }

    // Sync all existing data with Firestore
    await syncDataWithFirestore(user);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('Sign out warning:', err);
    }
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

    // Cloud Firestore backup
    if (uid) {
      saveSaleFirestore(sale, uid).catch(console.error);
    }
  };

  const handleCancelSale = (saleId: string) => {
    const uid = currentUser?.id;
    const updatedSales = cancelSale(saleId, uid);
    setSales(updatedSales);
    setProducts(getProducts(uid));

    // Update sale status in Firestore
    if (uid) {
      const targetSale = updatedSales.find((s) => s.id === saleId);
      if (targetSale) {
        saveSaleFirestore(targetSale, uid).catch(console.error);
      }
    }
  };

  const handleUpdateSale = (updated: Sale) => {
    const uid = currentUser?.id;
    const next = updateSale(updated, uid);
    setSales(next);
    if (uid) {
      saveSaleFirestore(updated, uid).catch(console.error);
    }
  };

  const handleDeleteSale = (saleId: string) => {
    const uid = currentUser?.id;
    const next = deleteSale(saleId, uid);
    setSales(next);
    setProducts(getProducts(uid));
    if (uid) {
      deleteSaleFirestore(saleId).catch(console.error);
    }
  };

  // Expense handlers
  const handleSaveExpense = (expense: Expense) => {
    const uid = currentUser?.id;
    const updatedExpenses = saveExpense(expense, uid);
    setExpenses(updatedExpenses);

    // Cloud Firestore backup
    if (uid) {
      saveExpenseFirestore(expense, uid).catch(console.error);
    }
  };

  const handleDeleteExpense = (id: string) => {
    const uid = currentUser?.id;
    const updatedExpenses = deleteExpense(id, uid);
    setExpenses(updatedExpenses);

    // Delete in Firestore
    deleteExpenseFirestore(id).catch(console.error);
  };

  const handleUpdateExpense = (updated: Expense) => {
    const uid = currentUser?.id;
    const next = updateExpense(updated, uid);
    setExpenses(next);
    if (uid) {
      saveExpenseFirestore(updated, uid).catch(console.error);
    }
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

    if (uid && res.sale) {
      const updatedDebt = res.debts.find((d) => d.id === debtId);
      if (updatedDebt) {
        saveDebtFirestore(updatedDebt, uid).catch(console.error);
      }
      saveSaleFirestore(res.sale, uid).catch(console.error);
    }
  };

  const handleSaveDebt = (debt: CustomerDebt) => {
    const uid = currentUser?.id;
    const updated = saveCustomerDebt(debt, uid);
    setDebts(updated);
    setCustomers(getCustomers(uid));

    // Cloud Firestore backup
    if (uid) {
      saveDebtFirestore(debt, uid).catch(console.error);
    }
  };

  const handleSaveCustomer = (customer: Customer) => {
    const uid = currentUser?.id;
    const updated = saveCustomer(customer, uid);
    setCustomers(updated);

    // Cloud Firestore backup
    if (uid) {
      saveCustomerFirestore(customer, uid).catch(console.error);
    }
  };

  const handleDeleteCustomer = (id: string) => {
    const uid = currentUser?.id;
    const updated = deleteCustomer(id, uid);
    setCustomers(updated);

    // Delete in Firestore
    deleteCustomerFirestore(id).catch(console.error);
  };

  // Product handlers
  const handleSaveProduct = (prod: Product) => {
    const uid = currentUser?.id;
    const updated = saveProduct(prod, uid);
    setProducts(updated);

    // Cloud Firestore backup
    if (uid) {
      saveProductFirestore(prod, uid).catch(console.error);
    }
  };

  const handleDeleteProduct = (id: string) => {
    const uid = currentUser?.id;
    const updated = deleteProduct(id, uid);
    setProducts(updated);

    // Delete in Firestore
    deleteProductFirestore(id).catch(console.error);
  };

  // Settings handlers
  const handleUpdateSettings = (newSettings: BusinessSettings) => {
    const uid = currentUser?.id;
    saveSettings(newSettings, uid);
    setSettings(newSettings);

    // Cloud Firestore backup
    if (uid) {
      saveSettingsFirestore(newSettings, uid).catch(console.error);
    }
  };

  const handleUpdateOpeningBalance = (amt: number) => {
    const uid = currentUser?.id;
    const updatedReg = { ...register, openingBalance: amt };
    saveDailyRegister(updatedReg, uid);
    setRegister(updatedReg);

    // Cloud Firestore backup
    if (uid) {
      saveRegisterFirestore(updatedReg, uid).catch(console.error);
    }
  };

  const handleConfirmCloseRegister = (actualCash: number, notes?: string) => {
    const uid = currentUser?.id;
    const updatedReg: DailyRegister = {
      ...register,
      isClosed: true,
      closedAt: new Date().toISOString(),
      notes: notes || `Fechado com ${actualCash} conferido em dinheiro`,
    };
    saveDailyRegister(updatedReg);
    setRegister(updatedReg);

    // Cloud Firestore backup
    if (uid) {
      saveRegisterFirestore(updatedReg, uid).catch(console.error);
    }
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
      if (currentUser) {
        syncDataWithFirestore(currentUser);
      }
    } else {
      alert('Arquivo de backup inválido.');
    }
  };

  const handleResetData = () => {
    const uid = currentUser?.id;
    resetUserData(uid);
    refreshAllData(currentUser);
  };

  const handleUpdateUserAccount = (partial: Partial<UserAccount>) => {
    if (!currentUser) return;
    const updated: UserAccount = { ...currentUser, ...partial };
    setCurrentUser(updated);
    setLocalCurrentUser(updated);
    saveUserProfileFirestore(updated).catch(console.error);
  };

  // If user is not logged in, show AuthView
  if (!currentUser) {
    return (
      <AuthView
        onAuthSuccess={(user) => {
          savePendingStripe(null);
          setPendingStripeCheckout(null);
          setStripeCheckoutCancelled(false);
          handleAuthSuccess(user);
        }}
        pendingStripeCheckout={pendingStripeCheckout}
        stripeCheckoutCancelled={stripeCheckoutCancelled}
        onClearPendingStripe={() => {
          savePendingStripe(null);
          setPendingStripeCheckout(null);
          setStripeCheckoutCancelled(false);
        }}
      />
    );
  }

  // Calculate trial info
  const trialInfo = getTrialInfo(currentUser);

  // Check if account is blocked or expired (Super Admin is never locked out)
  const isSuperAdmin = currentUser.email?.toLowerCase() === 'cosquinha66@gmail.com';
  const isAccountBlocked =
    !isSuperAdmin &&
    (currentUser.subscriptionStatus === 'blocked' ||
      currentUser.subscriptionStatus === 'expired' ||
      trialInfo.isExpired);

  if (isAccountBlocked) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center px-4 py-8">
        <div className="w-full max-w-sm bg-white border border-rose-200 rounded-3xl p-6 shadow-xl text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
            <Lock className="w-8 h-8" />
          </div>

          <div>
            <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 inline-block mb-1">
              Acesso Bloqueado
            </span>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              Acesso ao Vende.ai Suspenso
            </h2>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              {currentUser.subscriptionStatus === 'blocked'
                ? 'Seu acesso ao sistema foi suspenso pelo administrador.'
                : 'Seu período de teste gratuito chegou ao fim.'}{' '}
              Para liberar seu acesso e continuar vendendo, entre em contato ou assine seu plano.
            </p>
          </div>

          {/* User info card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-left space-y-1">
            <div className="text-slate-500">
              Usuário: <strong className="text-slate-800">{currentUser.name}</strong>
            </div>
            <div className="text-slate-500 truncate">
              E-mail: <span className="font-mono text-slate-700">{currentUser.email}</span>
            </div>
            <div className="text-slate-500">
              Status: <span className="text-rose-600 font-bold">Bloqueado</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-2 pt-2">
            <a
              href={`https://wa.me/55${(settings.phone || '11999999999').replace(/\D/g, '')}?text=${encodeURIComponent(
                `Olá, gostaria de solicitar a liberação do meu acesso ao Vende.ai (E-mail: ${currentUser.email})`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full min-h-[46px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-2 transition-all shadow-xs"
            >
              <Phone className="w-4 h-4" />
              <span>Falar no WhatsApp para Liberar</span>
            </a>

            <button
              type="button"
              onClick={() => setIsSubscriptionOpen(true)}
              className="w-full min-h-[44px] rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs"
            >
              <CreditCard className="w-4 h-4 text-emerald-400" />
              <span>Assinar Plano (R$ 15,97/mês)</span>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="w-full py-2 text-xs font-bold text-slate-500 hover:text-rose-600 flex items-center justify-center gap-1.5 transition-colors pt-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair da Conta (Logout)</span>
            </button>
          </div>
        </div>

        {/* Modal de Assinatura se o usuário quiser assinar diretamente da tela de bloqueio */}
        <SubscriptionModal
          isOpen={isSubscriptionOpen}
          onClose={() => {
            setIsSubscriptionOpen(false);
            setStripePaidSuccess(false);
          }}
          user={currentUser}
          initialPaidSuccess={stripePaidSuccess}
          onSuccess={(updatedUser: UserAccount) => {
            setCurrentUser(updatedUser);
            upsertLocalUser(updatedUser);
            saveUserProfileFirestore(updatedUser).catch(console.error);
            refreshAllData(updatedUser);
          }}
        />
      </div>
    );
  }

  // Calculations for header and bottom bar (exclui fiado em aberto)
  const todaySales = sales.filter((s) => isCashInflowEntry(s) && s.date.startsWith(todayStr));
  const todaySalesTotal = todaySales.reduce((acc, s) => acc + s.totalAmount, 0);
  const activeDebtsCount = debts.filter((d) => d.totalOwed > 0).length;

  return (
    <div
      className={`min-h-screen text-slate-900 flex flex-col transition-colors ${
        settings.highContrastMode ? 'bg-white contrast-125' : 'bg-slate-50'
      }`}
    >
      {/* Top Header */}
      <Header
        settings={settings}
        user={currentUser}
        onUpdateSettings={handleUpdateSettings}
        activeTab={activeTab}
        onOpenQuickSale={() => setIsNumpadOpen(true)}
        onLogout={handleLogout}
        onOpenAdminPanel={() => setIsAdminPanelOpen(true)}
        todaySalesTotal={todaySalesTotal}
      />

      {/* Main Content Canvas with fixed bottom menu spacing */}
      <main className="flex-1 w-full max-w-md mx-auto px-4 pt-3 pb-28 sm:pb-32">
        {activeTab === 'pos' && (
          <PosView
            products={products}
            sales={sales}
            expenses={expenses}
            customers={customers}
            debts={debts}
            settings={settings}
            onCompleteSale={handleCompleteSale}
            onCancelSale={handleCancelSale}
            onOpenNumpadSale={() => setIsNumpadOpen(true)}
            onOpenNewExpense={() => setIsExpenseOpen(true)}
            onOpenPaymentModal={(debt) => setPayingDebt(debt)}
            onNavigateToTab={(tab) => setActiveTab(tab)}
            onUpdateSettings={handleUpdateSettings}
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
            settings={settings}
          />
        )}

        {activeTab === 'cash' && (
          <CashView
            sales={sales}
            expenses={expenses}
            debts={debts}
            register={register}
            settings={settings}
            dateStr={todayStr}
            onUpdateOpeningBalance={handleUpdateOpeningBalance}
            onOpenCloseRegister={() => setIsCloseRegisterOpen(true)}
            onOpenPaymentModal={(debt) => setPayingDebt(debt)}
            onNavigateToCustomers={() => setActiveTab('customers')}
            onUpdateSale={handleUpdateSale}
            onDeleteSale={handleDeleteSale}
            onUpdateExpense={handleUpdateExpense}
            onDeleteExpense={handleDeleteExpense}
          />
        )}

        {activeTab === 'products' && (
          <ProductsView
            products={products}
            settings={settings}
            onSaveProduct={handleSaveProduct}
            onDeleteProduct={handleDeleteProduct}
          />
        )}

        {activeTab === 'settings' && (
          <AccountSettingsView
            settings={settings}
            user={currentUser}
            products={products}
            expenses={expenses}
            onUpdateSettings={handleUpdateSettings}
            onUpdateUserAccount={handleUpdateUserAccount}
            onExportData={handleExportData}
            onImportData={handleImportData}
            onResetData={handleResetData}
            onLogout={handleLogout}
            onOpenAdminPanel={() => setIsAdminPanelOpen(true)}
            onOpenSubscriptionModal={() => setIsSubscriptionOpen(true)}
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
        products={products}
        onSaveCustomer={handleSaveCustomer}
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
        settings={settings}
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
        onClose={() => {
          setIsSubscriptionOpen(false);
          setStripePaidSuccess(false);
        }}
        user={currentUser}
        initialPaidSuccess={stripePaidSuccess}
        onSuccess={(updatedUser: UserAccount) => {
          setCurrentUser(updatedUser);
          upsertLocalUser(updatedUser);
          saveUserProfileFirestore(updatedUser).catch(console.error);
          refreshAllData(updatedUser);
        }}
      />

      <AdminPanelModal
        isOpen={isAdminPanelOpen}
        onClose={() => setIsAdminPanelOpen(false)}
        currentUserEmail={currentUser?.email}
      />
    </div>
  );
}
