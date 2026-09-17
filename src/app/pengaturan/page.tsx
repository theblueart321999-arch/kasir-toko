import { redirect } from "next/navigation";
import { getCurrentOperator } from "@/lib/auth";
import SettingsManager from "./SettingsManager";

export default async function SettingsPage() {
  const operator = await getCurrentOperator();
  if (!operator) redirect("/login");
  if (!["ADMIN", "OWNER"].includes(operator.role)) redirect("/dashboard");
  return <SettingsManager />;
}
