import { notFound, redirect } from "next/navigation";
import { getCurrentOperator } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import "./print.css";
import ReceiptActions from "./ReceiptActions";

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const operator = await getCurrentOperator();
  if (!operator) redirect("/login");
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [sale, settings] = await Promise.all([
    prisma.sale.findUnique({ where: { id }, include: { items: { include: { product: true } }, customer: true } }),
    prisma.storeSetting.findUnique({ where: { id: 1 } }),
  ]);
  if (!sale) notFound();
  const format = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
  return <main className="receipt"><ReceiptActions /><article><header><h1>{settings?.storeName || "Toko Makmur Jaya"}</h1>{settings?.address && <p>{settings.address}</p>}{settings?.phone && <p>{settings.phone}</p>}<hr /><p>{sale.invoiceNumber} · {new Date(sale.createdAt).toLocaleString("id-ID")}</p></header><section>{sale.items.map((item) => <div className="receipt-line" key={item.id}><span>{item.product.name}<small>{item.quantity} × {format(item.unitPrice)}</small></span><b>{format(item.total)}</b></div>)}</section><hr /><div className="receipt-total"><span>Subtotal</span><b>{format(sale.subtotal)}</b><span>Pajak ({settings?.taxRate ?? 11}%)</span><b>{format(sale.tax)}</b><strong>Total</strong><strong>{format(sale.total)}</strong></div><p className="receipt-footer">{settings?.receiptFooter || "Terima kasih atas kunjungan Anda"}</p></article></main>;
}
