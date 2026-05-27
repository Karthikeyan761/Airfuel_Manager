import React, { useState, useEffect } from 'react';
import { auth } from '../api/services';
import { useAuth } from '../contexts/AuthContext';
import { Users, Plus, X, AlertCircle, CheckCircle, ShieldCheck, UserCheck } from 'lucide-react';

const AddUserModal = ({ onClose, onSuccess }) => {
  const [form, setForm]   = useState({ username: '', password: '', role: 'operator' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await auth.createUser(form);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <div>
            <h2 className="text-h3">Create User</h2>
            <p className="text-muted" style={{ marginTop: 4, fontSize: '0.85rem' }}>Add a new system user with role-based access</p>
          </div>
          <button className="btn-icon" onClick={onClose} id="close-user-modal"><X size={16} /></button>
        </div>
        <div className="modal-body">
          {error && (
            <div className="alert alert-error" style={{ marginBottom: 16 }}>
              <AlertCircle size={15} /><span style={{ fontSize: '0.85rem' }}>{error}</span>
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Username *</label>
              <input id="new-username" className="form-input" placeholder="e.g. john.doe" value={form.username} onChange={e => set('username', e.target.value)} required minLength={3} />
            </div>
            <div className="form-group">
              <label className="form-label">Password *</label>
              <input id="new-password" type="password" className="form-input" placeholder="Minimum 6 characters" value={form.password} onChange={e => set('password', e.target.value)} required minLength={6} />
            </div>
            <div className="form-group">
              <label className="form-label">Role *</label>
              <select id="new-role" className="form-select" value={form.role} onChange={e => set('role', e.target.value)}>
                <option value="operator">Operator</option>
                <option value="admin">Admin</option>
              </select>
              <div style={{ marginTop: 6, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {form.role === 'admin' ? '⚠ Admins can manage users, aircraft, and purchases.' : 'Operators can view data and manage flights.'}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
              <button id="save-user" type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Creating…' : <><CheckCircle size={16} /> Create User</>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const UsersPage = () => {
  const { user } = useAuth();
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [error, setError]     = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await auth.listUsers();
      setUsers(Array.isArray(res.data) ? res.data : (res.data.users || []));
    } catch (err) {
      setError('Failed to load users. This endpoint may require admin privileges.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreated = () => { setShowModal(false); fetchUsers(); };

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div className="page-header-left">
          <h1 className="text-h1" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Users size={24} style={{ color: 'var(--tertiary-accent)' }} />
            User Management
          </h1>
          <p className="text-muted">Manage system users and roles</p>
        </div>
        <button id="add-user-btn" className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Create User
        </button>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 20 }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="loading-screen"><div className="spinner" /><span>Loading users…</span></div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>USER</th>
                <th>EMAIL</th>
                <th>ROLE</th>
                <th>STATUS</th>
                <th>CREATED</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const isYou = u.username === user?.username; // Assuming `user` from AuthContext is used, wait, I need to get `user` from `useAuth()`
                return (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%',
                          background: u.role === 'admin' ? '#0ea5e9' : '#38bdf8', /* Just matching the blue shades from image */
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'white', fontWeight: 800, fontSize: '15px', flexShrink: 0
                        }}>
                          {u.username?.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{u.username}</span>
                          {isYou && <span style={{ fontSize: '0.75rem', color: '#0ea5e9', fontWeight: 600 }}>You</span>}
                        </div>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{u.email || `${u.username}@aeroplane.com`}</td>
                    <td>
                      <span style={{
                        padding: '4px 12px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.05em',
                        border: `1.5px solid ${u.role === 'admin' ? 'var(--primary-accent)' : 'var(--secondary-accent)'}`,
                        color: u.role === 'admin' ? 'var(--primary-accent)' : 'var(--secondary-accent)',
                        background: 'transparent'
                      }}>
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        padding: '4px 12px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.05em',
                        border: `1.5px solid var(--secondary-accent)`,
                        color: 'var(--secondary-accent)',
                        background: 'transparent'
                      }}>
                        {u.is_active !== false ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {u.created_at ? u.created_at.split('T')[0] : '2026-04-07'}
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>No users found.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showModal && <AddUserModal onClose={() => setShowModal(false)} onSuccess={handleCreated} />}
    </div>
  );
};

export default UsersPage;
