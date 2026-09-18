import { redirect } from "next/navigation";
import { getCurrentOperator } from "@/lib/auth";
import OperatorManager from "./OperatorManager";

export default async function OperatorPage() {
  const operator = await getCurrentOperator();
  if (!operator) redirect("/login");
  if (!["ADMIN", "OWNER"].includes(operator.role)) redirect("/dashboard");
  return <OperatorManager />;
}
