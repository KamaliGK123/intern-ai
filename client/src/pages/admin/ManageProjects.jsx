import { useEffect, useState } from 'react';
import { projectAPI } from '../../api';
import { PageHeader, LoadingSpinner, EmptyState, ConfirmDialog, formatDate } from '../../components/shared/UIComponents';
import toast from 'react-hot-toast';

export default function ManageProjects() {
  const [projects, setProjects] = useState([]);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('projects');
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [projectForm, setProjectForm] = useState({ name: '', description: '', techStack: '', status: 'active', startDate: '', endDate: '' });
  const [moduleForm, setModuleForm] = useState({ name: '', description: '', project: '', order: 1 });
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [pRes, mRes] = await Promise.all([projectAPI.getAll(), projectAPI.getModules()]);
      setProjects(pRes.data.projects);
      setModules(mRes.data.modules);
    } catch { toast.error('Failed to load data.'); }
    finally { setLoading(false); }
  };

  const handleSaveProject = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...projectForm, techStack: projectForm.techStack.split(',').map(t => t.trim()).filter(Boolean) };
      if (editItem) await projectAPI.update(editItem._id, payload);
      else await projectAPI.create(payload);
      toast.success(editItem ? 'Project updated.' : 'Project created.');
      setShowProjectModal(false);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save project.');
    } finally { setSaving(false); }
  };

  const handleSaveModule = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editItem) await projectAPI.updateModule(editItem._id, moduleForm);
      else await projectAPI.createModule(moduleForm);
      toast.success(editItem ? 'Module updated.' : 'Module created.');
      setShowModuleModal(false);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save module.');
    } finally { setSaving(false); }
  };

  const openProject = (p) => {
    setEditItem(p);
    setProjectForm({
      name: p.name, description: p.description,
      techStack: (p.techStack || []).join(', '),
      status: p.status, startDate: p.startDate ? p.startDate.slice(0, 10) : '',
      endDate: p.endDate ? p.endDate.slice(0, 10) : '',
    });
    setShowProjectModal(true);
  };

  const openModule = (m) => {
    setEditItem(m);
    setModuleForm({ name: m.name, description: m.description || '', project: m.project?._id || '', order: m.order || 1 });
    setShowModuleModal(true);
  };

  if (loading) return <LoadingSpinner message="Loading projects..." />;

  return (
    <div>
      <PageHeader
        title="Projects & Modules"
        icon="🗂️"
        subtitle="Manage project structure and modules"
        actions={
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-ghost" onClick={() => { setEditItem(null); setModuleForm({ name: '', description: '', project: '', order: 1 }); setShowModuleModal(true); }}>
              ➕ Add Module
            </button>
            <button className="btn-primary-custom" onClick={() => { setEditItem(null); setProjectForm({ name: '', description: '', techStack: '', status: 'active', startDate: '', endDate: '' }); setShowProjectModal(true); }}>
              ➕ New Project
            </button>
          </div>
        }
      />

      <div className="tabs-nav">
        <button className={`tab-btn ${activeTab === 'projects' ? 'active' : ''}`} onClick={() => setActiveTab('projects')}>
          🗂️ Projects ({projects.length})
        </button>
        <button className={`tab-btn ${activeTab === 'modules' ? 'active' : ''}`} onClick={() => setActiveTab('modules')}>
          📦 Modules ({modules.length})
        </button>
      </div>

      {activeTab === 'projects' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {projects.length === 0 ? (
            <EmptyState icon="🗂️" title="No projects yet" message="Create your first project to get started." />
          ) : projects.map(p => (
            <div key={p._id} className="if-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', flex: 1 }}>{p.name}</h3>
                <span className={`badge-status badge-${p.status}`} style={{ marginLeft: 8, flexShrink: 0 }}>{p.status}</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.5 }}>
                {p.description.substring(0, 100)}...
              </p>
              {p.techStack?.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                  {p.techStack.map(t => (
                    <span key={t} style={{ background: 'rgba(74,144,217,0.1)', color: 'var(--accent)', fontSize: 11, padding: '2px 8px', borderRadius: 12 }}>{t}</span>
                  ))}
                </div>
              )}
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>
                Created: {formatDate(p.createdAt)} · By {p.createdBy?.name}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-ghost" style={{ fontSize: 12, padding: '5px 12px' }} onClick={() => openProject(p)}>✏️ Edit</button>
                <button className="btn-danger-custom" style={{ fontSize: 12, padding: '5px 12px' }}
                  onClick={() => setConfirm({ type: 'project', id: p._id, name: p.name })}>
                  📦 Archive
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'modules' && (
        <div className="if-card" style={{ padding: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="table-custom">
              <thead>
                <tr><th>Module</th><th>Project</th><th>Order</th><th>Status</th><th>Created</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {modules.length === 0 ? (
                  <tr><td colSpan={6}><EmptyState icon="📦" title="No modules" message="Create modules within a project." /></td></tr>
                ) : modules.map(m => (
                  <tr key={m._id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{m.name}</div>
                      {m.description && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.description.substring(0, 50)}</div>}
                    </td>
                    <td style={{ fontSize: 13 }}>{m.project?.name}</td>
                    <td style={{ fontSize: 13 }}>{m.order}</td>
                    <td><span className={`badge-status badge-${m.status}`}>{m.status}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(m.createdAt)}</td>
                    <td>
                      <button className="btn-ghost" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => openModule(m)}>Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Project Modal */}
      {showProjectModal && (
        <div className="modal-overlay" onClick={() => setShowProjectModal(false)}>
          <div className="modal-box" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editItem ? '✏️ Edit Project' : '➕ New Project'}</h3>
              <button className="modal-close" onClick={() => setShowProjectModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveProject}>
              <div className="modal-body">
                <div style={{ marginBottom: 14 }}>
                  <label className="form-label-custom">Project Name *</label>
                  <input className="form-control-custom" value={projectForm.name} onChange={e => setProjectForm({ ...projectForm, name: e.target.value })} required />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label className="form-label-custom">Description *</label>
                  <textarea className="form-control-custom" rows={3} value={projectForm.description} onChange={e => setProjectForm({ ...projectForm, description: e.target.value })} required />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label className="form-label-custom">Tech Stack (comma-separated)</label>
                  <input className="form-control-custom" placeholder="React, Node.js, MongoDB" value={projectForm.techStack} onChange={e => setProjectForm({ ...projectForm, techStack: e.target.value })} />
                </div>
                <div className="two-col-grid" style={{ marginBottom: 14 }}>
                  <div>
                    <label className="form-label-custom">Status</label>
                    <select className="form-control-custom" value={projectForm.status} onChange={e => setProjectForm({ ...projectForm, status: e.target.value })}>
                      <option value="active">Active</option>
                      <option value="on-hold">On Hold</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label-custom">Start Date</label>
                    <input type="date" className="form-control-custom" value={projectForm.startDate} onChange={e => setProjectForm({ ...projectForm, startDate: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-ghost" onClick={() => setShowProjectModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary-custom" disabled={saving}>{saving ? 'Saving...' : editItem ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Module Modal */}
      {showModuleModal && (
        <div className="modal-overlay" onClick={() => setShowModuleModal(false)}>
          <div className="modal-box" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editItem ? '✏️ Edit Module' : '➕ New Module'}</h3>
              <button className="modal-close" onClick={() => setShowModuleModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveModule}>
              <div className="modal-body">
                <div style={{ marginBottom: 14 }}>
                  <label className="form-label-custom">Module Name *</label>
                  <input className="form-control-custom" value={moduleForm.name} onChange={e => setModuleForm({ ...moduleForm, name: e.target.value })} required />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label className="form-label-custom">Description</label>
                  <textarea className="form-control-custom" rows={2} value={moduleForm.description} onChange={e => setModuleForm({ ...moduleForm, description: e.target.value })} />
                </div>
                <div className="two-col-grid">
                  <div>
                    <label className="form-label-custom">Project *</label>
                    <select className="form-control-custom" value={moduleForm.project} onChange={e => setModuleForm({ ...moduleForm, project: e.target.value })} required>
                      <option value="">Select Project</option>
                      {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label-custom">Order</label>
                    <input type="number" min="1" className="form-control-custom" value={moduleForm.order} onChange={e => setModuleForm({ ...moduleForm, order: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-ghost" onClick={() => setShowModuleModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary-custom" disabled={saving}>{saving ? 'Saving...' : editItem ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!confirm}
        title="Archive Item"
        message={`Archive "${confirm?.name}"? It will be hidden from active lists.`}
        onConfirm={async () => {
          try {
            if (confirm.type === 'project') await projectAPI.delete(confirm.id);
            else await projectAPI.deleteModule(confirm.id);
            toast.success('Archived successfully.');
            fetchAll();
          } catch { toast.error('Failed to archive.'); }
          setConfirm(null);
        }}
        onCancel={() => setConfirm(null)}
        danger
      />
    </div>
  );
}
