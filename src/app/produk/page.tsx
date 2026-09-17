import { redirect } from "next/navigation";
import { getCurrentOperator } from "@/lib/auth";
import ProdukManager from "./ProdukManager";

export default async function ProdukPage() {
  const operator = await getCurrentOperator();
  if (!operator) redirect("/login");
  if (!["ADMIN", "OWNER"].includes(operator.role)) redirect("/dashboard");
  return <ProdukManager operatorName={operator.name} />;
}
