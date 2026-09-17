import { redirect } from "next/navigation";
import { getCurrentOperator } from "@/lib/auth";
import FinanceManager from "./FinanceManager";

export default async function FinancePage() {
  const operator = await getCurrentOperator();
  if (!operator) redirect("/login");
  return <FinanceManager />;
}
