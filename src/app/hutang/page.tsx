import { redirect } from "next/navigation";
import { getCurrentOperator } from "@/lib/auth";
import PayablePage from "./PayablePage";

export default async function HutangPage() {
  if (!(await getCurrentOperator())) redirect("/login");
  return <PayablePage />;
}
