import { redirect } from "next/navigation";
import { getCurrentOperator } from "@/lib/auth";
import TransactionReportDashboard from "../TransactionReportDashboard";

export default async function SalesReportPage() {
  if (!(await getCurrentOperator())) redirect("/login");
  return <TransactionReportDashboard kind="sales" />;
}
