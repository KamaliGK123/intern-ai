import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { taskAPI } from '../../api';
import { PageHeader, LoadingSpinner, StatusBadge, PriorityBadge, EmptyState, formatDate } from '../../components/shared/UIComponents';
import toast from 'react-hot-toast';

export default function InternTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const navigate = useNavigate();

  useEffect(() => { fetchTasks(); }, [filter]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await taskAPI.getAll({ status: filter || undefined });
      setTasks(res.data.tasks);
    } catch { toast.error('Failed to load tasks.'); }
    finally { setLoading(false); }
  };

  const overdueTasks = tasks.filter(t => new Date(t.deadline) < new Date() && !['approved', 'overdue'].includes(t.status));

  return (
    <div>
      <PageHeader title="My Tasks" icon="📋" subtitle="View and work on your assigned tasks" />

      {overdueTasks.length > 0 && (
        <div className="alert-custom alert-error" style={{ marginBottom: 20 }}>
          🔴 {overdueTasks.length} task(s) are overdue. Please contact your mentor immediately.
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {['', 'assigned', 'in-progress', 'submitted', 'changes-requested', 'approved', 'overdue'].map(s => (
          <button key={s} className={`pagination-btn ${filter === s ? 'active' : ''}`}
            onClick={() => setFilter(s)} style={{ fontSize: 12 }}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {loading ? <LoadingSpinner /> : tasks.length === 0 ? (
        <EmptyState icon="📋" title="No tasks found" message="Your mentor will assign tasks to you soon." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {tasks.map(task => {
            const isOverdue = new Date(task.deadline) < new Date() && !['approved'].includes(task.status);
            return (
              <div key={task._id} className="task-card" onClick={() => navigate(`/intern/tasks/${task._id}`)}>
                <div className="task-card-header">
                  <div className="task-card-title">{task.title}</div>
                  <StatusBadge status={task.status} />
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10, lineHeight: 1.5 }}>
                  {task.description.substring(0, 80)}...
                </div>
                <div className="task-card-meta">
                  <span>🗂️ {task.project?.name}</span>
                  {task.module && <span>📦 {task.module?.name}</span>}
                  <span>👨‍💼 {task.mentor?.name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                  <PriorityBadge priority={task.priority} />
                  <span className={isOverdue ? 'task-deadline-overdue' : 'task-deadline'} style={{ fontSize: 12 }}>
                    ⏰ {formatDate(task.deadline)}
                  </span>
                </div>
                {task.technologies?.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 10 }}>
                    {task.technologies.slice(0, 3).map(t => (
                      <span key={t} style={{ fontSize: 10, background: 'rgba(74,144,217,0.1)', color: 'var(--accent)', padding: '2px 6px', borderRadius: 10 }}>{t}</span>
                    ))}
                  </div>
                )}
                <div style={{ marginTop: 10 }}>
                  {task.aiExplanationApproved && (
                    <span style={{ fontSize: 11, color: 'var(--success-light)' }}>💡 AI Explanation Available</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
