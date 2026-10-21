import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  Trophy,
  TrendingUp,
  PackageCheck,
  CreditCard,
  QrCode,
  Banknote,
  BookUser,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Sale, BusinessSettings } from '../types';
import { formatCurrency, formatDateOnlyBR } from '../utils/receipt';

interface SalesAnalyticsChartsProps {
  sales: Sale[];
  settings: BusinessSettings;
}

export const SalesAnalyticsCharts: React.FC<SalesAnalyticsChartsProps> = ({
  sales,
  settings,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // 1. Group sales by day (last 7 active days or last 7 calendar days)
  const { dailyData, bestDay, totalPeriodSales } = useMemo(() => {
    const completed = sales.filter((s) => s.status === 'concluida');

    // Create a 7-day range ending today
    const days: { dateStr: string; label: string; dayOfWeek: string; total: number; count: number }[] = [];
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayOfWeek = dayNames[d.getDay()];
      const [, m, dayNum] = dateStr.split('-');
      const label = `${dayNum}/${m}`;

      const daySales = completed.filter((s) => s.date.startsWith(dateStr));
      const total = daySales.reduce((acc, s) => acc + s.totalAmount, 0);

      days.push({
        dateStr,
        label,
        dayOfWeek,
        total,
        count: daySales.length,
      });
    }

    // Identify the best day (day with the highest sales)
    let best = days[0];
    let maxVal = -1;
    days.forEach((d) => {
      if (d.total > maxVal) {
        maxVal = d.total;
        best = d;
      }
    });

    const totalPeriodSales = days.reduce((acc, d) => acc + d.total, 0);

    return {
      dailyData: days,
      bestDay: maxVal > 0 ? best : null,
      totalPeriodSales,
    };
  }, [sales]);

  // 2. Ranking of most sold products
  const topProducts = useMemo(() => {
    const productMap = new Map<string, { name: string; quantity: number; revenue: number }>();

    sales
      .filter((s) => s.status === 'concluida')
      .forEach((sale) => {
        sale.items.forEach((item) => {
          const key = item.name.trim();
          const existing = productMap.get(key) || { name: key, quantity: 0, revenue: 0 };
          existing.quantity += item.quantity;
          existing.revenue += item.subtotal;
          productMap.set(key, existing);
        });
      });

    const list = Array.from(productMap.values()).sort((a, b) => b.quantity - a.quantity);
    return list.slice(0, 5);
  }, [sales]);

  // 3. Most used payment methods
  const paymentBreakdown = useMemo(() => {
    const counts: Record<string, { label: string; amount: number; count: number; color: string; icon: any }> = {
      pix: { label: 'PIX', amount: 0, count: 0, color: 'bg-emerald-500', icon: QrCode },
      dinheiro: { label: 'Dinheiro', amount: 0, count: 0, color: 'bg-teal-500', icon: Banknote },
      cartao: { label: 'Cartões', amount: 0, count: 0, color: 'bg-blue-500', icon: CreditCard },
      fiado: { label: 'A Prazo', amount: 0, count: 0, color: 'bg-amber-500', icon: BookUser },
    };

    let grandTotal = 0;
    sales
      .filter((s) => s.status === 'concluida')
      .forEach((s) => {
        grandTotal += s.totalAmount;
        if (s.paymentMethod === 'pix') {
          counts.pix.amount += s.totalAmount;
          counts.pix.count += 1;
        } else if (s.paymentMethod === 'dinheiro') {
          counts.dinheiro.amount += s.totalAmount;
          counts.dinheiro.count += 1;
        } else if (s.paymentMethod === 'cartao_debito' || s.paymentMethod === 'cartao_credito') {
          counts.cartao.amount += s.totalAmount;
          counts.cartao.count += 1;
        } else if (s.paymentMethod === 'fiado') {
          counts.fiado.amount += s.totalAmount;
          counts.fiado.count += 1;
        }
      });

    const items = Object.values(counts).map((c) => ({
      ...c,
      percentage: grandTotal > 0 ? Math.round((c.amount / grandTotal) * 100) : 0,
    }));

    // Find the most used method
    const sorted = [...items].sort((a, b) => b.amount - a.amount);
    const mostUsed = sorted[0].amount > 0 ? sorted[0] : null;

    return { items, mostUsed, grandTotal };
  }, [sales]);

  // Max value for bar chart scaling
  const maxDailyValue = Math.max(...dailyData.map((d) => d.total), 10);

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-xs space-y-4">
      {/* Header with toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 leading-tight">
              Desempenho &amp; Gráficos
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Comparativo diário, produtos e pagamentos
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-slate-500 hover:text-slate-800 p-1 flex items-center gap-1 font-semibold"
        >
          <span>{isExpanded ? 'Recolher' : 'Ver Gráficos'}</span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-5 pt-1">
          {/* GRÁFICO 1: COMPARATIVO DIÁRIO E DIA QUE MAIS VENDEU */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Vendas por Dia (Últimos 7 Dias)
              </span>
              <span className="text-xs font-mono-numbers text-slate-500">
                Total: <strong>{formatCurrency(totalPeriodSales)}</strong>
              </span>
            </div>

            {/* Best day highlight badge */}
            {bestDay && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Trophy className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] font-bold text-emerald-950 block truncate">
                      Dia Recorde: {bestDay.dayOfWeek} ({bestDay.label})
                    </span>
                    <span className="text-[10px] text-emerald-700 font-medium">
                      O dia que mais vendeu nesta semana
                    </span>
                  </div>
                </div>
                <span className="text-sm font-black text-emerald-700 font-mono-numbers shrink-0">
                  {formatCurrency(bestDay.total)}
                </span>
              </div>
            )}

            {/* Bar Chart View */}
            <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-3 pt-6">
              <div className="grid grid-cols-7 items-end gap-1.5 h-32">
                {dailyData.map((d) => {
                  const isTopDay = bestDay && d.dateStr === bestDay.dateStr && d.total > 0;
                  const heightPercent = maxDailyValue > 0 ? Math.max(8, Math.round((d.total / maxDailyValue) * 100)) : 8;

                  return (
                    <div key={d.dateStr} className="flex flex-col items-center h-full justify-end group">
                      {/* Value label on top */}
                      <span className="text-[9px] font-bold text-slate-600 font-mono-numbers mb-1 truncate max-w-full text-center">
                        {d.total > 0 ? Math.round(d.total) : ''}
                      </span>

                      {/* Bar pillar */}
                      <div className="w-full max-w-[28px] bg-slate-200/80 rounded-t-lg overflow-hidden flex flex-col justify-end transition-all">
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className={`w-full rounded-t-lg transition-all duration-500 ${
                            isTopDay
                              ? 'bg-emerald-600 shadow-sm'
                              : d.total > 0
                              ? 'bg-emerald-400'
                              : 'bg-slate-200'
                          }`}
                        />
                      </div>

                      {/* Day Label */}
                      <div className="text-center mt-1.5 leading-tight">
                        <span className={`block text-[10px] font-bold ${isTopDay ? 'text-emerald-700' : 'text-slate-600'}`}>
                          {d.dayOfWeek}
                        </span>
                        <span className="block text-[8px] text-slate-400">
                          {d.label.split('/')[0]}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* GRÁFICO 2: PRODUTOS MAIS VENDIDOS */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Produtos Mais Vendidos
              </span>
              <span className="text-[11px] text-slate-400">Ranking por saída</span>
            </div>

            {topProducts.length === 0 ? (
              <p className="text-xs text-slate-400 py-2 text-center">
                Nenhum produto vendido ainda. Realize vendas para ver os mais vendidos!
              </p>
            ) : (
              <div className="space-y-2">
                {topProducts.map((p, idx) => {
                  const maxQty = topProducts[0]?.quantity || 1;
                  const percent = Math.max(10, Math.round((p.quantity / maxQty) * 100));
                  const medals = ['🥇', '🥈', '🥉', '4º', '5º'];

                  return (
                    <div key={p.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-xs shrink-0">{medals[idx]}</span>
                          <span className="font-bold text-slate-800 truncate">{p.name}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 font-mono-numbers">
                          <span className="font-bold text-emerald-700">{p.quantity} un</span>
                          <span className="text-slate-400 text-[11px]">({formatCurrency(p.revenue)})</span>
                        </div>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* GRÁFICO 3: FORMAS DE PAGAMENTOS MAIS UTILIZADAS */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Formas de Pagamento Mais Utilizadas
              </span>
              {paymentBreakdown.mostUsed && (
                <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">
                  Mais usado: {paymentBreakdown.mostUsed.label} ({paymentBreakdown.mostUsed.percentage}%)
                </span>
              )}
            </div>

            {/* Segmented distribution bar */}
            {paymentBreakdown.grandTotal > 0 ? (
              <div className="space-y-2.5">
                <div className="w-full h-3 rounded-full bg-slate-100 flex overflow-hidden">
                  {paymentBreakdown.items.map((m) => {
                    if (m.percentage <= 0) return null;
                    return (
                      <div
                        key={m.label}
                        style={{ width: `${m.percentage}%` }}
                        className={`${m.color} h-full transition-all`}
                        title={`${m.label}: ${m.percentage}%`}
                      />
                    );
                  })}
                </div>

                {/* Grid of payment methods with amount & percentage */}
                <div className="grid grid-cols-2 gap-2">
                  {paymentBreakdown.items.map((m) => {
                    const Icon = m.icon;
                    return (
                      <div
                        key={m.label}
                        className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className={`w-2.5 h-2.5 rounded-full ${m.color} shrink-0`} />
                          <span className="font-semibold text-slate-700 truncate">{m.label}</span>
                        </div>
                        <div className="text-right font-mono-numbers">
                          <div className="font-bold text-slate-900">{formatCurrency(m.amount)}</div>
                          <div className="text-[10px] text-slate-400">{m.percentage}% ({m.count}x)</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-2 text-center">
                Nenhum pagamento registrado ainda.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
