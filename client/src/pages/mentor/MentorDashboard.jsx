import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI } from '../../api';
import { useSocket } from '../../contexts/SocketContext';
import { StatCard, LoadingSpinner, StatusBadge, formatDate, formatDateTime, EmptyState } from '../../components/shared/UIComponents';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';



export default function MentorDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { subscribe } = useSocket();

  const fetchData = useCallback(() => {
    dashboardAPI.getMentor()
      .then(r => setData(r.data))
      .catch(() => toast.error('Failed to load dashboard.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Real-time: refresh when interns submit tasks or meetings are scheduled
  useEffect(() => {
    if (!subscribe) return;
    const unsubs = [
      subscribe('task:statusChanged', () => fetchData()),
      subscribe('task:created', () => fetchData()),
      subscribe('meeting:scheduled', () => fetchData()),
    ];
    return () => unsubs.forEach(fn => fn && fn());
  }, [subscribe, fetchData]);

  if (loading) return <LoadingSpinner message="Loading mentor dashboard..." />;


  const { stats, upcomingMeetings, recentTasks } = data;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">👨‍💼 Mentor Dashboard</h1>
          <p className="page-subtitle">Your interns, tasks, and upcoming reviews</p>
        </div>
        <button className="btn-primary-custom" onClick={() => navigate('/mentor/tasks')}>➕ Assign Task</button>
      </div>

      <div className="stats-grid">
        <StatCard icon="👥" value={stats.myInterns} label="My Interns" colorClass="stat-blue" />
        <StatCard icon="📤" value={stats.pendingReviews} label="Pending Reviews" colorClass="stat-orange" />
        <StatCard icon="📅" value={stats.upcomingMeetingsCount} label="Upcoming Meetings" colorClass="stat-green" />
        <StatCard icon="🔴" value={stats.overdueTasks} label="Overdue Tasks" colorClass="stat-red" />
        <StatCard icon="💬" value={stats.pendingFeedbacks} label="Pending Feedback Approvals" colorClass="stat-purple" />
      </div>

      <div className="two-col-grid">
        {/* Upcoming Meetings */}
        <div className="if-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>📅 Upcoming Meetings</h3>
            <button className="btn-ghost" style={{ fontSize: 12, padding: '5px 12px' }} onClick={() => navigate('/mentor/calendar')}>View All</button>
          </div>
          {upcomingMeetings?.length === 0 ? (
            <EmptyState icon="📅" title="No upcoming meetings" message="Schedule a review meeting from a task page." />
          ) : upcomingMeetings?.map(m => (
            <div key={m._id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                {m.reviewStage?.replace(/-/g, ' ')} — {m.task?.title}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                👤 {m.intern?.name} · 📅 {formatDateTime(m.scheduledAt)}
              </div>
            </div>
          ))}
        </div>

        {/* Recent Tasks */}
        <div className="if-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>📋 Recent Tasks</h3>
            <button className="btn-ghost" style={{ fontSize: 12, padding: '5px 12px' }} onClick={() => navigate('/mentor/tasks')}>View All</button>
          </div>
          {recentTasks?.length === 0 ? (
            <EmptyState icon="📋" title="No tasks yet" message="Assign tasks to your interns." />
          ) : recentTasks?.slice(0, 6).map(task => (
            <div key={task._id}
              onClick={() => navigate(`/mentor/tasks/${task._id}`)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{task.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{task.intern?.name} · Due {formatDate(task.deadline)}</div>
              </div>
              <StatusBadge status={task.status} />
            </div>
          ))}
        </div>
      </div>

      {/* Action Cards */}
      {stats.pendingReviews > 0 && (
        <div className="alert-custom alert-warning" style={{ marginTop: 20 }}>
          ⚠️ You have <strong>{stats.pendingReviews}</strong> submission(s) waiting for review.
          <button className="btn-ghost" style={{ marginLeft: 12, fontSize: 12 }} onClick={() => navigate('/mentor/tasks')}>Review Now →</button>
        </div>
      )}
    </div>
  );
}
