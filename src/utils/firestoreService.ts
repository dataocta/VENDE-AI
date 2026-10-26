import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { handleFirestoreError, OperationType } from './firestoreErrors';
import {
  UserAccount,
  Product,
  Sale,
  Expense,
  Customer,
  CustomerDebt,
  DailyRegister,
  BusinessSettings,
} from '../types';

/**
 * Clean data object to remove undefined fields that Firestore rejects
 */
function sanitizeForFirestore<T extends Record<string, any>>(obj: T): T {
  const result: any = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      if (val && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
        result[key] = sanitizeForFirestore(val);
      } else {
        result[key] = val;
      }
    }
  }
  return result as T;
}

// -------------------------------------------------------------
// USER PROFILE
// -------------------------------------------------------------
export async function saveUserProfileFirestore(user: UserAccount): Promise<void> {
  const path = `users/${user.id}`;
  try {
    const data = sanitizeForFirestore({
      userId: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      businessName: user.businessName || '',
      createdAt: user.createdAt || new Date().toISOString(),
      trialEndsAt: user.trialEndsAt || '',
      subscriptionStatus: user.subscriptionStatus || 'trial',
      planPrice: user.planPrice || 15.97,
    });
    await setDoc(doc(db, 'users', user.id), data, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function getUserProfileFirestore(uid: string): Promise<UserAccount | null> {
  const path = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      id: uid,
      name: data.name || '',
      email: data.email || '',
      phone: data.phone || '',
      businessName: data.businessName || '',
      createdAt: data.createdAt || new Date().toISOString(),
      trialEndsAt: data.trialEndsAt || '',
      subscriptionStatus: data.subscriptionStatus || 'trial',
      planPrice: data.planPrice || 15.97,
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
    return null;
  }
}

// -------------------------------------------------------------
// PRODUCTS
// -------------------------------------------------------------
export async function saveProductFirestore(product: Product, userId: string): Promise<void> {
  const path = `products/${product.id}`;
  try {
    const payload = sanitizeForFirestore({
      ...product,
      userId,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(doc(db, 'products', product.id), payload, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteProductFirestore(productId: string): Promise<void> {
  const path = `products/${productId}`;
  try {
    await deleteDoc(doc(db, 'products', productId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// -------------------------------------------------------------
// SALES
// -------------------------------------------------------------
export async function saveSaleFirestore(sale: Sale, userId: string): Promise<void> {
  const path = `sales/${sale.id}`;
  try {
    const payload = sanitizeForFirestore({
      ...sale,
      userId,
    });
    await setDoc(doc(db, 'sales', sale.id), payload, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// -------------------------------------------------------------
// EXPENSES
// -------------------------------------------------------------
export async function saveExpenseFirestore(expense: Expense, userId: string): Promise<void> {
  const path = `expenses/${expense.id}`;
  try {
    const payload = sanitizeForFirestore({
      ...expense,
      userId,
    });
    await setDoc(doc(db, 'expenses', expense.id), payload, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteExpenseFirestore(expenseId: string): Promise<void> {
  const path = `expenses/${expenseId}`;
  try {
    await deleteDoc(doc(db, 'expenses', expenseId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// -------------------------------------------------------------
// CUSTOMERS
// -------------------------------------------------------------
export async function saveCustomerFirestore(customer: Customer, userId: string): Promise<void> {
  const path = `customers/${customer.id}`;
  try {
    const payload = sanitizeForFirestore({
      ...customer,
      userId,
    });
    await setDoc(doc(db, 'customers', customer.id), payload, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteCustomerFirestore(customerId: string): Promise<void> {
  const path = `customers/${customerId}`;
  try {
    await deleteDoc(doc(db, 'customers', customerId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// -------------------------------------------------------------
// DEBTS
// -------------------------------------------------------------
export async function saveDebtFirestore(debt: CustomerDebt, userId: string): Promise<void> {
  const path = `debts/${debt.id}`;
  try {
    const payload = sanitizeForFirestore({
      ...debt,
      userId,
    });
    await setDoc(doc(db, 'debts', debt.id), payload, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// -------------------------------------------------------------
// DAILY REGISTER
// -------------------------------------------------------------
export async function saveRegisterFirestore(register: DailyRegister, userId: string): Promise<void> {
  const regId = `${userId}_${register.date}`;
  const path = `registers/${regId}`;
  try {
    const payload = sanitizeForFirestore({
      ...register,
      id: regId,
      userId,
    });
    await setDoc(doc(db, 'registers', regId), payload, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// -------------------------------------------------------------
// SETTINGS
// -------------------------------------------------------------
export async function saveSettingsFirestore(settings: BusinessSettings, userId: string): Promise<void> {
  const path = `settings/${userId}`;
  try {
    const payload = sanitizeForFirestore({
      ...settings,
      userId,
    });
    await setDoc(doc(db, 'settings', userId), payload, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// -------------------------------------------------------------
// FULL SYNC / MIGRATION (Ensures no data is lost)
// -------------------------------------------------------------
export async function loadAllDataFromFirestore(userId: string): Promise<{
  products: Product[];
  sales: Sale[];
  expenses: Expense[];
  customers: Customer[];
  debts: CustomerDebt[];
  settings?: BusinessSettings;
}> {
  const result = {
    products: [] as Product[],
    sales: [] as Sale[],
    expenses: [] as Expense[],
    customers: [] as Customer[],
    debts: [] as CustomerDebt[],
    settings: undefined as BusinessSettings | undefined,
  };

  try {
    // 1. Products
    const prodSnap = await getDocs(query(collection(db, 'products'), where('userId', '==', userId)));
    prodSnap.forEach((d) => result.products.push(d.data() as Product));

    // 2. Sales
    const salesSnap = await getDocs(query(collection(db, 'sales'), where('userId', '==', userId)));
    salesSnap.forEach((d) => result.sales.push(d.data() as Sale));

    // 3. Expenses
    const expSnap = await getDocs(query(collection(db, 'expenses'), where('userId', '==', userId)));
    expSnap.forEach((d) => result.expenses.push(d.data() as Expense));

    // 4. Customers
    const custSnap = await getDocs(query(collection(db, 'customers'), where('userId', '==', userId)));
    custSnap.forEach((d) => result.customers.push(d.data() as Customer));

    // 5. Debts
    const debtSnap = await getDocs(query(collection(db, 'debts'), where('userId', '==', userId)));
    debtSnap.forEach((d) => result.debts.push(d.data() as CustomerDebt));

    // 6. Settings
    const setDocRef = await getDoc(doc(db, 'settings', userId));
    if (setDocRef.exists()) {
      result.settings = setDocRef.data() as BusinessSettings;
    }
  } catch (err) {
    console.warn('Non-blocking: could not fetch all Firestore data at this moment', err);
  }

  return result;
}

/**
 * Sync local data up to Firestore so that previously registered items,
 * sales, clients and settings are securely backed up in the cloud.
 */
export async function backupLocalDataToFirestore(
  userId: string,
  local: {
    products: Product[];
    sales: Sale[];
    expenses: Expense[];
    customers: Customer[];
    debts: CustomerDebt[];
    settings?: BusinessSettings;
  }
): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== userId) return;

  try {
    for (const p of local.products) {
      await saveProductFirestore(p, userId);
    }
    for (const s of local.sales) {
      await saveSaleFirestore(s, userId);
    }
    for (const e of local.expenses) {
      await saveExpenseFirestore(e, userId);
    }
    for (const c of local.customers) {
      await saveCustomerFirestore(c, userId);
    }
    for (const d of local.debts) {
      await saveDebtFirestore(d, userId);
    }
    if (local.settings) {
      await saveSettingsFirestore(local.settings, userId);
    }
  } catch (err) {
    console.error('Failed to backup local data to Firestore', err);
  }
}
