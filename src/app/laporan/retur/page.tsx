import { redirect } from "next/navigation";
import { getCurrentOperator } from "@/lib/auth";
import TransactionReportDashboard from "../TransactionReportDashboard";

export default async function ReturnReportPage() {
  if (!(await getCurrentOperator())) redirect("/login");
  return <TransactionReportDashboard kind="returns" />;
}
