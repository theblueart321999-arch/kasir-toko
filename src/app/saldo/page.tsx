import { redirect } from "next/navigation";
import { getCurrentOperator } from "@/lib/auth";
import BalanceReport from "./BalanceReport";

export default async function BalancePage() {
  if (!(await getCurrentOperator())) redirect("/login");
  return <BalanceReport />;
}
