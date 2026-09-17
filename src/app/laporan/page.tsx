import { redirect } from "next/navigation";
import { getCurrentOperator } from "@/lib/auth";
import ReportsDashboard from "./ReportsDashboard";

export default async function ReportsPage() {
  if (!(await getCurrentOperator())) redirect("/login");
  return <ReportsDashboard />;
}
