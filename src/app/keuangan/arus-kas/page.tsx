import { redirect } from "next/navigation";
import { getCurrentOperator } from "@/lib/auth";
import FinanceManager from "../FinanceManager";

export default async function CashFlowPage() {
  if (!(await getCurrentOperator())) redirect("/login");
  return <FinanceManager view="history" />;
}
