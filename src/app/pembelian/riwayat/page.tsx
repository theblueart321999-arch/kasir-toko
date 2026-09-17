import { redirect } from "next/navigation";
import { getCurrentOperator } from "@/lib/auth";
import PembelianManager from "../PembelianManager";

export default async function RiwayatPembelianPage() {
  const operator = await getCurrentOperator();
  if (!operator) redirect("/login");
  if (!["ADMIN", "OWNER"].includes(operator.role)) redirect("/dashboard");
  return <PembelianManager initialTab="history" operatorName={operator.name} />;
}
