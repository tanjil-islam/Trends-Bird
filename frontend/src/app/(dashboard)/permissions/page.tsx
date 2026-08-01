'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const STANDARD_ACTIONS = ['create', 'read', 'update', 'delete'];

export default function PermissionsPage() {
  const { hasPermission } = useAuth();
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  const [editingGroup, setEditingGroup] = useState<any>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [selectedActions, setSelectedActions] = useState<string[]>([...STANDARD_ACTIONS]);
  const [customAction, setCustomAction] = useState('');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const fetchGroups = useCallback(async () => {
    try {
      const res = await api.get(`/permissions?limit=100&search=${search}`);
      setGroups(res.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  const toggleAction = (action: string) => {
    setSelectedActions(prev =>
      prev.includes(action) ? prev.filter(a => a !== action) : [...prev, action]
    );
  };

  const addCustomAction = () => {
    if (customAction.trim() && !selectedActions.includes(customAction.trim().toLowerCase())) {
      setSelectedActions(prev => [...prev, customAction.trim().toLowerCase()]);
      setCustomAction('');
    }
  };

  const openCreate = () => {
    setEditingGroup(null);
    setNewGroupName('');
    setNewGroupDesc('');
    setSelectedActions([...STANDARD_ACTIONS]);
    setError('');
    setShowModal(true);
  };

  const openEdit = (group: any) => {
    setEditingGroup(group);
    setNewGroupName(group.name);
    setNewGroupDesc(group.description || '');
    setSelectedActions(group.permissions?.map((p: any) => p.name.split(':')[1]) || []);
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (editingGroup) {
        const oldActions = editingGroup.permissions?.map((p: any) => p.name.split(':')[1]) || [];
        const addActions = selectedActions.filter((a: string) => !oldActions.includes(a));
        const removeActions = oldActions.filter((a: string) => !selectedActions.includes(a));
        
        await api.patch(`/permissions/${editingGroup.id}`, {
          description: newGroupDesc,
          addActions,
          removeActions,
        });
      } else {
        await api.post('/permissions', {
          name: newGroupName,
          description: newGroupDesc,
          actions: selectedActions,
        });
      }
      setShowModal(false);
      fetchGroups();
    } catch (err: any) {
      setError(err?.message || `Failed to ${editingGroup ? 'update' : 'create'}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try {
      await api.delete(`/permissions/${id}`);
      fetchGroups();
    } catch (err: any) {
      alert(err?.message || 'Cannot delete');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Permissions</h1>
        {hasPermission('permission:create') && (
          <button onClick={openCreate} className="btn btn-primary">+ New Group</button>
        )}
      </div>

      <div className="mb-4">
        <input
          placeholder="Search groups..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full max-w-md"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="spinner" /></div>
      ) : (
        <div className="space-y-4">
          {groups.map((group: any) => (
            <div key={group.id} className="card">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-lg">{group.name}</h3>
                  {group.description && <p className="text-sm text-[var(--text-secondary)]">{group.description}</p>}
                </div>
                <div className="flex gap-2">
                  {hasPermission('permission:update') && (
                    <button onClick={() => openEdit(group)} className="btn btn-ghost text-xs">Edit</button>
                  )}
                  {hasPermission('permission:delete') && (
                    <button onClick={() => handleDelete(group.id)} className="btn btn-danger text-xs">Delete</button>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {group.permissions?.map((p: any) => (
                  <span key={p.id} className="badge badge-info">{p.name}</span>
                ))}
              </div>
            </div>
          ))}
          {groups.length === 0 && <p className="text-center text-[var(--text-secondary)] py-8">No permission groups found</p>}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4">{editingGroup ? 'Edit Permission Group' : 'Create Permission Group'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-2 rounded text-sm">{error}</div>}
              <div>
                <label className="block text-sm font-medium mb-1">Module Name</label>
                <input 
                  value={newGroupName} 
                  onChange={e => setNewGroupName(e.target.value)} 
                  required 
                  disabled={!!editingGroup}
                  className="w-full disabled:opacity-50" 
                  placeholder="e.g., Order" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <input value={newGroupDesc} onChange={e => setNewGroupDesc(e.target.value)} className="w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Actions</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedActions.map(action => (
                    <button key={action} type="button" onClick={() => toggleAction(action)}
                      className="badge badge-info cursor-pointer hover:opacity-70 transition-opacity">
                      {action} &times;
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={customAction} onChange={e => setCustomAction(e.target.value)} placeholder="Custom action" className="flex-1" />
                  <button type="button" onClick={addCustomAction} className="btn btn-ghost">Add</button>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-ghost">Cancel</button>
                <button type="submit" className="btn btn-primary">{editingGroup ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
