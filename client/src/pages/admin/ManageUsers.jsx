import { useEffect, useState } from 'react';
import { userAPI } from '../../api';
import { PageHeader, LoadingSpinner, RoleBadge, ConfirmDialog, EmptyState, formatDate } from '../../components/shared/UIComponents';
import toast from 'react-hot-toast';

const EMPTY_FORM = { name: '', email: '', password: '', role: 'intern', phone: '', department: '', assignedMentor: '' };

export default function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [confirm, setConfirm] = useState(null);

  useEffect(() => { fetchUsers(); fetchMentors(); }, [page, roleFilter, search]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await userAPI.getAll({ page, limit: 15, role: roleFilter || undefined, search: search || undefined });
      setUsers(res.data.users);
      setPagination({ total: res.data.total, pages: res.data.pages });
    } catch { toast.error('Failed to load users.'); }
    finally { setLoading(false); }
  };

  const fetchMentors = async () => {
    try {
      const res = await userAPI.getMentors();
      setMentors(res.data.mentors);
    } catch {}
  };

  const openCreate = () => { setEditUser(null); setForm(EMPTY_FORM); setShowModal(true); };
  const openEdit = (u) => {
    setEditUser(u);
    setForm({ name: u.name, email: u.email, password: '', role: u.role, phone: u.phone || '', department: u.department || '', assignedMentor: u.assignedMentor?._id || '' });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editUser) {
        await userAPI.update(editUser._id, form);
        toast.success('User updated successfully.');
      } else {
        await userAPI.create(form);
        toast.success('User created successfully.');
      }
      setShowModal(false);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save user.');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try {
      await userAPI.delete(id);
      toast.success('User deactivated.');
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to deactivate user.');
    }
    setConfirm(null);
  };

  return (
    <div>
      <PageHeader
        title="Manage Users"
        icon="👥"
        subtitle="Create and manage interns, mentors, and admins"
        actions={<button className="btn-primary-custom" onClick={openCreate}>➕ Add User</button>}
      />

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div className="search-bar" style={{ flex: 1, minWidth: 200 }}>
          <span className="search-icon">🔍</span>
          <input type="text" placeholder="Search by name, email..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="form-control-custom" style={{ width: 160 }} value={roleFilter}
          onChange={e => { setRoleFilter(e.target.value); setPage(1); }}>
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="mentor">Mentor</option>
          <option value="intern">Intern</option>
        </select>
      </div>

      {/* Table */}
      <div className="if-card" style={{ padding: 0 }}>
        {loading ? <LoadingSpinner /> : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table-custom">
              <thead>
                <tr>
                  <th>User</th><th>Role</th><th>Department</th>
                  <th>Mentor</th><th>Status</th><th>Joined</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan={7}><EmptyState icon="👤" title="No users found" message="Add a user to get started." /></td></tr>
                ) : users.map(u => (
                  <tr key={u._id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{u.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.email}</div>
                    </td>
                    <td><RoleBadge role={u.role} /></td>
                    <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{u.department || '—'}</td>
                    <td style={{ fontSize: 13 }}>{u.assignedMentor?.name || '—'}</td>
                    <td>
                      <span style={{ fontSize: 11, fontWeight: 600, color: u.isActive ? 'var(--success-light)' : 'var(--text-muted)' }}>
                        {u.isActive ? '🟢 Active' : '⚪ Inactive'}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(u.createdAt)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn-ghost" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => openEdit(u)}>Edit</button>
                        {u.isActive && (
                          <button className="btn-danger-custom" style={{ fontSize: 11, padding: '4px 10px' }}
                            onClick={() => setConfirm({ id: u._id, name: u.name })}>
                            Deactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="pagination-custom">
          <button className="pagination-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
          {Array.from({ length: pagination.pages }, (_, i) => (
            <button key={i + 1} className={`pagination-btn ${page === i + 1 ? 'active' : ''}`} onClick={() => setPage(i + 1)}>{i + 1}</button>
          ))}
          <button className="pagination-btn" disabled={page === pagination.pages} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editUser ? '✏️ Edit User' : '➕ Create User'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="two-col-grid" style={{ marginBottom: 14 }}>
                  <div>
                    <label className="form-label-custom">Full Name *</label>
                    <input id="user-name" className="form-control-custom" value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })} required />
                  </div>
                  <div>
                    <label className="form-label-custom">Email *</label>
                    <input id="user-email" type="email" className="form-control-custom" value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })} required />
                  </div>
                </div>
                <div className="two-col-grid" style={{ marginBottom: 14 }}>
                  <div>
                    <label className="form-label-custom">{editUser ? 'New Password (leave blank to keep)' : 'Password *'}</label>
                    <input id="user-password" type="password" className="form-control-custom" value={form.password}
                      onChange={e => setForm({ ...form, password: e.target.value })}
                      required={!editUser} minLength={8} />
                  </div>
                  <div>
                    <label className="form-label-custom">Role *</label>
                    <select id="user-role" className="form-control-custom" value={form.role}
                      onChange={e => setForm({ ...form, role: e.target.value })} disabled={!!editUser}>
                      <option value="intern">Intern</option>
                      <option value="mentor">Mentor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
                <div className="two-col-grid" style={{ marginBottom: 14 }}>
                  <div>
                    <label className="form-label-custom">Department</label>
                    <input className="form-control-custom" value={form.department}
                      onChange={e => setForm({ ...form, department: e.target.value })} />
                  </div>
                  <div>
                    <label className="form-label-custom">Phone</label>
                    <input className="form-control-custom" value={form.phone}
                      onChange={e => setForm({ ...form, phone: e.target.value })} />
                  </div>
                </div>
                {(form.role === 'intern') && (
                  <div style={{ marginBottom: 14 }}>
                    <label className="form-label-custom">Assign Mentor</label>
                    <select id="user-mentor" className="form-control-custom" value={form.assignedMentor}
                      onChange={e => setForm({ ...form, assignedMentor: e.target.value })}>
                      <option value="">— No Mentor —</option>
                      {mentors.map(m => <option key={m._id} value={m._id}>{m.name} ({m.email})</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary-custom" disabled={saving}>
                  {saving ? '⏳ Saving...' : editUser ? '✅ Update' : '➕ Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!confirm}
        title="Deactivate User"
        message={`Are you sure you want to deactivate ${confirm?.name}? They will lose access to the platform.`}
        onConfirm={() => handleDelete(confirm.id)}
        onCancel={() => setConfirm(null)}
        danger
      />
    </div>
  );
}
