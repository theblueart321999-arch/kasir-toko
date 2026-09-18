import { redirect } from "next/navigation";
import { getCurrentOperator } from "@/lib/auth";
import LowStockManager from "./LowStockManager";

export default async function LowStockPage() {
  const operator = await getCurrentOperator();
  if (!operator) redirect("/login");
  if (!["ADMIN", "OWNER"].includes(operator.role)) redirect("/dashboard");
  return <LowStockManager operatorName={operator.name} />;
}
