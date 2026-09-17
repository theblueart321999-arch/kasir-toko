import { redirect } from "next/navigation";
import { getCurrentOperator } from "@/lib/auth";
import ReceivablePage from "./ReceivablePage";

export default async function PiutangPage() {
  if (!(await getCurrentOperator())) redirect("/login");
  return <ReceivablePage />;
}
