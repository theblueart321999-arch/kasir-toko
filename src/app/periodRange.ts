export type ReportPeriod = "today" | "week" | "month" | "year" | "custom";

export function periodRange(period: ReportPeriod, month: number, year: number, from: string, to: string) {
  const current = new Date();
  const currentDay = current.toISOString().slice(0, 10);
  if (period === "today") return { from: currentDay, to: currentDay };
  if (period === "week") {
    const start = new Date(current);
    start.setDate(start.getDate() - 6);
    return { from: start.toISOString().slice(0, 10), to: currentDay };
  }
  if (period === "month") {
    const lastDay = new Date(year, month, 0).getDate();
    return { from: `${year}-${String(month).padStart(2, "0")}-01`, to: `${year}-${String(month).padStart(2, "0")}-${lastDay}` };
  }
  if (period === "year") return { from: `${year}-01-01`, to: `${year}-12-31` };
  return { from, to };
}
