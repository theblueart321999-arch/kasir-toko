import { redirect } from "next/navigation";
import { getCurrentOperator } from "@/lib/auth";
import PriceLevelManager from "./PriceLevelManager";

export default async function PriceLevelPage() {
  const operator = await getCurrentOperator();
  if (!operator) redirect("/login");
  if (!["ADMIN", "OWNER"].includes(operator.role)) redirect("/dashboard");
  return <PriceLevelManager operatorName={operator.name} />;
}
