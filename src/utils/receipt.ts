import { Sale, CustomerDebt, BusinessSettings } from '../types';

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDateBR(isoString: string): string {
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return isoString;
  }
}

export function formatDateOnlyBR(isoString: string): string {
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  } catch {
    return isoString;
  }
}

export function getPaymentMethodLabel(method: string): string {
  switch (method) {
    case 'dinheiro':
      return 'Dinheiro Físico';
    case 'pix':
      return 'PIX';
    case 'cartao_debito':
      return 'Cartão de Débito';
    case 'cartao_credito':
      return 'Cartão de Crédito';
    case 'fiado':
      return 'A Prazo';
    default:
      return method;
  }
}

export function generateWhatsAppSaleReceipt(sale: Sale, settings: BusinessSettings): string {
  const lines: string[] = [
    `🧾 *COMPROVANTE DE VENDA*`,
    `🏪 *${settings.businessName || 'Venda na Rua'}*`,
    `📅 ${formatDateBR(sale.date)}`,
    `🔖 Pedido: ${sale.code}`,
    `--------------------------------`,
    `🛍️ *ITENS:*`,
  ];

  sale.items.forEach((item) => {
    lines.push(`• ${item.quantity}x ${item.name} — ${formatCurrency(item.subtotal)}`);
  });

  lines.push(`--------------------------------`);
  lines.push(`💵 *TOTAL: ${formatCurrency(sale.totalAmount)}*`);
  lines.push(`💳 *Forma:* ${getPaymentMethodLabel(sale.paymentMethod)}`);

  if (sale.paymentMethod === 'dinheiro' && sale.amountReceived) {
    lines.push(`📥 Valor Recebido: ${formatCurrency(sale.amountReceived)}`);
    if (sale.changeGiven && sale.changeGiven > 0) {
      lines.push(`🪙 Troco: ${formatCurrency(sale.changeGiven)}`);
    }
  }

  if (sale.paymentMethod === 'pix' && settings.pixKey) {
    lines.push(`🔑 *Chave Pix:* ${settings.pixKey} (${settings.pixKeyType.toUpperCase()})`);
  }

  if (sale.customerName) {
    lines.push(`👤 Cliente: ${sale.customerName}`);
  }

  lines.push(`--------------------------------`);
  lines.push(`🙏 _Obrigado pela preferência e confiança! Volte sempre!_`);
  if (settings.sellerName) {
    lines.push(`Atenciosamente, *${settings.sellerName}*`);
  }

  return lines.join('\n');
}

export function generateWhatsAppDebtReminder(
  debt: CustomerDebt,
  settings: BusinessSettings
): string {
  const lines: string[] = [
    `👋 Olá, *${debt.name}*! Tudo bem?`,
    `Passando para enviar o lembrete da sua comprinha no *${settings.businessName || 'Vende.ai'}*:`,
    ``,
    `📌 *Saldo em aberto:* ${formatCurrency(debt.totalOwed)}`,
    debt.dueDate ? `🗓️ *Vencimento combinado:* ${formatDateOnlyBR(debt.dueDate)}` : '',
    debt.lastPurchaseDate ? `📅 Última compra: ${formatDateOnlyBR(debt.lastPurchaseDate)}` : '',
    ``,
    settings.pixKey
      ? `🔑 *Chave Pix para pagamento:* ${settings.pixKey}\n(${settings.pixKeyType.toUpperCase()})`
      : `Pode acertar comigo na próxima visita ou no ponto!`,
    ``,
    `Qualquer dúvida estou à disposição. Muito obrigado pela confiança! 🙌`,
  ].filter(Boolean);

  return lines.join('\n');
}

export function generateWhatsAppCashSummary(
  dateStr: string,
  totalSales: number,
  totalExpenses: number,
  salesCount: number,
  byMethod: Record<string, number>,
  settings: BusinessSettings
): string {
  const net = totalSales - totalExpenses;
  const lines: string[] = [
    `📊 *FECHAMENTO DE CAIXA - ${settings.businessName || 'Vende.ai'}*`,
    `📅 Data: ${dateStr}`,
    `👤 Vendedor(a): ${settings.sellerName || 'Vendedor'}`,
    `--------------------------------`,
    `📈 *Vendas Totais:* ${formatCurrency(totalSales)} (${salesCount} vendas)`,
    `📉 *Despesas da Rua:* ${formatCurrency(totalExpenses)}`,
    `💰 *LUCRO LÍQUIDO DO DIA: ${formatCurrency(net)}*`,
    `--------------------------------`,
    `📋 *Entradas por Forma:*`,
    `• 💵 Dinheiro: ${formatCurrency(byMethod['dinheiro'] || 0)}`,
    `• ⚡ PIX: ${formatCurrency(byMethod['pix'] || 0)}`,
    `• 💳 Cartão Débito: ${formatCurrency(byMethod['cartao_debito'] || 0)}`,
    `• 💳 Cartão Crédito: ${formatCurrency(byMethod['cartao_credito'] || 0)}`,
    `• 📝 A Prazo (a receber): ${formatCurrency(byMethod['fiado'] || 0)}`,
    `--------------------------------`,
    `🚀 Registrado via Vende.ai`,
  ];

  return lines.join('\n');
}
