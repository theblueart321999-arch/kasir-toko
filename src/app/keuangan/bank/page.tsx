import { redirect } from "next/navigation";
import { getCurrentOperator } from "@/lib/auth";
import FinanceManager from "../FinanceManager";

export default async function BankAccountsPage() {
  const operator = await getCurrentOperator();
  if (!operator) redirect("/login");
  return <FinanceManager view="bank" />;
}
