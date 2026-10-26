import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { taskAPI, userAPI, projectAPI } from '../../api';
import { PageHeader, LoadingSpinner, StatusBadge, PriorityBadge, EmptyState, formatDate } from '../../components/shared/UIComponents';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

const EMPTY_TASK = {
  title: '', description: '', project: '', module: '', intern: '',
  technologies: '', deadline: '', expectedDeliverables: '', acceptanceCriteria: '', priority: 'medium',
};

export default function MentorTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_TASK);
  const [saving, setSaving] = useState(false);
  const [projects, setProjects] = useState([]);
  const [modules, setModules] = useState([]);
  const [interns, setInterns] = useState([]);
  const [filter, setFilter] = useState('');
  const navigate = useNavigate();

  useEffect(() => { fetchTasks(); fetchFormData(); }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await taskAPI.getAll({ status: filter || undefined });
      setTasks(res.data.tasks);
    } catch { toast.error('Failed to load tasks.'); }
    finally { setLoading(false); }
  };

  const fetchFormData = async () => {
    try {
      const [pRes, iRes] = await Promise.all([projectAPI.getAll(), userAPI.getInterns()]);
      setProjects(pRes.data.projects);
      setInterns(iRes.data.interns);
    } catch {}
  };

  useEffect(() => { fetchTasks(); }, [filter]);

  const handleProjectChange = async (projectId) => {
    setForm(f => ({ ...f, project: projectId, module: '' }));
    if (projectId) {
      const res = await projectAPI.getModules({ project: projectId });
      setModules(res.data.modules);
    } else setModules([]);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, technologies: form.technologies.split(',').map(t => t.trim()).filter(Boolean) };
      const res = await taskAPI.create(payload);
      toast.success('Task created! Now generate an AI explanation.');
      setShowModal(false);
      navigate(`/mentor/tasks/${res.data.task._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create task.');
    } finally { setSaving(false); }
  };

  const submittedTasks = tasks.filter(t => t.status === 'submitted');

  return (
    <div>
      <PageHeader title="Tasks" icon="📋" subtitle="Manage tasks for your interns"
        actions={<button className="btn-primary-custom" onClick={() => { setForm(EMPTY_TASK); setShowModal(true); }}>➕ Assign Task</button>}
      />

      {submittedTasks.length > 0 && (
        <div className="alert-custom alert-warning" style={{ marginBottom: 20 }}>
          📤 {submittedTasks.length} task(s) awaiting your review.
        </div>
      )}

      {/* Status filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {['', 'assigned', 'in-progress', 'submitted', 'changes-requested', 'approved', 'overdue'].map(s => (
          <button key={s} className={`pagination-btn ${filter === s ? 'active' : ''}`}
            onClick={() => setFilter(s)} style={{ fontSize: 12 }}>
            {s || 'All'}
            {s === 'submitted' && submittedTasks.length > 0 && ` (${submittedTasks.length})`}
          </button>
        ))}
      </div>

      {loading ? <LoadingSpinner /> : tasks.length === 0 ? (
        <EmptyState icon="📋" title="No tasks found" message="Assign a new task to get started." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {tasks.map(task => (
            <div key={task._id} className="task-card" onClick={() => navigate(`/mentor/tasks/${task._id}`)}>
              <div className="task-card-header">
                <div className="task-card-title">{task.title}</div>
                <StatusBadge status={task.status} />
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10, lineHeight: 1.5 }}>
                {task.description.substring(0, 80)}...
              </div>
              <div className="task-card-meta">
                <span>👤 {task.intern?.name}</span>
                <span>🗂️ {task.project?.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                <PriorityBadge priority={task.priority} />
                <span className={new Date(task.deadline) < new Date() ? 'task-deadline-overdue' : 'task-deadline'} style={{ fontSize: 12 }}>
                  ⏰ {formatDate(task.deadline)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">📋 Assign Task</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div style={{ marginBottom: 14 }}>
                  <label className="form-label-custom">Task Title *</label>
                  <input className="form-control-custom" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label className="form-label-custom">Description *</label>
                  <textarea className="form-control-custom" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required />
                </div>
                <div className="two-col-grid" style={{ marginBottom: 14 }}>
                  <div>
                    <label className="form-label-custom">Project *</label>
                    <select className="form-control-custom" value={form.project} onChange={e => handleProjectChange(e.target.value)} required>
                      <option value="">Select Project</option>
                      {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label-custom">Module</label>
                    <select className="form-control-custom" value={form.module} onChange={e => setForm({ ...form, module: e.target.value })}>
                      <option value="">No Module</option>
                      {modules.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="two-col-grid" style={{ marginBottom: 14 }}>
                  <div>
                    <label className="form-label-custom">Intern *</label>
                    <select className="form-control-custom" value={form.intern} onChange={e => setForm({ ...form, intern: e.target.value })} required>
                      <option value="">Select Intern</option>
                      {interns.map(i => <option key={i._id} value={i._id}>{i.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label-custom">Deadline *</label>
                    <input type="datetime-local" className="form-control-custom" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} required />
                  </div>
                </div>
                <div className="two-col-grid" style={{ marginBottom: 14 }}>
                  <div>
                    <label className="form-label-custom">Technologies</label>
                    <input className="form-control-custom" placeholder="React, Node.js" value={form.technologies} onChange={e => setForm({ ...form, technologies: e.target.value })} />
                  </div>
                  <div>
                    <label className="form-label-custom">Priority</label>
                    <select className="form-control-custom" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                      <option value="low">Low</option><option value="medium">Medium</option>
                      <option value="high">High</option><option value="critical">Critical</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label className="form-label-custom">Expected Deliverables</label>
                  <textarea className="form-control-custom" rows={2} value={form.expectedDeliverables} onChange={e => setForm({ ...form, expectedDeliverables: e.target.value })} />
                </div>
                <div>
                  <label className="form-label-custom">Acceptance Criteria</label>
                  <textarea className="form-control-custom" rows={2} value={form.acceptanceCriteria} onChange={e => setForm({ ...form, acceptanceCriteria: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary-custom" disabled={saving}>{saving ? 'Creating...' : '📋 Create Task'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
