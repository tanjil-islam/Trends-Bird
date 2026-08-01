'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function ProductsPage() {
  const { hasPermission } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/products?page=${page}&limit=10&search=${encodeURIComponent(debouncedSearch)}`);
      setProducts(res.data || []);
      setMeta(res.meta || { total: 0, totalPages: 1 });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, debouncedSearch]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try { await api.delete(`/products/${id}`); fetchProducts(); }
    catch (err: any) { alert(err?.message || 'Cannot delete'); }
  };

  const getPrice = (product: any) => {
    if (product.hasVariants && product.priceRange) {
      const { min, max } = product.priceRange;
      return min === max ? `$${min}` : `$${min} - $${max}`;
    }
    if (product.salePrice) {
      return (<><span className="line-through text-[var(--text-secondary)]">${Number(product.price)}</span> <span className="text-green-400">${Number(product.salePrice)}</span></>);
    }
    return product.price ? `$${Number(product.price)}` : '-';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Products</h1>
        {hasPermission('product:create') && (
          <Link href="/products/create" className="btn btn-primary">+ New Product</Link>
        )}
      </div>
      <div className="mb-4"><input placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} className="w-full max-w-md" /></div>
      {loading ? <div className="flex justify-center py-12"><div className="spinner" /></div> : (
        <>
          <div className="table-container">
            <table>
              <thead><tr><th>Product</th><th>SKU</th><th>Type</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {products.map((p: any) => (
                  <tr key={p.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        {p.media?.[0]?.media?.thumbnail || p.media?.[0]?.media?.publicUrl ? (
                          <img src={`http://localhost:4000${p.media[0].media.thumbnail || p.media[0].media.publicUrl}`} className="w-10 h-10 rounded object-cover" alt="" />
                        ) : (
                          <div className="w-10 h-10 rounded bg-[var(--bg-hover)] flex items-center justify-center">📦</div>
                        )}
                        <div>
                          <p className="font-medium">{p.name}</p>
                          <p className="text-xs text-[var(--text-secondary)]">{p.brand?.name || ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-[var(--text-secondary)]">{p.sku}</td>
                    <td><span className={`badge ${p.hasVariants ? 'badge-warning' : 'badge-info'}`}>{p.hasVariants ? 'Variable' : 'Simple'}</span></td>
                    <td>{getPrice(p)}</td>
                    <td>{p.hasVariants ? `${p._count?.variants || 0} variants` : (p.stock ?? '-')}</td>
                    <td><span className={`badge ${p.active ? 'badge-success' : 'badge-danger'}`}>{p.active ? 'Active' : 'Draft'}</span></td>
                    <td>
                      <div className="flex gap-2">
                        {hasPermission('product:update') && <Link href={`/products/${p.id}`} className="btn btn-ghost text-xs">Edit</Link>}
                        {hasPermission('product:delete') && <button onClick={() => handleDelete(p.id)} className="btn btn-danger text-xs">Delete</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn btn-ghost text-sm">Prev</button>
              <span className="text-sm text-[var(--text-secondary)]">Page {page} of {meta.totalPages}</span>
              <button onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))} disabled={page === meta.totalPages} className="btn btn-ghost text-sm">Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
