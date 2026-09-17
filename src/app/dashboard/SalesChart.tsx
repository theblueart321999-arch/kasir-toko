"use client";

import { useEffect, useState } from "react";

type ChartPoint = { key: string; label: string; dateLabel: string; total: number };
type Period = "day" | "week" | "month" | "year" | "custom";

function dateValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function rangeFor(period: Period, customFrom: string, customTo: string) {
  const to = new Date();
  const from = new Date(to);
  if (period === "day") from.setDate(from.getDate());
  if (period === "week") from.setDate(from.getDate() - 6);
  if (period === "month") from.setDate(from.getDate() - 29);
  if (period === "year") from.setMonth(from.getMonth() - 11);
  return {
    from: period === "custom" ? customFrom : dateValue(from),
    to: period === "custom" ? customTo : dateValue(to),
    group: period === "year" ? "month" : "day",
  };
}

export default function SalesChart({ initialPoints }: { initialPoints: ChartPoint[] }) {
  const today = dateValue(new Date());
  const [period, setPeriod] = useState<Period>("week");
  const [customFrom, setCustomFrom] = useState(today);
  const [customTo, setCustomTo] = useState(today);
  const [points, setPoints] = useState(initialPoints);

  useEffect(() => {
    const range = rangeFor(period, customFrom, customTo);
    if (period === "custom" && (!customFrom || !customTo || customFrom > customTo)) return;
    const controller = new AbortController();
    fetch(`/api/reports/sales-chart?from=${range.from}&to=${range.to}&group=${range.group}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Grafik gagal dimuat");
        return response.json() as Promise<{ points: ChartPoint[] }>;
      })
      .then((data) => setPoints(data.points))
      .catch((error: unknown) => { if ((error as Error).name !== "AbortError") setPoints([]); })
    return () => controller.abort();
  }, [period, customFrom, customTo]);

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
      <div className="chart-periods" role="group" aria-label="Periode grafik penjualan">
        {([["day", "Hari ini"], ["week", "7 Hari"], ["month", "1 Bulan"], ["year", "1 Tahun"], ["custom", "Rentang"]] as [Period, string][]).map(([value, label]) => (
          <button className={period === value ? "active" : ""} key={value} onClick={() => setPeriod(value)} type="button">{label}</button>
        ))}
      </div>
      {period === "custom" && <div className="chart-custom-range"><label>Dari<input type="date" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} /></label><label>Sampai<input type="date" value={customTo} onChange={(event) => setCustomTo(event.target.value)} /></label></div>}
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
