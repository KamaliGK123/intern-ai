import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useState, useEffect } from 'react';
import { dashboardAPI } from '../../api';
import toast from 'react-hot-toast';

const getNavItems = (role) => {
  const base = [
    { path: `/${role}/dashboard`, icon: '🏠', label: 'Dashboard' },
    { path: `/${role}/tasks`, icon: '📋', label: 'Tasks' },
    { path: `/${role}/calendar`, icon: '📅', label: 'Calendar' },
  ];
  if (role === 'admin') {
    return [
      ...base,
      { path: '/admin/users', icon: '👥', label: 'Users' },
      { path: '/admin/projects', icon: '🗂️', label: 'Projects' },
    ];
  }
  if (role === 'mentor') {
    return [...base, { path: '/mentor/feedback', icon: '💬', label: 'Feedback' }];
  }
  // intern
  return [...base, { path: '/intern/feedback', icon: '💬', label: 'My Feedback' }];
};

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const res = await dashboardAPI.getNotifications({ limit: 1 });
        const unread = res.data.notifications?.filter(n => !n.isRead).length || 0;
        setUnreadCount(unread);
      } catch {}
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const navItems = getNavItems(user?.role);
  const initials = user?.name?.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() || 'U';

  const roleBadgeClass = { admin: 'badge-admin', mentor: 'badge-mentor', intern: 'badge-intern' }[user?.role] || '';

  return (
    <div className="app-layout">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999 }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-logo">
          <h1>⚡ InternFlow AI</h1>
          <span>Intelligent Internship Platform</span>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-title">Navigation</div>
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}

          <div className="nav-section-title" style={{ marginTop: 16 }}>Account</div>

          <div
            className="nav-link"
            style={{ cursor: 'pointer' }}
            title="Notifications"
          >
            <span className="nav-icon">🔔</span>
            Notifications
            {unreadCount > 0 && <span className="nav-badge">{unreadCount}</span>}
          </div>

          <div className="nav-link" style={{ cursor: 'pointer' }} onClick={handleLogout}>
            <span className="nav-icon">🚪</span>
            Logout
          </div>
        </nav>

        <div className="sidebar-user">
          <div className="user-avatar">{initials}</div>
          <div className="user-info">
            <div className="user-name">{user?.name}</div>
            <div className="user-role">
              <span className={`badge-status ${roleBadgeClass}`} style={{ fontSize: 10 }}>
                {user?.role}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Mobile hamburger */}
        <button
          className="d-md-none btn-ghost mb-3"
          onClick={() => setMobileOpen(true)}
          style={{ padding: '8px 12px' }}
        >
          ☰ Menu
        </button>
        <Outlet />
      </main>
    </div>
  );
}
