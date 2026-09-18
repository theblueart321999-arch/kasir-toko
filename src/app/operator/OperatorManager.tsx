"use client";

import { FormEvent, useEffect, useState } from "react";
import Pagination, { paginate } from "@/components/Pagination";

type Operator = { id: number; name: string; username: string; role: "OWNER" | "ADMIN" | "KASIR"; active: boolean };

export default function OperatorManager() {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [employee, setEmployee] = useState({ name: "", username: "", password: "", role: "KASIR" as "ADMIN" | "KASIR" });
  const [notice, setNotice] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  useEffect(() => { void fetch("/api/admin/operators").then(async (response) => { if (response.ok) setOperators(await response.json()); }); }, []);
  async function addEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/admin/operators", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(employee) });
    const data = await response.json();
    if (!response.ok) { setNotice(data.error || "Karyawan gagal ditambahkan"); return; }
    setOperators((items) => [...items, data]);
    setEmployee({ name: "", username: "", password: "", role: "KASIR" });
    setNotice("Akun karyawan berhasil dibuat");
  }
  return <main className="management-page operator-page"><header className="management-header"><div><p className="eyebrow">KASIR TOKO · AKSES</p><h1>Operator & Akses</h1><p>Kelola akun karyawan yang dapat mengakses toko.</p></div><a href="/dashboard">← Dashboard</a></header>
    {notice && <div className="management-notice">{notice}</div>}
    <section className="panel-form settings-form operator-card"><h2>Akun kolaborasi toko</h2><p className="empty-state">Tambahkan akun karyawan agar dapat masuk dengan akun sendiri dan mengelola toko yang sama.</p><form onSubmit={addEmployee}><label>Nama karyawan<input value={employee.name} onChange={(e) => setEmployee({ ...employee, name: e.target.value })} required /></label><label>Username<input value={employee.username} onChange={(e) => setEmployee({ ...employee, username: e.target.value })} required /></label><label>Password sementara<input type="password" minLength={8} value={employee.password} onChange={(e) => setEmployee({ ...employee, password: e.target.value })} required /><small>Minimal 8 karakter.</small></label><label>Peran<select value={employee.role} onChange={(e) => setEmployee({ ...employee, role: e.target.value as "ADMIN" | "KASIR" })}><option value="KASIR">Kasir</option><option value="ADMIN">Admin</option></select></label><button className="primary-button">+ Tambah akun karyawan</button></form><div className="table-scroll"><table><thead><tr><th>Nama</th><th>Username</th><th>Peran</th><th>Status</th></tr></thead><tbody>{paginate(operators, page, pageSize).map((item) => <tr key={item.id}><td>{item.name}</td><td>{item.username}</td><td>{item.role}</td><td>{item.active ? "Aktif" : "Nonaktif"}</td></tr>)}</tbody></table><Pagination page={page} pageSize={pageSize} total={operators.length} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} /></div></section>
  </main>;
}
