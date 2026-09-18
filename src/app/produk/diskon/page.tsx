import { redirect } from "next/navigation";
import { getCurrentOperator } from "@/lib/auth";
import DiscountManager from "./DiscountManager";

export default async function DiscountPage() {
  const operator = await getCurrentOperator();
  if (!operator) redirect("/login");
  if (!["ADMIN", "OWNER"].includes(operator.role)) redirect("/dashboard");
  return <DiscountManager operatorName={operator.name} />;
}
