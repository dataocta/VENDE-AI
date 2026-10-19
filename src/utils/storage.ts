import {
  Sale,
  Expense,
  CustomerDebt,
  Product,
  DailyRegister,
  BusinessSettings,
} from '../types';
import { getCurrentUser } from './authStorage';

function getPrefix(customUserId?: string): string {
  const current = customUserId || getCurrentUser()?.id || 'guest';
  return `vendeai_${current}`;
}

const DEFAULT_SETTINGS: BusinessSettings = {
  businessName: 'Meu Negócio na Rua',
  sellerName: 'Vendedor',
  pixKey: '',
  pixKeyType: 'telefone',
  phone: '',
  city: '',
  dailyGoal: 300,
  soundEnabled: true,
  highContrastMode: false,
  currency: 'BRL',
};

export function getSettings(userId?: string): BusinessSettings {
  try {
    const key = `${getPrefix(userId)}_settings`;
    const raw = localStorage.getItem(key);
    if (!raw) {
      const user = getCurrentUser();
      const initial: BusinessSettings = {
        ...DEFAULT_SETTINGS,
        businessName: user?.businessName || DEFAULT_SETTINGS.businessName,
        sellerName: user?.name || DEFAULT_SETTINGS.sellerName,
        phone: user?.phone || '',
        pixKey: user?.phone || '',
      };
      localStorage.setItem(key, JSON.stringify(initial));
      return initial;
    }
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: BusinessSettings, userId?: string) {
  try {
    const key = `${getPrefix(userId)}_settings`;
    localStorage.setItem(key, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save settings', err);
  }
}

export function getProducts(userId?: string): Product[] {
  try {
    const key = `${getPrefix(userId)}_products`;
    const raw = localStorage.getItem(key);
    if (!raw) {
      // Clean base: fresh account starts with 0 products
      return [];
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveProduct(product: Product, userId?: string): Product[] {
  const key = `${getPrefix(userId)}_products`;
  const products = getProducts(userId);
  const index = products.findIndex((p) => p.id === product.id);
  if (index >= 0) {
    products[index] = product;
  } else {
    products.unshift(product);
  }
  localStorage.setItem(key, JSON.stringify(products));
  return products;
}

export function deleteProduct(id: string, userId?: string): Product[] {
  const key = `${getPrefix(userId)}_products`;
  const products = getProducts(userId).filter((p) => p.id !== id);
  localStorage.setItem(key, JSON.stringify(products));
  return products;
}

export function getSales(userId?: string): Sale[] {
  try {
    const key = `${getPrefix(userId)}_sales`;
    const raw = localStorage.getItem(key);
    if (!raw) {
      // Clean base: 0 sales for new user
      return [];
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveSale(sale: Sale, userId?: string): Sale[] {
  const key = `${getPrefix(userId)}_sales`;
  const sales = getSales(userId);
  sales.unshift(sale);
  localStorage.setItem(key, JSON.stringify(sales));

  // Deduct stock for products sold
  const products = getProducts(userId);
  let productsChanged = false;
  sale.items.forEach((item) => {
    if (item.productId) {
      const prod = products.find((p) => p.id === item.productId);
      if (prod && typeof prod.stock === 'number') {
        prod.stock = Math.max(0, prod.stock - item.quantity);
        productsChanged = true;
      }
    }
  });
  if (productsChanged) {
    localStorage.setItem(`${getPrefix(userId)}_products`, JSON.stringify(products));
  }

  // If sale was fiado, update or create customer debt
  if (sale.paymentMethod === 'fiado' && sale.customerName) {
    addSaleToDebts(sale, userId);
  }

  return sales;
}

export function cancelSale(saleId: string, userId?: string): Sale[] {
  const key = `${getPrefix(userId)}_sales`;
  const sales = getSales(userId);
  const sale = sales.find((s) => s.id === saleId);
  if (sale) {
    sale.status = 'cancelada';
    localStorage.setItem(key, JSON.stringify(sales));

    // Restore stock
    const products = getProducts(userId);
    let productsChanged = false;
    sale.items.forEach((item) => {
      if (item.productId) {
        const prod = products.find((p) => p.id === item.productId);
        if (prod && typeof prod.stock === 'number') {
          prod.stock += item.quantity;
          productsChanged = true;
        }
      }
    });
    if (productsChanged) {
      localStorage.setItem(`${getPrefix(userId)}_products`, JSON.stringify(products));
    }
  }
  return sales;
}

export function getExpenses(userId?: string): Expense[] {
  try {
    const key = `${getPrefix(userId)}_expenses`;
    const raw = localStorage.getItem(key);
    if (!raw) {
      // Clean base: 0 expenses
      return [];
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveExpense(expense: Expense, userId?: string): Expense[] {
  const key = `${getPrefix(userId)}_expenses`;
  const expenses = getExpenses(userId);
  expenses.unshift(expense);
  localStorage.setItem(key, JSON.stringify(expenses));
  return expenses;
}

export function deleteExpense(id: string, userId?: string): Expense[] {
  const key = `${getPrefix(userId)}_expenses`;
  const expenses = getExpenses(userId).filter((e) => e.id !== id);
  localStorage.setItem(key, JSON.stringify(expenses));
  return expenses;
}

export function getDebts(userId?: string): CustomerDebt[] {
  try {
    const key = `${getPrefix(userId)}_debts`;
    const raw = localStorage.getItem(key);
    if (!raw) {
      // Clean base: 0 debts
      return [];
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveCustomerDebt(debt: CustomerDebt, userId?: string): CustomerDebt[] {
  const key = `${getPrefix(userId)}_debts`;
  const debts = getDebts(userId);
  const idx = debts.findIndex((d) => d.id === debt.id);
  if (idx >= 0) {
    debts[idx] = debt;
  } else {
    debts.unshift(debt);
  }
  localStorage.setItem(key, JSON.stringify(debts));
  return debts;
}

export function amortizeDebt(
  debtId: string,
  amount: number,
  paymentMethod: 'dinheiro' | 'pix' | 'cartao',
  notes?: string,
  userId?: string
): { debts: CustomerDebt[]; sale?: Sale } {
  const debtsKey = `${getPrefix(userId)}_debts`;
  const debts = getDebts(userId);
  const debt = debts.find((d) => d.id === debtId);
  if (!debt) return { debts };

  const payAmount = Math.min(amount, debt.totalOwed);
  debt.totalOwed = Math.max(0, debt.totalOwed - payAmount);
  debt.history.unshift({
    id: `pay_${Date.now()}`,
    date: new Date().toISOString(),
    type: 'pagamento',
    amount: payAmount,
    notes: notes || `Recebimento A Prazo (${paymentMethod.toUpperCase()})`,
  });

  localStorage.setItem(debtsKey, JSON.stringify(debts));

  // Also record this received money as a Sale/Cash Entry for today
  const saleCode = `#REC-${Math.floor(100 + Math.random() * 900)}`;
  const recoverySale: Sale = {
    id: `rec_${Date.now()}`,
    code: saleCode,
    date: new Date().toISOString(),
    items: [
      {
        name: `Recebimento A Prazo: ${debt.name}`,
        quantity: 1,
        unitPrice: payAmount,
        subtotal: payAmount,
        costPrice: 0,
      },
    ],
    totalAmount: payAmount,
    totalCost: 0,
    paymentMethod: paymentMethod === 'dinheiro' ? 'dinheiro' : paymentMethod === 'pix' ? 'pix' : 'cartao_debito',
    customerName: debt.name,
    customerPhone: debt.phone,
    notes: notes || 'Recebimento de venda a prazo',
    status: 'concluida',
  };

  const updatedSales = getSales(userId);
  updatedSales.unshift(recoverySale);
  localStorage.setItem(`${getPrefix(userId)}_sales`, JSON.stringify(updatedSales));

  return { debts, sale: recoverySale };
}

function addSaleToDebts(sale: Sale, userId?: string) {
  const debts = getDebts(userId);
  let debt = debts.find((d) => d.name.toLowerCase() === (sale.customerName || '').toLowerCase());

  if (!debt) {
    debt = {
      id: `debt_${Date.now()}`,
      name: sale.customerName || 'Cliente sem nome',
      phone: sale.customerPhone || '',
      totalOwed: sale.totalAmount,
      lastPurchaseDate: sale.date,
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString().split('T')[0],
      history: [
        {
          id: `hist_${Date.now()}`,
          date: sale.date,
          type: 'compra',
          amount: sale.totalAmount,
          notes: `Compra ${sale.code}: ${sale.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}`,
        },
      ],
    };
    debts.unshift(debt);
  } else {
    debt.totalOwed += sale.totalAmount;
    debt.lastPurchaseDate = sale.date;
    if (sale.customerPhone && !debt.phone) {
      debt.phone = sale.customerPhone;
    }
    debt.history.unshift({
      id: `hist_${Date.now()}`,
      date: sale.date,
      type: 'compra',
      amount: sale.totalAmount,
      notes: `Compra ${sale.code}: ${sale.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}`,
    });
  }

  localStorage.setItem(`${getPrefix(userId)}_debts`, JSON.stringify(debts));
}

export function getRegisters(userId?: string): Record<string, DailyRegister> {
  try {
    const key = `${getPrefix(userId)}_registers`;
    const raw = localStorage.getItem(key);
    if (!raw) {
      return {};
    }
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function getDailyRegister(dateStr: string, userId?: string): DailyRegister {
  const registers = getRegisters(userId);
  if (registers[dateStr]) {
    return registers[dateStr];
  }
  const newReg: DailyRegister = {
    date: dateStr,
    openingBalance: 0, // Clean: starts at 0 troco inicial unless vendor sets it
    isClosed: false,
  };
  registers[dateStr] = newReg;
  localStorage.setItem(`${getPrefix(userId)}_registers`, JSON.stringify(registers));
  return newReg;
}

export function saveDailyRegister(reg: DailyRegister, userId?: string) {
  const registers = getRegisters(userId);
  registers[reg.date] = reg;
  localStorage.setItem(`${getPrefix(userId)}_registers`, JSON.stringify(registers));
}

export function resetUserData(userId?: string) {
  const prefix = getPrefix(userId);
  localStorage.removeItem(`${prefix}_sales`);
  localStorage.removeItem(`${prefix}_expenses`);
  localStorage.removeItem(`${prefix}_products`);
  localStorage.removeItem(`${prefix}_debts`);
  localStorage.removeItem(`${prefix}_registers`);
  localStorage.removeItem(`${prefix}_settings`);
}

export function exportAllDataJSON(userId?: string): string {
  const payload = {
    settings: getSettings(userId),
    products: getProducts(userId),
    sales: getSales(userId),
    expenses: getExpenses(userId),
    debts: getDebts(userId),
    registers: getRegisters(userId),
    exportedAt: new Date().toISOString(),
  };
  return JSON.stringify(payload, null, 2);
}

export function importAllDataJSON(jsonStr: string, userId?: string): boolean {
  try {
    const prefix = getPrefix(userId);
    const data = JSON.parse(jsonStr);
    if (data.settings) localStorage.setItem(`${prefix}_settings`, JSON.stringify(data.settings));
    if (data.products) localStorage.setItem(`${prefix}_products`, JSON.stringify(data.products));
    if (data.sales) localStorage.setItem(`${prefix}_sales`, JSON.stringify(data.sales));
    if (data.expenses) localStorage.setItem(`${prefix}_expenses`, JSON.stringify(data.expenses));
    if (data.debts) localStorage.setItem(`${prefix}_debts`, JSON.stringify(data.debts));
    if (data.registers) localStorage.setItem(`${prefix}_registers`, JSON.stringify(data.registers));
    return true;
  } catch (err) {
    console.error('Import failed', err);
    return false;
  }
}
