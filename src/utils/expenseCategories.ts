import React from 'react';
import {
  Fuel,
  Utensils,
  Package,
  ShoppingBag,
  Percent,
  Wrench,
  MoreHorizontal,
  Home,
  Droplet,
  Smartphone,
  Users,
  Tag,
  Truck,
} from 'lucide-react';

export function normalizeExpenseCategoryName(catOrId: string): string {
  if (!catOrId) return 'Outras Despesas';
  const legacyMap: Record<string, string> = {
    combustivel: 'Combustível',
    alimentacao: 'Alimentação / Lanche',
    estoque: 'Reposição Estoque',
    embalagem: 'Sacolas / Embalagem',
    taxa: 'Taxa Maquininha',
    manutencao: 'Manutenção',
    outros: 'Outras Despesas',
  };
  return legacyMap[catOrId] || catOrId;
}

export function getExpenseCategoryIcon(categoryName: string): React.FC<{ className?: string }> {
  if (!categoryName) return Tag;
  const lower = categoryName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  if (lower.includes('combustiv') || lower.includes('gasolina') || lower.includes('transporte') || lower.includes('passag')) {
    return Fuel;
  }
  if (lower.includes('aliment') || lower.includes('almoc') || lower.includes('lanche') || lower.includes('cafe') || lower.includes('comida') || lower.includes('refeic')) {
    return Utensils;
  }
  if (lower.includes('estoque') || lower.includes('mercadoria') || lower.includes('atacado') || lower.includes('produto') || lower.includes('forneced')) {
    return Package;
  }
  if (lower.includes('embalag') || lower.includes('sacola') || lower.includes('pote') || lower.includes('descartav')) {
    return ShoppingBag;
  }
  if (lower.includes('taxa') || lower.includes('maquininha') || lower.includes('juros') || lower.includes('impost')) {
    return Percent;
  }
  if (lower.includes('manutenc') || lower.includes('conserto') || lower.includes('oficina') || lower.includes('mecanic') || lower.includes('ferrament')) {
    return Wrench;
  }
  if (lower.includes('aluguel') || lower.includes('ponto') || lower.includes('barraca') || lower.includes('espaco')) {
    return Home;
  }
  if (lower.includes('agua') || lower.includes('gelo') || lower.includes('gas')) {
    return Droplet;
  }
  if (lower.includes('telefone') || lower.includes('internet') || lower.includes('recarga') || lower.includes('celular')) {
    return Smartphone;
  }
  if (lower.includes('ajudante') || lower.includes('diaria') || lower.includes('funcionario') || lower.includes('equipe')) {
    return Users;
  }
  if (lower.includes('frete') || lower.includes('entrega') || lower.includes('carreto')) {
    return Truck;
  }
  if (lower.includes('outro') || lower.includes('divers') || lower.includes('avuls')) {
    return MoreHorizontal;
  }

  return Tag;
}
