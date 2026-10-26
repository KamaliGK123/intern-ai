export const StatusBadge = ({ status }) => {
  const map = {
    'assigned': '📌 Assigned',
    'in-progress': '⚙️ In Progress',
    'submitted': '📤 Submitted',
    'changes-requested': '🔁 Changes Requested',
    'approved': '✅ Approved',
    'overdue': '🔴 Overdue',
    'scheduled': '📅 Scheduled',
    'rescheduled': '🔄 Rescheduled',
    'cancelled': '❌ Cancelled',
    'completed': '✅ Completed',
    'active': '🟢 Active',
    'archived': '📦 Archived',
    'on-hold': '⏸️ On Hold',
  };
  const label = map[status] || status;
  return <span className={`badge-status badge-${status}`}>{label}</span>;
};

export const PriorityBadge = ({ priority }) => {
  const map = { low: '🔵 Low', medium: '🟡 Medium', high: '🟠 High', critical: '🔴 Critical' };
  return <span className={`badge-status badge-${priority}`}>{map[priority] || priority}</span>;
};

export const RoleBadge = ({ role }) => {
  return <span className={`badge-status badge-${role}`}>{role}</span>;
};

export const LoadingSpinner = ({ message = 'Loading...' }) => (
  <div className="loading-spinner">
    <div className="spinner-ring"></div>
    <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{message}</p>
  </div>
);

export const EmptyState = ({ icon = '📭', title, message, action }) => (
  <div className="empty-state">
    <div className="empty-state-icon">{icon}</div>
    <h3>{title}</h3>
    <p>{message}</p>
    {action && <div style={{ marginTop: 20 }}>{action}</div>}
  </div>
);

export const ConfirmDialog = ({ isOpen, title, message, onConfirm, onCancel, danger = false }) => {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="modal-close" onClick={onCancel}>✕</button>
        </div>
        <div className="modal-body">
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{message}</p>
        </div>
        <div className="modal-footer">
          <button className="btn-ghost" onClick={onCancel}>Cancel</button>
          <button
            className={danger ? 'btn-danger-custom' : 'btn-primary-custom'}
            onClick={onConfirm}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export const PageHeader = ({ title, subtitle, icon, actions }) => (
  <div className="page-header">
    <div>
      <h1 className="page-title">{icon && <span>{icon}</span>}{title}</h1>
      {subtitle && <p className="page-subtitle">{subtitle}</p>}
    </div>
    {actions && <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>{actions}</div>}
  </div>
);

export const StatCard = ({ icon, value, label, colorClass = 'stat-blue' }) => (
  <div className={`stat-card ${colorClass}`}>
    <div className="stat-icon">{icon}</div>
    <div className="stat-info">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  </div>
);

export const formatDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

export const formatDateTime = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const isOverdue = (deadline, status) => {
  return new Date(deadline) < new Date() && !['approved', 'overdue'].includes(status);
};

export const daysUntil = (date) => {
  const diff = new Date(date) - new Date();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return days;
};
