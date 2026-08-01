'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export default function UsersPage() {
  const { hasPermission } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', phone: '', gender: '', roleId: '', active: true });
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });

  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get(`/users?page=${page}&limit=10&search=${search}`);
      setUsers(res.data || []);
      setMeta(res.meta || { total: 0, totalPages: 1 });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, search]);

  const fetchRoles = useCallback(async () => {
    try {
      const res = await api.get('/roles?limit=100');
      setRoles(res.data || []);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { fetchUsers(); fetchRoles(); }, [fetchUsers, fetchRoles]);

  const openCreate = () => {
    setEditingUser(null);
    setFormData({ name: '', email: '', password: '', phone: '', gender: '', roleId: '', active: true });
    setShowModal(true);
  };

  const openEdit = (u: any) => {
    setEditingUser(u);
    setFormData({ name: u.name, email: u.email, password: '', phone: u.phone || '', gender: u.gender || '', roleId: u.roleId, active: u.active });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const data: any = { ...formData };
      if (!data.password) delete data.password;
      if (!data.phone) delete data.phone;
      if (!data.gender) delete data.gender;
      if (editingUser) {
        await api.patch(`/users/${editingUser.id}`, data);
      } else {
        await api.post('/users', data);
      }
      setShowModal(false);
      fetchUsers();
    } catch (err: any) {
      setError(err?.message || 'Failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try { await api.delete(`/users/${id}`); fetchUsers(); }
    catch (err: any) { alert(err?.message || 'Cannot delete'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Users</h1>
        {hasPermission('user:create') && (
          <button onClick={openCreate} className="btn btn-primary">+ New User</button>
        )}
      </div>

      <div className="mb-4">
        <input placeholder="Search users..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="w-full max-w-md" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="spinner" /></div>
      ) : (
        <>
          <div className="table-container">
            <table>
              <thead>
                <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {users.map((u: any) => (
                  <tr key={u.id}>
                    <td className="font-medium">{u.name}</td>
                    <td className="text-[var(--text-secondary)]">{u.email}</td>
                    <td><span className="badge badge-info">{u.role?.name}</span></td>
                    <td><span className={`badge ${u.active ? 'badge-success' : 'badge-danger'}`}>{u.active ? 'Active' : 'Inactive'}</span></td>
                    <td>
                      <div className="flex gap-2">
                        {hasPermission('user:update') && <button onClick={() => openEdit(u)} className="btn btn-ghost text-xs">Edit</button>}
                        {hasPermission('user:delete') && <button onClick={() => handleDelete(u.id)} className="btn btn-danger text-xs">Delete</button>}
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

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4">{editingUser ? 'Edit User' : 'Create User'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-2 rounded text-sm">{error}</div>}
              <div><label className="block text-sm font-medium mb-1">Name</label><input value={formData.name} onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))} required className="w-full" /></div>
              <div><label className="block text-sm font-medium mb-1">Email</label><input type="email" value={formData.email} onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))} required className="w-full" /></div>
              <div><label className="block text-sm font-medium mb-1">Password {editingUser && '(leave blank to keep)'}</label><input type="password" value={formData.password} onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))} {...(!editingUser && { required: true, minLength: 6 })} className="w-full" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Phone</label><input value={formData.phone} onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))} className="w-full" /></div>
                <div><label className="block text-sm font-medium mb-1">Gender</label>
                  <select value={formData.gender} onChange={e => setFormData(prev => ({ ...prev, gender: e.target.value }))} className="w-full">
                    <option value="">Select</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div><label className="block text-sm font-medium mb-1">Role</label>
                <select value={formData.roleId} onChange={e => setFormData(prev => ({ ...prev, roleId: e.target.value }))} required className="w-full">
                  <option value="">Select role</option>
                  {roles.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="active" checked={formData.active} onChange={e => setFormData(prev => ({ ...prev, active: e.target.checked }))} />
                <label htmlFor="active" className="text-sm">Active</label>
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-ghost">Cancel</button>
                <button type="submit" className="btn btn-primary">{editingUser ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
