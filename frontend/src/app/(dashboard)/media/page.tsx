'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export default function MediaPage() {
  const { hasPermission } = useAuth();
  const [media, setMedia] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  
  const [selectedMedia, setSelectedMedia] = useState<any>(null);
  const [editForm, setEditForm] = useState({ title: '', altText: '' });
  const [saving, setSaving] = useState(false);

  const fetchMedia = useCallback(async () => {
    try {
      const res = await api.get(`/media?page=${page}&limit=20`);
      setMedia(res.data || []);
      setMeta(res.meta || { total: 0, totalPages: 1 });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { fetchMedia(); }, [fetchMedia]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await api.upload('/media/upload', formData);
      fetchMedia();
    } catch (err: any) {
      alert(err?.message || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm('Are you sure you want to delete this file?')) return;
    try { 
      await api.delete(`/media/${id}`); 
      if (selectedMedia?.id === id) setSelectedMedia(null);
      fetchMedia(); 
    }
    catch (err: any) { alert(err?.message || 'Cannot delete'); }
  };

  const openMedia = (m: any) => {
    setSelectedMedia(m);
    setEditForm({ title: m.title || '', altText: m.altText || '' });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMedia) return;
    setSaving(true);
    try {
      await api.patch(`/media/${selectedMedia.id}`, editForm);
      setSelectedMedia(null);
      fetchMedia();
    } catch (err: any) {
      alert(err?.message || 'Failed to update media');
    } finally {
      setSaving(false);
    }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(`http://localhost:4000${url}`);
    alert('URL copied to clipboard!');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Media Library</h1>
        {hasPermission('media:create') && (
          <label className="btn btn-primary cursor-pointer">
            {uploading ? <span className="spinner border-white" /> : '+ Upload'}
            <input type="file" className="hidden" onChange={handleUpload} accept="image/*,video/*,.pdf,.doc,.docx" />
          </label>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="spinner" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {media.map((m: any) => (
              <div 
                key={m.id} 
                className="card p-2 group relative cursor-pointer hover:ring-2 ring-indigo-500 transition-all"
                onClick={() => openMedia(m)}
              >
                {m.type === 'image' ? (
                  <img src={`http://localhost:4000${m.thumbnail || m.publicUrl}`} alt={m.altText || m.fileName} className="w-full h-32 object-cover rounded-lg" />
                ) : (
                  <div className="w-full h-32 rounded-lg bg-[var(--bg-hover)] flex items-center justify-center text-3xl">
                    {m.type === 'video' ? '🎥' : '📄'}
                  </div>
                )}
                <p className="text-xs truncate mt-2 text-[var(--text-secondary)] font-medium">{m.title || m.fileName}</p>
                <p className="text-[10px] text-[var(--text-secondary)]">{(m.size / 1024).toFixed(1)} KB</p>
                {hasPermission('media:delete') && (
                  <button 
                    onClick={(e) => handleDelete(m.id, e)} 
                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-red-500 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center transition-opacity shadow"
                    title="Delete"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          {media.length === 0 && <p className="text-center text-[var(--text-secondary)] py-12 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)]">No media files uploaded yet.</p>}
          
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn btn-ghost text-sm">Prev</button>
              <span className="text-sm text-[var(--text-secondary)] font-medium">Page {page} of {meta.totalPages}</span>
              <button onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))} disabled={page === meta.totalPages} className="btn btn-ghost text-sm">Next</button>
            </div>
          )}
        </>
      )}

      {selectedMedia && (
        <div className="modal-overlay" onClick={() => setSelectedMedia(null)}>
          <div className="modal-content max-w-3xl flex flex-col md:flex-row gap-6 p-6" onClick={e => e.stopPropagation()}>
            {/* Media Preview */}
            <div className="flex-1 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] flex items-center justify-center overflow-hidden min-h-[300px]">
              {selectedMedia.type === 'image' ? (
                <img src={`http://localhost:4000${selectedMedia.publicUrl}`} alt={selectedMedia.altText} className="max-w-full max-h-[400px] object-contain" />
              ) : selectedMedia.type === 'video' ? (
                <video src={`http://localhost:4000${selectedMedia.publicUrl}`} controls className="max-w-full max-h-[400px]" />
              ) : (
                <div className="text-6xl">📄</div>
              )}
            </div>

            {/* Media Details Form */}
            <div className="w-full md:w-80 flex flex-col">
              <h2 className="text-xl font-bold mb-4">Media Details</h2>
              <form onSubmit={handleUpdate} className="flex-1 flex flex-col space-y-4">
                
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase mb-1">File Name</label>
                  <p className="text-sm truncate bg-[var(--bg-hover)] p-2 rounded border border-[var(--border-color)]">{selectedMedia.fileName}</p>
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase mb-1">File Info</label>
                  <p className="text-sm">{selectedMedia.mimeType.toUpperCase()} • {(selectedMedia.size / 1024).toFixed(1)} KB</p>
                  {selectedMedia.width && selectedMedia.height && (
                    <p className="text-sm text-[var(--text-secondary)]">{selectedMedia.width} x {selectedMedia.height} px</p>
                  )}
                  <p className="text-xs text-[var(--text-secondary)] mt-1">Uploaded: {new Date(selectedMedia.createdAt).toLocaleDateString()}</p>
                </div>

                <hr className="border-[var(--border-color)]" />

                <div>
                  <label className="block text-sm font-medium mb-1">Title</label>
                  <input 
                    value={editForm.title} 
                    onChange={e => setEditForm(prev => ({ ...prev, title: e.target.value }))} 
                    className="w-full" 
                    placeholder="Describe the media" 
                  />
                </div>
                
                {selectedMedia.type === 'image' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Alt Text (SEO)</label>
                    <input 
                      value={editForm.altText} 
                      onChange={e => setEditForm(prev => ({ ...prev, altText: e.target.value }))} 
                      className="w-full" 
                      placeholder="Alternative text for screen readers" 
                    />
                  </div>
                )}

                <div className="mt-auto pt-4 flex flex-col gap-2">
                  <button type="button" onClick={() => copyUrl(selectedMedia.publicUrl)} className="btn btn-ghost w-full justify-center text-sm border border-[var(--border-color)]">
                    🔗 Copy Public URL
                  </button>
                  <div className="flex gap-2">
                    {hasPermission('media:delete') && (
                      <button type="button" onClick={() => handleDelete(selectedMedia.id)} className="btn btn-danger flex-1">Delete</button>
                    )}
                    {hasPermission('media:update') && (
                      <button type="submit" disabled={saving} className="btn btn-primary flex-1">
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                    )}
                  </div>
                </div>

              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
