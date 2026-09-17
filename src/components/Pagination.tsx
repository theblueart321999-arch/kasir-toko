"use client";

type PaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
};

export function paginate<T>(items: T[], page: number, pageSize: number) {
  return items.slice((page - 1) * pageSize, page * pageSize);
}

export default function Pagination({ page, pageSize, total, onPageChange, onPageSizeChange }: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, pageCount);
  if (!total) return null;
  const pages = Array.from({ length: pageCount }, (_, index) => index + 1);
  return <nav className="pagination" aria-label="Pagination">
    <label>Baris per halaman
      <select value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))} aria-label="Baris per halaman">
        {[10, 25, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
      </select>
    </label>
    <div className="pagination-pages">
      <button type="button" disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)}>Sebelumnya</button>
      {pages.map((number) => <button type="button" key={number} className={number === currentPage ? "active" : ""} aria-current={number === currentPage ? "page" : undefined} onClick={() => onPageChange(number)}>{number}</button>)}
      <button type="button" disabled={currentPage === pageCount} onClick={() => onPageChange(currentPage + 1)}>Berikutnya</button>
    </div>
  </nav>;
}
