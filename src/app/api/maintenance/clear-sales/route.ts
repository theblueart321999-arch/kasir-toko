import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  // CATATAN: Untuk keamanan di production, Anda bisa menambahkan proteksi auth di sini
  // agar tidak sembarang orang bisa mengakses endpoint ini.

  try {
    // 1. Jalankan transaction agar jika salah satu gagal, semua dibatalkan (aman)
    const result = await prisma.$transaction(async (tx) => {
      
      // 2. Hapus tabel anak yang bergantung pada relasi Sale terlebih dahulu (jika ada)
      // Sesuaikan nama model 'saleItem' dengan schema.prisma Anda jika ada
      // const deletedItems = await tx.saleItem.deleteMany({});

      // 3. Hapus semua data dari tabel penjualan utama
      // Gantilah 'sale' dengan nama model penjualan Anda (misal: 'transaction' atau 'invoice')
      const deletedSales = await tx.sale.deleteMany({});

      // 4. Hapus riwayat arus kas (MoneyMovement) yang berasal dari penjualan
      // agar laporan finansial non-penjualan ikut bersih kembali ke Rp 0
      const deletedMovements = await tx.moneyMovement.deleteMany({
        where: {
          // Cari penanda arus kas jualan di db Anda, contoh:
          // note: { contains: "Penjualan" } 
          // atau jika menggunakan referensi penjualan:
          reference: { not: null } 
        }
      });

      return {
        salesCount: deletedSales.count,
        movementCount: deletedMovements.count
      };
    });

    return NextResponse.json({
      message: "Semua data penjualan berhasil dihapus total!",
      detail: result
    }, { status: 200 });

  } catch (error: any) {
    console.error("Gagal menghapus data penjualan:", error);
    return NextResponse.json({ 
      error: "Gagal mengosongkan data penjualan", 
      message: error.message 
    }, { status: 500 });
  }
}
