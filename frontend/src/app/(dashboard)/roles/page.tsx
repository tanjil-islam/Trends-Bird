'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export default function RolesPage() {
  const { hasPermission } = useAuth();
  const [roles, setRoles] = useState<any[]>([]);
  const [allPermissions, setAllPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', description: '', status: true, permissionIds: [] as string[] });
  const [error, setError] = useState('');

  const fetchRoles = useCallback(async () => {
    try {
      const res = await api.get('/roles?limit=100');
      setRoles(res.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  const fetchPermissions = useCallback(async () => {
    try {
      const res = await api.get('/permissions/flat');
      setAllPermissions(res.data || res || []);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { fetchRoles(); fetchPermissions(); }, [fetchRoles, fetchPermissions]);

  const openCreate = () => {
    setEditingRole(null);
    setFormData({ name: '', description: '', status: true, permissionIds: [] });
    setShowModal(true);
  };

  const openEdit = (role: any) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description || '',
      status: role.status,
      permissionIds: role.permissions?.map((rp: any) => rp.permission?.id || rp.permissionId) || [],
    });
    setShowModal(true);
  };

  const togglePermission = (id: string) => {
    setFormData(prev => ({
      ...prev,
      permissionIds: prev.permissionIds.includes(id)
        ? prev.permissionIds.filter(p => p !== id)
        : [...prev.permissionIds, id],
    }));
  };

  const grantAll = () => {
    setFormData(prev => ({ ...prev, permissionIds: allPermissions.map((p: any) => p.id) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (editingRole) {
        await api.patch(`/roles/${editingRole.id}`, formData);
      } else {
        await api.post('/roles', formData);
      }
      setShowModal(false);
      fetchRoles();
    } catch (err: any) {
      setError(err?.message || 'Failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try { await api.delete(`/roles/${id}`); fetchRoles(); }
    catch (err: any) { alert(err?.message || 'Cannot delete'); }
  };

  const handleGrantAll = async (id: string) => {
    try { await api.post(`/roles/${id}/grant-all`); fetchRoles(); }
    catch (err: any) { alert(err?.message || 'Failed'); }
  };

  // Group permissions by group name
  const groupedPermissions = allPermissions.reduce((acc: any, perm: any) => {
    const groupName = perm.group?.name || perm.name.split(':')[0];
    if (!acc[groupName]) acc[groupName] = [];
    acc[groupName].push(perm);
    return acc;
  }, {});

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Roles</h1>
        {hasPermission('role:create') && (
          <button onClick={openCreate} className="btn btn-primary">+ New Role</button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="spinner" /></div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Status</th>
                <th>Users</th>
                <th>Permissions</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role: any) => (
                <tr key={role.id}>
                  <td className="font-medium">{role.name}</td>
                  <td className="text-[var(--text-secondary)]">{role.description || '-'}</td>
                  <td><span className={`badge ${role.status ? 'badge-success' : 'badge-danger'}`}>{role.status ? 'Active' : 'Inactive'}</span></td>
                  <td>{role._count?.users ?? 0}</td>
                  <td>{role.permissions?.length || 0}</td>
                  <td>
                    <div className="flex gap-2">
                      {hasPermission('role:update') && (
                        <>
                          <button onClick={() => openEdit(role)} className="btn btn-ghost text-xs">Edit</button>
                          <button onClick={() => handleGrantAll(role.id)} className="btn btn-ghost text-xs">Grant All</button>
                        </>
                      )}
                      {hasPermission('role:delete') && (
                        <button onClick={() => handleDelete(role.id)} className="btn btn-danger text-xs">Delete</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" style={{ maxWidth: '48rem' }} onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4">{editingRole ? 'Edit Role' : 'Create Role'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-2 rounded text-sm">{error}</div>}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input value={formData.name} onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))} required className="w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <input value={formData.description} onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))} className="w-full" />
                </div>
                <div className="flex flex-col justify-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formData.status} onChange={e => setFormData(prev => ({ ...prev, status: e.target.checked }))} />
                    <span className="text-sm font-medium">Active</span>
                  </label>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Permissions</label>
                  <button type="button" onClick={grantAll} className="btn btn-ghost text-xs">Select All</button>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-3 border border-[var(--border-color)] rounded-lg p-3">
                  {Object.entries(groupedPermissions).map(([group, perms]: [string, any]) => (
                    <div key={group}>
                      <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase mb-1">{group}</p>
                      <div className="flex flex-wrap gap-2">
                        {perms.map((p: any) => (
                          <label key={p.id} className={`cursor-pointer badge ${formData.permissionIds.includes(p.id) ? 'badge-info' : 'bg-[var(--bg-hover)] text-[var(--text-secondary)]'}`}>
                            <input type="checkbox" className="sr-only" checked={formData.permissionIds.includes(p.id)} onChange={() => togglePermission(p.id)} />
                            {p.name.split(':')[1]}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-ghost">Cancel</button>
                <button type="submit" className="btn btn-primary">{editingRole ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
