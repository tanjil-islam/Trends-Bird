'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import MediaSelector from '@/components/MediaSelector';

export default function BrandsPage() {
  const { hasPermission } = useAuth();
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBrand, setEditingBrand] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', slug: '', description: '', status: true, logoId: '' });
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const [showMediaSelector, setShowMediaSelector] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<any>(null);

  const fetchBrands = useCallback(async () => {
    try {
      const res = await api.get(`/brands?limit=100&search=${search}`);
      setBrands(res.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { fetchBrands(); }, [fetchBrands]);

  const openCreate = () => { 
    setEditingBrand(null); 
    setFormData({ name: '', slug: '', description: '', status: true, logoId: '' }); 
    setSelectedMedia(null);
    setShowModal(true); 
  };
  
  const openEdit = (b: any) => { 
    setEditingBrand(b); 
    setFormData({ name: b.name, slug: b.slug, description: b.description || '', status: b.status, logoId: b.logoId || '' }); 
    setSelectedMedia(b.logo || null);
    setShowModal(true); 
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    try {
      const data: any = { ...formData };
      if (!data.description) delete data.description;
      if (!data.logoId) delete data.logoId;
      
      if (editingBrand) { await api.patch(`/brands/${editingBrand.id}`, data); }
      else { await api.post('/brands', data); }
      setShowModal(false); fetchBrands();
    } catch (err: any) { setError(err?.message || 'Failed'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try { await api.delete(`/brands/${id}`); fetchBrands(); }
    catch (err: any) { alert(err?.message || 'Cannot delete'); }
  };

  const handleMediaSelect = (mediaList: any[]) => {
    if (mediaList.length > 0) {
      const m = mediaList[0];
      setFormData(prev => ({ ...prev, logoId: m.id }));
      setSelectedMedia(m);
    }
    setShowMediaSelector(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Brands</h1>
        {hasPermission('brand:create') && <button onClick={openCreate} className="btn btn-primary">+ New Brand</button>}
      </div>
      
      <div className="mb-4">
        <input placeholder="Search brands..." value={search} onChange={e => setSearch(e.target.value)} className="w-full max-w-md" />
      </div>
      
      {loading ? <div className="flex justify-center py-12"><div className="spinner" /></div> : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Brand</th>
                <th>Slug</th>
                <th>Products</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {brands.map((b: any) => (
                <tr key={b.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      {b.logo ? (
                        <img src={`http://localhost:4000${b.logo.thumbnail || b.logo.publicUrl}`} className="w-10 h-10 rounded object-contain bg-white border border-[var(--border-color)] p-1" alt="" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-[var(--bg-hover)] flex items-center justify-center border border-[var(--border-color)] text-xs">No Logo</div>
                      )}
                      <span className="font-medium">{b.name}</span>
                    </div>
                  </td>
                  <td className="text-[var(--text-secondary)]">{b.slug}</td>
                  <td>{b._count?.products ?? 0}</td>
                  <td><span className={`badge ${b.status ? 'badge-success' : 'badge-danger'}`}>{b.status ? 'Active' : 'Inactive'}</span></td>
                  <td>
                    <div className="flex gap-2">
                      {hasPermission('brand:update') && <button onClick={() => openEdit(b)} className="btn btn-ghost text-xs">Edit</button>}
                      {hasPermission('brand:delete') && <button onClick={() => handleDelete(b.id)} className="btn btn-danger text-xs">Delete</button>}
                    </div>
                  </td>
                </tr>
              ))}
              {brands.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-[var(--text-secondary)]">No brands found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content max-w-lg" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4">{editingBrand ? 'Edit Brand' : 'Create Brand'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-2 rounded text-sm">{error}</div>}
              
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">Brand Logo (Optional)</label>
                  <div className="flex items-center gap-3">
                    {selectedMedia ? (
                      <div className="relative">
                        <img src={`http://localhost:4000${selectedMedia.thumbnail || selectedMedia.publicUrl}`} className="w-16 h-16 rounded object-contain bg-white border p-1" alt="" />
                        <button type="button" onClick={() => { setFormData(prev => ({...prev, logoId: ''})); setSelectedMedia(null); }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600">×</button>
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded bg-[var(--bg-hover)] border flex items-center justify-center text-[var(--text-secondary)] text-sm">None</div>
                    )}
                    <button type="button" onClick={() => setShowMediaSelector(true)} className="btn btn-ghost text-xs">Select Logo</button>
                  </div>
                </div>
              </div>

              <div><label className="block text-sm font-medium mb-1">Name</label><input value={formData.name} onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))} required className="w-full" /></div>
              <div><label className="block text-sm font-medium mb-1">Slug</label><input value={formData.slug} onChange={e => setFormData(prev => ({ ...prev, slug: e.target.value }))} required className="w-full" /></div>
              <div><label className="block text-sm font-medium mb-1">Description</label><textarea value={formData.description} onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))} className="w-full" rows={2} /></div>
              <div className="flex items-center gap-2"><input type="checkbox" checked={formData.status} onChange={e => setFormData(prev => ({ ...prev, status: e.target.checked }))} /><span className="text-sm">Active</span></div>
              
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-ghost">Cancel</button>
                <button type="submit" className="btn btn-primary">{editingBrand ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showMediaSelector && (
        <MediaSelector 
          onClose={() => setShowMediaSelector(false)} 
          onSelect={handleMediaSelect} 
          multiple={false} 
        />
      )}
    </div>
  );
}
