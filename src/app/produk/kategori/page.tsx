import { redirect } from "next/navigation";
import { getCurrentOperator } from "@/lib/auth";
import CategoryManager from "./CategoryManager";

export default async function CategoryPage() {
  const operator = await getCurrentOperator();
  if (!operator) redirect("/login");
  if (!["ADMIN", "OWNER"].includes(operator.role)) redirect("/dashboard");
  return <CategoryManager operatorName={operator.name} />;
}
