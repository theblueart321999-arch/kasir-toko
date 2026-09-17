import { redirect } from "next/navigation";
import { getCurrentOperator } from "@/lib/auth";
import KontakManager from "./KontakManager";

export default async function KontakPage() {
  const operator = await getCurrentOperator();
  if (!operator) redirect("/login");
  return <KontakManager operatorName={operator.name} canManage={["ADMIN", "OWNER"].includes(operator.role)} />;
}
