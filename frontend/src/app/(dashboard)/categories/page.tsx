'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import MediaSelector from '@/components/MediaSelector';

export default function CategoriesPage() {
  const { hasPermission } = useAuth();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCat, setEditingCat] = useState<any>(null);
  
  const [formData, setFormData] = useState({ 
    name: '', slug: '', description: '', parentId: '', 
    active: true, sortOrder: 0, imageId: '' 
  });
  
  const [error, setError] = useState('');
  const [allCategories, setAllCategories] = useState<any[]>([]);
  
  const [showMediaSelector, setShowMediaSelector] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<any>(null);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.get('/categories?limit=100');
      setCategories(res.data || []);
      setAllCategories(res.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const openCreate = () => {
    setEditingCat(null);
    setFormData({ name: '', slug: '', description: '', parentId: '', active: true, sortOrder: 0, imageId: '' });
    setSelectedMedia(null);
    setShowModal(true);
  };

  const openEdit = (cat: any) => {
    setEditingCat(cat);
    setFormData({ 
      name: cat.name, 
      slug: cat.slug, 
      description: cat.description || '', 
      parentId: cat.parentId || '', 
      active: cat.active, 
      sortOrder: cat.sortOrder,
      imageId: cat.imageId || ''
    });
    setSelectedMedia(cat.image || null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const data: any = { ...formData, sortOrder: Number(formData.sortOrder) };
      if (!data.parentId) delete data.parentId;
      if (!data.description) delete data.description;
      if (!data.imageId) delete data.imageId;
      
      if (editingCat) {
        await api.patch(`/categories/${editingCat.id}`, data);
      } else {
        await api.post('/categories', data);
      }
      setShowModal(false);
      fetchCategories();
    } catch (err: any) {
      setError(err?.message || 'Failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try { await api.delete(`/categories/${id}`); fetchCategories(); }
    catch (err: any) { alert(err?.message || 'Cannot delete'); }
  };

  const handleMediaSelect = (mediaList: any[]) => {
    if (mediaList.length > 0) {
      const m = mediaList[0];
      setFormData(prev => ({ ...prev, imageId: m.id }));
      setSelectedMedia(m);
    }
    setShowMediaSelector(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Categories</h1>
        {hasPermission('category:create') && (
          <button onClick={openCreate} className="btn btn-primary">+ New Category</button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="spinner" /></div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Slug</th>
                <th>Parent</th>
                <th>Children</th>
                <th>Products</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat: any) => (
                <tr key={cat.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      {cat.image ? (
                        <img src={`http://localhost:4000${cat.image.thumbnail || cat.image.publicUrl}`} className="w-10 h-10 rounded object-cover border border-[var(--border-color)]" alt="" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-[var(--bg-hover)] flex items-center justify-center border border-[var(--border-color)]">📂</div>
                      )}
                      <span className="font-medium">{cat.name}</span>
                    </div>
                  </td>
                  <td className="text-[var(--text-secondary)]">{cat.slug}</td>
                  <td>{cat.parent?.name || '-'}</td>
                  <td>{cat._count?.children ?? cat.children?.length ?? 0}</td>
                  <td>{cat._count?.products ?? 0}</td>
                  <td><span className={`badge ${cat.active ? 'badge-success' : 'badge-danger'}`}>{cat.active ? 'Active' : 'Inactive'}</span></td>
                  <td>
                    <div className="flex gap-2">
                      {hasPermission('category:update') && <button onClick={() => openEdit(cat)} className="btn btn-ghost text-xs">Edit</button>}
                      {hasPermission('category:delete') && <button onClick={() => handleDelete(cat.id)} className="btn btn-danger text-xs">Delete</button>}
                    </div>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-[var(--text-secondary)]">No categories found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content max-w-lg" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4">{editingCat ? 'Edit Category' : 'Create Category'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-2 rounded text-sm">{error}</div>}
              
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">Image (Optional)</label>
                  <div className="flex items-center gap-3">
                    {selectedMedia ? (
                      <div className="relative">
                        <img src={`http://localhost:4000${selectedMedia.thumbnail || selectedMedia.publicUrl}`} className="w-16 h-16 rounded object-cover border" alt="" />
                        <button type="button" onClick={() => { setFormData(prev => ({...prev, imageId: ''})); setSelectedMedia(null); }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600">×</button>
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded bg-[var(--bg-hover)] border flex items-center justify-center text-[var(--text-secondary)] text-sm">None</div>
                    )}
                    <button type="button" onClick={() => setShowMediaSelector(true)} className="btn btn-ghost text-xs">Select Image</button>
                  </div>
                </div>
              </div>

              <div><label className="block text-sm font-medium mb-1">Name</label><input value={formData.name} onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))} required className="w-full" /></div>
              <div><label className="block text-sm font-medium mb-1">Slug</label><input value={formData.slug} onChange={e => setFormData(prev => ({ ...prev, slug: e.target.value }))} required className="w-full" /></div>
              <div><label className="block text-sm font-medium mb-1">Description</label><textarea value={formData.description} onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))} className="w-full" rows={2} /></div>
              
              <div><label className="block text-sm font-medium mb-1">Parent Category</label>
                <select value={formData.parentId} onChange={e => setFormData(prev => ({ ...prev, parentId: e.target.value }))} className="w-full">
                  <option value="">None (Root)</option>
                  {allCategories.filter(c => c.id !== editingCat?.id).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Sort Order</label><input type="number" value={formData.sortOrder} onChange={e => setFormData(prev => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))} className="w-full" /></div>
                <div className="flex items-end pb-1"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={formData.active} onChange={e => setFormData(prev => ({ ...prev, active: e.target.checked }))} /><span className="text-sm">Active</span></label></div>
              </div>
              
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-ghost">Cancel</button>
                <button type="submit" className="btn btn-primary">{editingCat ? 'Update' : 'Create'}</button>
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
