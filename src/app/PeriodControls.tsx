"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { type ReportPeriod } from "./periodRange";

export default function PeriodControls({ initialPeriod = "today", initialMonth = new Date().getMonth() + 1, initialYear = new Date().getFullYear(), initialFrom = new Date().toISOString().slice(0, 10), initialTo = new Date().toISOString().slice(0, 10) }: { initialPeriod?: ReportPeriod; initialMonth?: number; initialYear?: number; initialFrom?: string; initialTo?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const period = (params.get("period") as ReportPeriod | null) || initialPeriod;
  const month = Number(params.get("month") || initialMonth);
  const year = Number(params.get("year") || initialYear);
  const from = params.get("from") || initialFrom;
  const to = params.get("to") || initialTo;
  const years = useMemo(() => Array.from({ length: 12 }, (_, index) => new Date().getFullYear() - index), []);
  function update(values: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    Object.entries(values).forEach(([key, value]) => next.set(key, value));
    router.push(`${pathname}?${next.toString()}`);
  }
  return <div className="report-period-control" aria-label="Filter periode laporan">
    <p>PERIODE LAPORAN</p>
    <div className="chart-periods">
      {([["today", "Hari ini"], ["week", "7 Hari"], ["month", "Bulanan"], ["year", "Tahunan"], ["custom", "Rentang"]] as [ReportPeriod, string][]).map(([value, label]) => <button type="button" className={period === value ? "active" : ""} key={value} onClick={() => update({ period: value })}>{label}</button>)}
    </div>
    {(period === "month" || period === "year") && <div className="report-period-selectors">
      {period === "month" && <label>Bulan<select value={month} onChange={(event) => update({ month: event.target.value })}>{Array.from({ length: 12 }, (_, index) => <option value={index + 1} key={index + 1}>{new Intl.DateTimeFormat("id-ID", { month: "long" }).format(new Date(2020, index, 1))}</option>)}</select></label>}
      <label>Tahun<select value={year} onChange={(event) => update({ year: event.target.value })}>{years.map((item) => <option value={item} key={item}>{item}</option>)}</select></label>
    </div>}
    {period === "custom" && <div className="chart-custom-range"><label>Dari<input type="date" value={from} onChange={(event) => update({ from: event.target.value })} /></label><label>Sampai<input type="date" value={to} onChange={(event) => update({ to: event.target.value })} /></label></div>}
  </div>;
}
