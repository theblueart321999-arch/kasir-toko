import { notFound, redirect } from "next/navigation";
import { getCurrentOperator } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import "./print.css";
import ReceiptActions from "./ReceiptActions";

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const operator = await getCurrentOperator();

  if (!operator) {
    redirect("/login");
  }

  // Sale.id sekarang String/CUID
  const id = (await params).id;

  if (!id || typeof id !== "string") {
    notFound();
  }

  const [sale, settings] = await Promise.all([
    prisma.sale.findUnique({
      where: {
        id,
      },
      include: {
        customer: true,
      },
    }),

    prisma.storeSetting.findUnique({
      where: {
        id: 1,
      },
    }),
  ]);

  if (!sale) {
    notFound();
  }

  // Ambil item penjualan secara terpisah karena
  // Sale tidak memiliki relation "items" pada Prisma Client saat ini.
  const items = await prisma.saleItem.findMany({
    where: {
      saleId: sale.id,
    },
    include: {
      product: true,
    },
    orderBy: {
      id: "asc",
    },
  });

  const format = (value: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(value);

  return (
    <main className="receipt">
      <ReceiptActions />

      <article>
        <header>
          <h1>
            {settings?.storeName || "Toko Makmur Jaya"}
          </h1>

          {settings?.address && (
            <p>{settings.address}</p>
          )}

          {settings?.phone && (
            <p>{settings.phone}</p>
          )}

          <hr />

          <p>
            {sale.invoiceNumber} ·{" "}
            {new Date(sale.createdAt).toLocaleString(
              "id-ID"
            )}
          </p>

          {sale.customer && (
            <p>
              Customer:{" "}
              {sale.customer.name}
            </p>
          )}
        </header>

        <section>
          {items.map((item) => (
            <div
              className="receipt-line"
              key={item.id}
            >
              <span>
                {item.product.name}

                <small>
                  {item.quantity} ×{" "}
                  {format(item.unitPrice)}
                </small>
              </span>

              <b>
                {format(item.total)}
              </b>
            </div>
          ))}
        </section>

        <hr />

        <div className="receipt-total">
          <span>Subtotal</span>
          <b>{format(sale.subtotal)}</b>

          <span>
            Pajak ({settings?.taxRate ?? 11}%)
          </span>
          <b>{format(sale.tax)}</b>

          <strong>Total</strong>
          <strong>{format(sale.total)}</strong>
        </div>

        <p className="receipt-footer">
          {settings?.receiptFooter ||
            "Terima kasih atas kunjungan Anda"}
        </p>
      </article>
    </main>
  );
}