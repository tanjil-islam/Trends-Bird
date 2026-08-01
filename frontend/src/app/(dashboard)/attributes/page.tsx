import { getImageUrl } from '@/lib/utils';
'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import MediaSelector from '@/components/MediaSelector';

const ATTR_TYPES = ['dropdown', 'radio', 'checkbox', 'colour_swatch', 'image_swatch'];

const slugify = (text: string) => text.toString().toLowerCase()
  .replace(/\s+/g, '-')           // Replace spaces with -
  .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
  .replace(/\-\-+/g, '-')         // Replace multiple - with single -
  .replace(/^-+/, '')             // Trim - from start of text
  .replace(/-+$/, '');            // Trim - from end of text

export default function AttributesPage() {
  const { hasPermission } = useAuth();
  const [attributes, setAttributes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAttr, setEditingAttr] = useState<any>(null);
  
  const [formData, setFormData] = useState({ name: '', slug: '', type: 'dropdown', values: [{ value: '', slug: '', referenceValue: '' }] });
  const [error, setError] = useState('');
  
  // State keyed by attribute ID for inline new values
  const [newValues, setNewValues] = useState<Record<string, { value: string, slug: string, referenceValue: string }>>({});
  
  // Media selector state
  const [showMediaSelector, setShowMediaSelector] = useState(false);
  // Identifies which input field is triggering the media selector
  const [activeMediaTarget, setActiveMediaTarget] = useState<{ type: 'inline', attrId: string } | { type: 'create', index: number } | null>(null);

  const fetchAttributes = useCallback(async () => {
    try {
      const res = await api.get('/attributes?limit=100');
      setAttributes(res.data || []);
      
      // Initialize newValues state for any new attributes
      setNewValues(prev => {
        const next = { ...prev };
        (res.data || []).forEach((a: any) => {
          if (!next[a.id]) next[a.id] = { value: '', slug: '', referenceValue: '' };
        });
        return next;
      });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAttributes(); }, [fetchAttributes]);

  const openCreate = () => {
    setEditingAttr(null);
    setFormData({ name: '', slug: '', type: 'dropdown', values: [{ value: '', slug: '', referenceValue: '' }] });
    setShowModal(true);
  };

  const openEdit = (attr: any) => {
    setEditingAttr(attr);
    setFormData({ name: attr.name, slug: attr.slug, type: attr.type, values: [] });
    setShowModal(true);
  };

  const handleNameChange = (val: string) => {
    setFormData(prev => ({ ...prev, name: val, slug: slugify(val) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    try {
      const data: any = { name: formData.name, slug: formData.slug, type: formData.type };
      if (!editingAttr) {
        data.values = formData.values.filter(v => v.value && v.slug);
      }
      if (editingAttr) { await api.patch(`/attributes/${editingAttr.id}`, data); }
      else { await api.post('/attributes', data); }
      setShowModal(false); fetchAttributes();
    } catch (err: any) { setError(err?.message || 'Failed'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try { await api.delete(`/attributes/${id}`); fetchAttributes(); }
    catch (err: any) { alert(err?.message || 'Cannot delete'); }
  };

  const handleNewValueChange = (attrId: string, field: 'value' | 'slug' | 'referenceValue', val: string) => {
    setNewValues(prev => {
      const current = prev[attrId] || { value: '', slug: '', referenceValue: '' };
      const next = { ...current, [field]: val };
      // Auto slugify if changing value
      if (field === 'value') {
        next.slug = slugify(val);
      }
      return { ...prev, [attrId]: next };
    });
  };

  const addValue = async (attrId: string) => {
    const val = newValues[attrId];
    if (!val || !val.value || !val.slug) {
      alert('Value and Slug are required');
      return;
    }
    try {
      await api.post(`/attributes/${attrId}/values`, val);
      setNewValues(prev => ({ ...prev, [attrId]: { value: '', slug: '', referenceValue: '' } }));
      fetchAttributes();
    } catch (err: any) { alert(err?.message || 'Failed'); }
  };

  const removeValue = async (attrId: string, valueId: string) => {
    try {
      await api.delete(`/attributes/${attrId}/values/${valueId}`);
      fetchAttributes();
    } catch (err: any) { alert(err?.message || 'Cannot delete'); }
  };

  const handleMediaSelect = (mediaList: any[]) => {
    if (mediaList.length > 0 && activeMediaTarget) {
      const m = mediaList[0];
      const url = m.thumbnail || m.publicUrl;
      
      if (activeMediaTarget.type === 'inline') {
        handleNewValueChange(activeMediaTarget.attrId, 'referenceValue', url);
      } else if (activeMediaTarget.type === 'create' && activeMediaTarget.index !== undefined) {
        const vals = [...formData.values];
        vals[activeMediaTarget.index].referenceValue = url;
        setFormData(prev => ({ ...prev, values: vals }));
      }
    }
    setShowMediaSelector(false);
    setActiveMediaTarget(null);
  };

  const renderReferencePreview = (type: string, refVal: string) => {
    if (!refVal) return null;
    if (type === 'colour_swatch') {
      return <div className="w-4 h-4 rounded-full border border-[var(--border-color)] inline-block mr-1 align-middle" style={{ backgroundColor: refVal }} title={refVal} />;
    }
    if (type === 'image_swatch') {
      return <img src={getImageUrl(refVal)} className="w-5 h-5 rounded object-cover border border-[var(--border-color)] inline-block mr-1 align-middle" alt="swatch" />;
    }
    return null;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Attributes</h1>
        {hasPermission('attribute:create') && <button onClick={openCreate} className="btn btn-primary">+ New Attribute</button>}
      </div>
      {loading ? <div className="flex justify-center py-12"><div className="spinner" /></div> : (
        <div className="space-y-4">
          {attributes.map((attr: any) => {
            const inlineVal = newValues[attr.id] || { value: '', slug: '', referenceValue: '' };
            return (
              <div key={attr.id} className="card">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{attr.name} <span className="badge badge-info ml-2">{attr.type}</span></h3>
                    <p className="text-sm text-[var(--text-secondary)]">Slug: {attr.slug}</p>
                  </div>
                  <div className="flex gap-2">
                    {hasPermission('attribute:update') && <button onClick={() => openEdit(attr)} className="btn btn-ghost text-xs">Edit</button>}
                    {hasPermission('attribute:delete') && <button onClick={() => handleDelete(attr.id)} className="btn btn-danger text-xs">Delete</button>}
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {attr.values?.map((v: any) => (
                    <span key={v.id} className="px-3 py-1 bg-[var(--bg-hover)] border border-[var(--border-color)] rounded-full text-sm flex items-center group">
                      {renderReferencePreview(attr.type, v.referenceValue)}
                      {v.value}
                      {hasPermission('attribute:delete') && (
                        <button onClick={() => removeValue(attr.id, v.id)} className="ml-2 text-[var(--text-secondary)] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                      )}
                    </span>
                  ))}
                  {attr.values?.length === 0 && <span className="text-sm text-[var(--text-secondary)] italic">No values defined.</span>}
                </div>
                
                {hasPermission('attribute:update') && (
                  <div className="flex gap-2 bg-[var(--bg-secondary)] p-3 rounded-lg border border-[var(--border-color)]">
                    <input placeholder="Value (e.g. Red, XL)" value={inlineVal.value} onChange={e => handleNewValueChange(attr.id, 'value', e.target.value)} className="flex-1 text-sm" />
                    <input placeholder="Slug (e.g. red, xl)" value={inlineVal.slug} onChange={e => handleNewValueChange(attr.id, 'slug', e.target.value)} className="flex-1 text-sm" />
                    
                    {attr.type === 'colour_swatch' ? (
                      <div className="flex items-center flex-1 gap-2">
                        <input type="color" value={inlineVal.referenceValue || '#000000'} onChange={e => handleNewValueChange(attr.id, 'referenceValue', e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
                        <input placeholder="#hex code" value={inlineVal.referenceValue} onChange={e => handleNewValueChange(attr.id, 'referenceValue', e.target.value)} className="flex-1 text-sm uppercase" />
                      </div>
                    ) : attr.type === 'image_swatch' ? (
                      <div className="flex items-center flex-1 gap-2">
                        <input placeholder="Image URL" value={inlineVal.referenceValue} readOnly className="flex-1 text-sm bg-[var(--bg-hover)]" />
                        <button onClick={() => { setActiveMediaTarget({ type: 'inline', attrId: attr.id }); setShowMediaSelector(true); }} className="btn btn-ghost text-xs whitespace-nowrap border">Select</button>
                      </div>
                    ) : (
                      <input placeholder="Ref Value (Optional)" value={inlineVal.referenceValue} onChange={e => handleNewValueChange(attr.id, 'referenceValue', e.target.value)} className="flex-1 text-sm" disabled />
                    )}
                    
                    <button onClick={() => addValue(attr.id)} className="btn btn-primary text-sm whitespace-nowrap">Add Value</button>
                  </div>
                )}
              </div>
            );
          })}
          {attributes.length === 0 && <p className="text-center text-[var(--text-secondary)] py-8">No attributes found.</p>}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content max-w-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4">{editingAttr ? 'Edit Attribute' : 'Create Attribute'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-2 rounded text-sm">{error}</div>}
              
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Name</label><input value={formData.name} onChange={e => handleNameChange(e.target.value)} required className="w-full" placeholder="e.g. Size" /></div>
                <div><label className="block text-sm font-medium mb-1">Slug</label><input value={formData.slug} onChange={e => setFormData(prev => ({ ...prev, slug: e.target.value }))} required className="w-full" placeholder="e.g. size" /></div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select value={formData.type} onChange={e => setFormData(prev => ({ ...prev, type: e.target.value }))} disabled={!!editingAttr} className="w-full disabled:opacity-50">
                  {ATTR_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ').toUpperCase()}</option>)}
                </select>
                {editingAttr && <p className="text-xs text-[var(--text-secondary)] mt-1">Attribute type cannot be changed after creation.</p>}
              </div>
              
              {!editingAttr && (
                <div>
                  <label className="block text-sm font-medium mb-2">Initial Values (Optional)</label>
                  {formData.values.map((v, i) => (
                    <div key={i} className="flex gap-2 mb-2">
                      <input placeholder="Value" value={v.value} onChange={e => { const vals = [...formData.values]; vals[i].value = e.target.value; vals[i].slug = slugify(e.target.value); setFormData(prev => ({ ...prev, values: vals })); }} className="flex-1 text-sm" />
                      <input placeholder="Slug" value={v.slug} onChange={e => { const vals = [...formData.values]; vals[i].slug = e.target.value; setFormData(prev => ({ ...prev, values: vals })); }} className="flex-1 text-sm" />
                      
                      {formData.type === 'colour_swatch' ? (
                        <div className="flex items-center flex-1 gap-2">
                          <input type="color" value={v.referenceValue || '#000000'} onChange={e => { const vals = [...formData.values]; vals[i].referenceValue = e.target.value; setFormData(prev => ({ ...prev, values: vals })); }} className="w-8 h-8 rounded cursor-pointer" />
                          <input placeholder="#hex code" value={v.referenceValue} onChange={e => { const vals = [...formData.values]; vals[i].referenceValue = e.target.value; setFormData(prev => ({ ...prev, values: vals })); }} className="flex-1 text-sm uppercase" />
                        </div>
                      ) : formData.type === 'image_swatch' ? (
                        <div className="flex items-center flex-1 gap-2">
                          <input placeholder="Image URL" value={v.referenceValue} readOnly className="flex-1 text-sm bg-[var(--bg-hover)]" />
                          <button type="button" onClick={() => { setActiveMediaTarget({ type: 'create', index: i }); setShowMediaSelector(true); }} className="btn btn-ghost text-xs whitespace-nowrap border">Select</button>
                        </div>
                      ) : (
                        <input placeholder="Ref Value" value={v.referenceValue} onChange={e => { const vals = [...formData.values]; vals[i].referenceValue = e.target.value; setFormData(prev => ({ ...prev, values: vals })); }} className="flex-1 text-sm" disabled />
                      )}
                      
                      <button type="button" onClick={() => { const vals = formData.values.filter((_, idx) => idx !== i); setFormData(prev => ({ ...prev, values: vals })); }} className="btn btn-ghost text-red-500 hover:bg-red-500/10 px-2">×</button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setFormData(prev => ({ ...prev, values: [...prev.values, { value: '', slug: '', referenceValue: '' }] }))} className="btn btn-ghost text-xs border border-dashed border-[var(--border-color)] w-full py-2">+ Add Value Row</button>
                </div>
              )}
              
              <div className="flex gap-2 justify-end pt-4 border-t border-[var(--border-color)]">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-ghost">Cancel</button>
                <button type="submit" className="btn btn-primary">{editingAttr ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showMediaSelector && (
        <MediaSelector 
          onClose={() => { setShowMediaSelector(false); setActiveMediaTarget(null); }} 
          onSelect={handleMediaSelect} 
          multiple={false} 
        />
      )}
    </div>
  );
}
