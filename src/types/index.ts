export type PaymentMethod = 'dinheiro' | 'pix' | 'cartao_debito' | 'cartao_credito' | 'fiado';

export interface Product {
  id: string;
  name: string;
  price: number;
  costPrice: number;
  category: string;
  stock: number;
  unit: string; // 'un', 'kg', 'par', 'peça', 'kit'
  colorTag?: string;
  barcode?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  customPrice?: number;
}

export interface Sale {
  id: string;
  code: string; // ex: #1042
  date: string; // ISO string
  items: {
    productId?: string;
    name: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    costPrice?: number;
  }[];
  totalAmount: number;
  totalCost: number;
  paymentMethod: PaymentMethod;
  amountReceived?: number;
  changeGiven?: number;
  customerName?: string;
  customerPhone?: string;
  customerId?: string;
  notes?: string;
  status: 'concluida' | 'cancelada';
}

export type ExpenseCategory =
  | 'combustivel'
  | 'alimentacao'
  | 'estoque'
  | 'embalagem'
  | 'taxa'
  | 'manutencao'
  | 'outros';

export interface Expense {
  id: string;
  date: string; // ISO string
  amount: number;
  category: ExpenseCategory;
  description: string;
  paymentMethod: 'dinheiro' | 'pix' | 'cartao';
}

export interface CustomerDebt {
  id: string;
  name: string;
  phone: string;
  addressOrSpot?: string; // ex: 'Barraca do Zé / Rua 7'
  totalOwed: number;
  lastPurchaseDate: string;
  dueDate?: string;
  history: {
    id: string;
    date: string;
    type: 'compra' | 'pagamento';
    amount: number;
    notes?: string;
  }[];
}

export interface DailyRegister {
  date: string; // YYYY-MM-DD
  openingBalance: number; // Troco inicial em dinheiro
  isClosed: boolean;
  closedAt?: string;
  notes?: string;
}

export interface BusinessSettings {
  businessName: string;
  sellerName: string;
  pixKey: string;
  pixKeyType: 'cpf' | 'telefone' | 'email' | 'aleatoria';
  phone: string;
  city: string;
  dailyGoal: number; // Meta diária em R$
  soundEnabled: boolean;
  highContrastMode: boolean;
  currency: string;
}

export type SubscriptionStatus = 'trial' | 'active' | 'expired';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  phone: string;
  businessName: string;
  password?: string;
  createdAt: string; // ISO string
  trialEndsAt: string; // ISO string (createdAt + 7 days)
  subscriptionStatus: SubscriptionStatus;
  subscriptionPaidAt?: string;
  subscriptionExpiresAt?: string;
  planPrice: number; // Default 15.97
}
