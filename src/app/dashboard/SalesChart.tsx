"use client";

import { useEffect, useState } from "react";

type ChartPoint = { key: string; label: string; dateLabel: string; total: number };
export type Period = "day" | "week" | "month" | "year" | "custom";
export type ChartRange = { from: string; to: string; group: string };

function dateValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function rangeFor(period: Period, customFrom: string, customTo: string, month: number, year: number) {
  const to = new Date();
  const from = new Date(to);
  if (period === "day") from.setDate(from.getDate());
  if (period === "week") from.setDate(from.getDate() - 6);
  if (period === "month") return { from: `${year}-${String(month).padStart(2, "0")}-01`, to: dateValue(new Date(year, month, 0)), group: "day" };
  if (period === "year") return { from: `${year}-01-01`, to: `${year}-12-31`, group: "month" };
  return {
    from: period === "custom" ? customFrom : dateValue(from),
    to: period === "custom" ? customTo : dateValue(to),
    group: "day",
  };
}

type SalesChartProps = {
  initialPoints: ChartPoint[];
  onRangeChange?: (range: ChartRange) => void;
  rangeOverride?: ChartRange;
  showControls?: boolean;
  period?: Period;
  customFrom?: string;
  customTo?: string;
  onPeriodChange?: (period: Period) => void;
  onCustomRangeChange?: (from: string, to: string) => void;
};

export default function SalesChart({ initialPoints, onRangeChange, rangeOverride, showControls = true, period: controlledPeriod, customFrom: controlledFrom, customTo: controlledTo, onPeriodChange, onCustomRangeChange }: SalesChartProps) {
  const today = dateValue(new Date());
  const [internalPeriod, setInternalPeriod] = useState<Period>("week");
  const [internalFrom, setInternalFrom] = useState(today);
  const [internalTo, setInternalTo] = useState(today);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const period = controlledPeriod ?? internalPeriod;
  const customFrom = controlledFrom ?? internalFrom;
  const customTo = controlledTo ?? internalTo;
  const [points, setPoints] = useState(initialPoints);

  useEffect(() => {
    const range = rangeOverride ?? rangeFor(period, customFrom, customTo, selectedMonth, selectedYear);
    if (period === "custom" && (!customFrom || !customTo || customFrom > customTo)) return;
    onRangeChange?.(range);
    const controller = new AbortController();
    fetch(`/api/reports/sales-chart?from=${range.from}&to=${range.to}&group=${range.group}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Grafik gagal dimuat");
        return response.json() as Promise<{ points: ChartPoint[] }>;
      })
      .then((data) => setPoints(data.points))
      .catch((error: unknown) => { if ((error as Error).name !== "AbortError") setPoints([]); })
    return () => controller.abort();
  }, [period, customFrom, customTo, onRangeChange, rangeOverride, selectedMonth, selectedYear]);

  const format = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
  const max = Math.max(...points.map((point) => point.total), 1);
  const chartPoints = points.map((point, index) => `${points.length === 1 ? 50 : (index / (points.length - 1)) * 100},${100 - (point.total / max) * 86}`).join(" ");
  const displayPoints = points.length > 30 ? points.filter((_, index) => index % Math.ceil(points.length / 14) === 0 || index === points.length - 1) : points;

  return (
    <section className="dashboard-chart" aria-labelledby="sales-chart-title">
      <div className="dashboard-chart-header">
        <div><h2 id="sales-chart-title">Grafik Penjualan</h2><p>Performa penjualan berdasarkan periode yang dipilih</p></div>
        <strong>{format(points.reduce((sum, point) => sum + point.total, 0))}</strong>
      </div>
      {showControls && <div className="chart-periods" role="group" aria-label="Periode grafik penjualan">
        {([["day", "Hari ini"], ["week", "7 Hari"], ["month", "Bulanan"], ["year", "Tahunan"], ["custom", "Rentang"]] as [Period, string][]).map(([value, label]) => (
          <button className={period === value ? "active" : ""} key={value} onClick={() => { setInternalPeriod(value); onPeriodChange?.(value); }} type="button">{label}</button>
        ))}
      </div>}
      {showControls && period === "custom" && <div className="chart-custom-range"><label>Dari<input type="date" value={customFrom} onChange={(event) => { setInternalFrom(event.target.value); onCustomRangeChange?.(event.target.value, customTo); }} /></label><label>Sampai<input type="date" value={customTo} onChange={(event) => { setInternalTo(event.target.value); onCustomRangeChange?.(customFrom, event.target.value); }} /></label></div>}
      {showControls && (period === "month" || period === "year") && <div className="report-period-selectors chart-period-selectors">
        {period === "month" && <label>Bulan<select value={selectedMonth} onChange={(event) => setSelectedMonth(Number(event.target.value))}>{Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{new Intl.DateTimeFormat("id-ID", { month: "long" }).format(new Date(2020, index, 1))}</option>)}</select></label>}
        <label>Tahun<select value={selectedYear} onChange={(event) => setSelectedYear(Number(event.target.value))}>{Array.from({ length: 12 }, (_, index) => <option key={selectedYear - index} value={selectedYear - index}>{selectedYear - index}</option>)}</select></label>
      </div>}
      <div className="sales-chart">
        <div className="sales-chart-y-axis"><span>{format(max)}</span><span>{format(max / 2)}</span><span>Rp0</span></div>
        <div className="sales-chart-area">
          <div className="sales-chart-grid"><i /><i /><i /></div>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Grafik penjualan">
            <polygon points={`0,100 ${chartPoints} 100,100`} />
            <polyline points={chartPoints} />
            {points.map((point, index) => <circle cx={points.length === 1 ? 50 : (index / (points.length - 1)) * 100} cy={100 - (point.total / max) * 86} key={point.key} r="1.7" />)}
          </svg>
          <div className="sales-chart-labels">{displayPoints.map((point) => <span key={point.key} title={`${point.dateLabel}: ${format(point.total)}`}>{point.label}</span>)}</div>
        </div>
      </div>
    </section>
  );
}
