import React, { useMemo, useState } from 'react';
import {
  LineChart as LineChartIcon,
  Trophy,
  TrendingUp,
  CreditCard,
  QrCode,
  Banknote,
  BookUser,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Sale, BusinessSettings } from '../types';
import { formatCurrency } from '../utils/receipt';

interface SalesAnalyticsChartsProps {
  sales: Sale[];
  settings: BusinessSettings;
}

export const SalesAnalyticsCharts: React.FC<SalesAnalyticsChartsProps> = ({
  sales,
  settings,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activePointIndex, setActivePointIndex] = useState<number | null>(null);

  // 1. Group sales by day (last 7 calendar days)
  const { dailyData, bestDay, totalPeriodSales } = useMemo(() => {
    const completed = sales.filter((s) => s.status === 'concluida');

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

  // Max value for line chart scaling
  const maxDailyValue = Math.max(...dailyData.map((d) => d.total), 10);

  // SVG Line Chart coordinates calculation
  const svgWidth = 330;
  const svgHeight = 125;
  const paddingX = 24;
  const paddingTop = 26;
  const paddingBottom = 100;
  const availableWidth = svgWidth - paddingX * 2;
  const stepX = availableWidth / (dailyData.length - 1);
  const availableHeight = paddingBottom - paddingTop;

  const chartPoints = useMemo(() => {
    return dailyData.map((d, i) => {
      const x = paddingX + i * stepX;
      // Invert Y: higher sales value gives smaller Y
      const ratio = maxDailyValue > 0 ? d.total / maxDailyValue : 0;
      const y = paddingBottom - ratio * availableHeight;
      const isTop = bestDay && d.dateStr === bestDay.dateStr && d.total > 0;
      return { ...d, x, y, isTop, index: i };
    });
  }, [dailyData, maxDailyValue, bestDay, availableHeight, paddingX, paddingBottom, stepX]);

  // Construct smooth SVG Bezier curve line & area
  const { linePathD, areaPathD } = useMemo(() => {
    if (chartPoints.length === 0) return { linePathD: '', areaPathD: '' };

    let line = `M ${chartPoints[0].x} ${chartPoints[0].y}`;
    for (let i = 0; i < chartPoints.length - 1; i++) {
      const current = chartPoints[i];
      const next = chartPoints[i + 1];
      const cpX = (current.x + next.x) / 2;
      line += ` C ${cpX} ${current.y}, ${cpX} ${next.y}, ${next.x} ${next.y}`;
    }

    const last = chartPoints[chartPoints.length - 1];
    const first = chartPoints[0];
    const area = `${line} L ${last.x} ${paddingBottom} L ${first.x} ${paddingBottom} Z`;

    return { linePathD: line, areaPathD: area };
  }, [chartPoints, paddingBottom]);

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

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-xs space-y-4">
      {/* Header with toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <LineChartIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 leading-tight">
              Desempenho &amp; Gráficos
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Evolução em linha, produtos e pagamentos
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
          {/* GRÁFICO 1: GRÁFICO DE LINHAS (COMPARATIVO DIÁRIO E DIA QUE MAIS VENDEU) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                <span>Gráfico de Vendas por Linha</span>
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

            {/* SVG Line Chart View */}
            <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-3 pt-3">
              <div className="w-full overflow-hidden">
                <svg
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  className="w-full h-36 overflow-visible select-none"
                >
                  <defs>
                    {/* Emerald area gradient under line */}
                    <linearGradient id="emeraldAreaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>

                    {/* Glow filter for record day */}
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#059669" floodOpacity="0.3" />
                    </filter>
                  </defs>

                  {/* Horizontal Guideline: Top / Mid / Baseline */}
                  <line
                    x1={paddingX}
                    y1={paddingTop}
                    x2={svgWidth - paddingX}
                    y2={paddingTop}
                    stroke="#e2e8f0"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                  <line
                    x1={paddingX}
                    y1={(paddingTop + paddingBottom) / 2}
                    x2={svgWidth - paddingX}
                    y2={(paddingTop + paddingBottom) / 2}
                    stroke="#e2e8f0"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                  <line
                    x1={paddingX}
                    y1={paddingBottom}
                    x2={svgWidth - paddingX}
                    y2={paddingBottom}
                    stroke="#cbd5e1"
                    strokeWidth="1"
                  />

                  {/* Shaded Area Fill */}
                  <path d={areaPathD} fill="url(#emeraldAreaGradient)" />

                  {/* Continuous Line Curve */}
                  <path
                    d={linePathD}
                    fill="none"
                    stroke="#059669"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-all duration-300"
                  />

                  {/* Chart Points, Value labels & Record Day Badge */}
                  {chartPoints.map((pt) => {
                    const isHovered = activePointIndex === pt.index;

                    return (
                      <g key={pt.dateStr} className="cursor-pointer">
                        {/* Hover vertical bar guide */}
                        {isHovered && (
                          <line
                            x1={pt.x}
                            y1={paddingTop}
                            x2={pt.x}
                            y2={paddingBottom}
                            stroke="#059669"
                            strokeWidth="1.5"
                            strokeDasharray="2 2"
                            opacity="0.6"
                          />
                        )}

                        {/* Top day pulse halo */}
                        {pt.isTop && (
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r="9"
                            fill="#a7f3d0"
                            opacity="0.6"
                            className="animate-pulse"
                          />
                        )}

                        {/* Point Circle */}
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={pt.isTop ? 5.5 : pt.total > 0 ? 4 : 3}
                          fill={pt.isTop ? '#047857' : pt.total > 0 ? '#10b981' : '#cbd5e1'}
                          stroke="#ffffff"
                          strokeWidth={pt.isTop ? 2.5 : 2}
                          filter={pt.isTop ? 'url(#glow)' : undefined}
                          onMouseEnter={() => setActivePointIndex(pt.index)}
                          onMouseLeave={() => setActivePointIndex(null)}
                          onTouchStart={() => setActivePointIndex(pt.index)}
                        />

                        {/* Value Text Above Point */}
                        {pt.total > 0 && (
                          <text
                            x={pt.x}
                            y={pt.y - 7}
                            textAnchor="middle"
                            className={`text-[9px] font-bold font-mono-numbers fill-slate-800 ${
                              pt.isTop ? 'font-black fill-emerald-800' : ''
                            }`}
                          >
                            {Math.round(pt.total)}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Day Labels below chart aligned with 7 columns */}
              <div className="grid grid-cols-7 pt-1 text-center">
                {dailyData.map((d) => {
                  const isTopDay = bestDay && d.dateStr === bestDay.dateStr && d.total > 0;

                  return (
                    <div key={d.dateStr} className="flex flex-col items-center">
                      <span
                        className={`text-[10px] font-bold leading-tight ${
                          isTopDay ? 'text-emerald-700 font-extrabold' : 'text-slate-600'
                        }`}
                      >
                        {d.dayOfWeek}
                      </span>
                      <span className="text-[9px] text-slate-400">
                        {d.label.split('/')[0]}
                      </span>
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
