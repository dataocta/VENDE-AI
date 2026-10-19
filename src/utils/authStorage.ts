import { UserAccount, SubscriptionStatus } from '../types';

const AUTH_KEYS = {
  USERS_LIST: 'vendeai_users_list_v2',
  CURRENT_USER_ID: 'vendeai_current_user_id_v2',
};

// Purge old demo artifacts from browser storage on load
if (typeof window !== 'undefined') {
  try {
    const legacyKeys = [
      'ruapro_users_list_v1',
      'ruapro_current_user_id_v1',
      'vendeai_users_list_v1',
      'vendeai_current_user_id_v1',
      'ruapro_sales_v1',
      'ruapro_expenses_v1',
      'ruapro_products_v1',
      'ruapro_debts_v1',
      'ruapro_registers_v1',
      'ruapro_settings_v1',
    ];
    legacyKeys.forEach((k) => localStorage.removeItem(k));
  } catch {
    // Ignore storage errors
  }
}

export function getRegisteredUsers(): UserAccount[] {
  try {
    const raw = localStorage.getItem(AUTH_KEYS.USERS_LIST);
    if (!raw) {
      return [];
    }
    const list: UserAccount[] = JSON.parse(raw);
    const filtered = list.filter(
      (u) =>
        u.email &&
        !u.email.includes('ruapro') &&
        u.email !== 'demo@exemplo.com' &&
        u.id !== 'user_demo_1'
    );
    if (filtered.length !== list.length) {
      saveRegisteredUsers(filtered);
    }
    return filtered;
  } catch {
    return [];
  }
}

export function saveRegisteredUsers(users: UserAccount[]) {
  try {
    localStorage.setItem(AUTH_KEYS.USERS_LIST, JSON.stringify(users));
  } catch (err) {
    console.error('Failed to save users list', err);
  }
}

export function getCurrentUser(): UserAccount | null {
  try {
    const currentId = localStorage.getItem(AUTH_KEYS.CURRENT_USER_ID);
    if (!currentId) return null;
    const users = getRegisteredUsers();
    const found = users.find((u) => u.id === currentId);
    if (!found) {
      localStorage.removeItem(AUTH_KEYS.CURRENT_USER_ID);
      return null;
    }
    return found;
  } catch {
    return null;
  }
}

export function setCurrentUser(user: UserAccount | null) {
  try {
    if (user) {
      localStorage.setItem(AUTH_KEYS.CURRENT_USER_ID, user.id);
    } else {
      localStorage.removeItem(AUTH_KEYS.CURRENT_USER_ID);
    }
  } catch (err) {
    console.error('Failed to set current user', err);
  }
}

export function registerUser(params: {
  name: string;
  email: string;
  phone: string;
  password?: string;
  businessName: string;
}): { success: boolean; user?: UserAccount; error?: string } {
  const users = getRegisteredUsers();
  const cleanEmail = params.email.trim().toLowerCase();
  const cleanPhone = params.phone.replace(/\D/g, '');

  if (!params.name.trim()) {
    return { success: false, error: 'Por favor, informe seu nome completo.' };
  }
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, error: 'Por favor, informe um e-mail válido.' };
  }
  if (!cleanPhone || cleanPhone.length < 10) {
    return { success: false, error: 'Informe um WhatsApp com DDD válido.' };
  }
  if (params.password && params.password.length < 4) {
    return { success: false, error: 'A senha deve ter pelo menos 4 dígitos.' };
  }

  // Check if email or phone already registered
  const exists = users.find(
    (u) => u.email.toLowerCase() === cleanEmail || u.phone.replace(/\D/g, '') === cleanPhone
  );

  if (exists) {
    return {
      success: false,
      error: 'Já existe um cadastro com este e-mail ou WhatsApp. Faça login para acessar sua conta.',
    };
  }

  const now = new Date();
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const newUser: UserAccount = {
    id: `user_${Date.now()}`,
    name: params.name.trim(),
    email: cleanEmail,
    phone: params.phone.trim(),
    businessName: params.businessName.trim() || `Vendas de ${params.name.split(' ')[0]}`,
    password: params.password || '123456',
    createdAt: now.toISOString(),
    trialEndsAt: sevenDaysLater.toISOString(),
    subscriptionStatus: 'trial',
    planPrice: 15.97,
  };

  users.unshift(newUser);
  saveRegisteredUsers(users);
  setCurrentUser(newUser);

  return { success: true, user: newUser };
}

export function loginUser(
  identifier: string,
  pass: string
): { success: boolean; user?: UserAccount; error?: string } {
  const users = getRegisteredUsers();
  const cleanId = identifier.trim().toLowerCase();
  const cleanPhone = identifier.replace(/\D/g, '');

  const user = users.find(
    (u) =>
      u.email.toLowerCase() === cleanId ||
      (cleanPhone.length >= 10 && u.phone.replace(/\D/g, '') === cleanPhone)
  );

  if (!user) {
    return {
      success: false,
      error: 'Conta não encontrada. Cadastre-se gratuitamente para começar seu teste de 7 dias!',
    };
  }

  if (user.password && user.password !== pass) {
    return {
      success: false,
      error: 'Senha incorreta. Verifique os dados digitados.',
    };
  }

  setCurrentUser(user);
  return { success: true, user };
}

export function logoutUser() {
  setCurrentUser(null);
}

export function getTrialInfo(user: UserAccount): {
  status: SubscriptionStatus;
  daysRemaining: number;
  hoursRemaining: number;
  isExpired: boolean;
  trialEndsFormatted: string;
} {
  if (user.subscriptionStatus === 'active') {
    return {
      status: 'active',
      daysRemaining: 30,
      hoursRemaining: 720,
      isExpired: false,
      trialEndsFormatted: 'Assinatura Ativa (R$ 15,97/mês)',
    };
  }

  const now = Date.now();
  const ends = new Date(user.trialEndsAt).getTime();
  const diffMs = ends - now;

  const isExpired = diffMs <= 0;
  const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  const hoursRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60)));

  const dateObj = new Date(user.trialEndsAt);
  const formatted = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(dateObj);

  return {
    status: isExpired ? 'expired' : 'trial',
    daysRemaining,
    hoursRemaining,
    isExpired,
    trialEndsFormatted: formatted,
  };
}

export function activateUserSubscription(userId: string): UserAccount | null {
  const users = getRegisteredUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx < 0) return null;

  const now = new Date();
  const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  users[idx] = {
    ...users[idx],
    subscriptionStatus: 'active',
    subscriptionPaidAt: now.toISOString(),
    subscriptionExpiresAt: nextMonth.toISOString(),
  };

  saveRegisteredUsers(users);
  setCurrentUser(users[idx]);
  return users[idx];
}

export function simulateUserTrial(
  userId: string,
  mode: 'trial_7' | 'trial_1' | 'expired' | 'active'
): UserAccount | null {
  const users = getRegisteredUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx < 0) return null;

  const now = Date.now();
  if (mode === 'trial_7') {
    users[idx].subscriptionStatus = 'trial';
    users[idx].trialEndsAt = new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString();
  } else if (mode === 'trial_1') {
    users[idx].subscriptionStatus = 'trial';
    users[idx].trialEndsAt = new Date(now + 1 * 24 * 60 * 60 * 1000).toISOString();
  } else if (mode === 'expired') {
    users[idx].subscriptionStatus = 'expired';
    users[idx].trialEndsAt = new Date(now - 1000 * 60 * 60).toISOString();
  } else if (mode === 'active') {
    users[idx].subscriptionStatus = 'active';
    users[idx].subscriptionPaidAt = new Date().toISOString();
    users[idx].subscriptionExpiresAt = new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString();
  }

  saveRegisteredUsers(users);
  setCurrentUser(users[idx]);
  return users[idx];
}
