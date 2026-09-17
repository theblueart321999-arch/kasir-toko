import { redirect } from "next/navigation";
import { getCurrentOperator } from "@/lib/auth";
import StockHistoryManager from "./StockHistoryManager";

export default async function StockHistoryPage() {
  const operator = await getCurrentOperator();
  if (!operator) redirect("/login");
  if (!["ADMIN", "OWNER"].includes(operator.role)) redirect("/dashboard");
  return <StockHistoryManager operatorName={operator.name} />;
}
