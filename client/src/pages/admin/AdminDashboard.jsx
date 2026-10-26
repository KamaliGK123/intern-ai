import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI } from '../../api';
import { StatCard, LoadingSpinner, StatusBadge, PageHeader, formatDate } from '../../components/shared/UIComponents';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await dashboardAPI.getAdmin();
      setData(res.data);
    } catch (err) {
      toast.error('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading admin dashboard..." />;

  const { stats, recentTasks, interns } = data;
  const filteredInterns = interns?.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.email.toLowerCase().includes(search.toLowerCase()) ||
    (i.department || '').toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div>
      <PageHeader
        title="Admin Dashboard"
        icon="👑"
        subtitle="Overview of all internship activities"
        actions={
          <button className="btn-primary-custom" onClick={() => navigate('/admin/tasks')}>
            ➕ Assign Task
          </button>
        }
      />

      {/* Stats Grid */}
      <div className="stats-grid">
        <StatCard icon="👥" value={stats.totalInterns} label="Total Interns" colorClass="stat-blue" />
        <StatCard icon="✅" value={stats.activeInterns} label="Active Interns" colorClass="stat-green" />
        <StatCard icon="👨‍💼" value={stats.totalMentors} label="Mentors" colorClass="stat-purple" />
        <StatCard icon="📋" value={stats.totalTasks} label="Total Tasks" colorClass="stat-teal" />
        <StatCard icon="⚙️" value={stats.inProgressTasks} label="In Progress" colorClass="stat-orange" />
        <StatCard icon="📤" value={stats.pendingReviews} label="Pending Reviews" colorClass="stat-purple" />
        <StatCard icon="🔴" value={stats.overdueTasks} label="Overdue Tasks" colorClass="stat-red" />
        <StatCard icon="📅" value={stats.upcomingMeetings} label="Upcoming Meetings" colorClass="stat-blue" />
      </div>

      <div className="two-col-grid">
        {/* Recent Tasks */}
        <div className="if-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>🕐 Recent Tasks</h3>
            <button className="btn-ghost" style={{ fontSize: 12, padding: '5px 12px' }} onClick={() => navigate('/admin/tasks')}>View All</button>
          </div>
          {recentTasks?.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 20 }}>No tasks yet.</p>
          ) : (
            recentTasks?.slice(0, 6).map(task => (
              <div
                key={task._id}
                onClick={() => navigate(`/admin/tasks/${task._id}`)}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 0', borderBottom: '1px solid var(--border-color)', cursor: 'pointer',
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{task.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {task.intern?.name} · {task.project?.name}
                  </div>
                </div>
                <StatusBadge status={task.status} />
              </div>
            ))
          )}
        </div>

        {/* Quick Actions */}
        <div className="if-card">
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>⚡ Quick Actions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: '➕ Add New Intern', path: '/admin/users', color: 'btn-primary-custom' },
              { label: '📋 Assign New Task', path: '/admin/tasks', color: 'btn-primary-custom' },
              { label: '🗂️ Create Project', path: '/admin/projects', color: 'btn-ghost' },
              { label: '📅 Schedule Meeting', path: '/admin/calendar', color: 'btn-ghost' },
            ].map(action => (
              <button
                key={action.label}
                className={action.color}
                onClick={() => navigate(action.path)}
                style={{ justifyContent: 'flex-start' }}
              >
                {action.label}
              </button>
            ))}
          </div>

          <div style={{ marginTop: 24, padding: 16, background: 'var(--bg-dark-3)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>System Status</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
              <span>Pending Feedback Approvals</span>
              <span style={{ fontWeight: 600, color: stats.pendingFeedbacks > 0 ? 'var(--warning)' : 'var(--success-light)' }}>
                {stats.pendingFeedbacks}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-secondary)' }}>
              <span>Overdue Tasks</span>
              <span style={{ fontWeight: 600, color: stats.overdueTasks > 0 ? 'var(--danger-light)' : 'var(--success-light)' }}>
                {stats.overdueTasks}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Intern Table */}
      <div className="if-card" style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>👥 Intern Overview</h3>
          <div className="search-bar" style={{ maxWidth: 280 }}>
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search interns..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="table-custom">
            <thead>
              <tr>
                <th>Intern</th>
                <th>Department</th>
                <th>Mentor</th>
                <th>Tasks</th>
                <th>Approved</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInterns.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 30 }}>No interns found.</td></tr>
              ) : (
                filteredInterns.map(intern => (
                  <tr key={intern._id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{intern.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{intern.email}</div>
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{intern.department || 'N/A'}</td>
                    <td style={{ fontSize: 13 }}>{intern.assignedMentor?.name || <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>}</td>
                    <td style={{ fontSize: 13 }}>{intern.taskStats?.total || 0}</td>
                    <td>
                      <span style={{ color: 'var(--success-light)', fontWeight: 600, fontSize: 13 }}>
                        {intern.taskStats?.approved || 0}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(intern.createdAt)}</td>
                    <td>
                      <button
                        className="btn-ghost"
                        style={{ fontSize: 11, padding: '4px 10px' }}
                        onClick={() => navigate('/admin/users')}
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
