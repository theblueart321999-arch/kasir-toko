import { redirect } from "next/navigation";
import { getCurrentOperator } from "@/lib/auth";
import StokManager from "./StokManager";

export default async function StokPage() {
  const operator = await getCurrentOperator();
  if (!operator) redirect("/login");
  if (!["ADMIN", "OWNER"].includes(operator.role)) redirect("/dashboard");
  return <StokManager operatorName={operator.name} />;
}
