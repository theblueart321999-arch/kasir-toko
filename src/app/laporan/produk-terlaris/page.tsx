import { redirect } from "next/navigation";
import { getCurrentOperator } from "@/lib/auth";
import TopProductsDashboard from "../TopProductsDashboard";

export default async function TopProductsPage() {
  if (!(await getCurrentOperator())) redirect("/login");
  return <TopProductsDashboard />;
}
