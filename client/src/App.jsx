import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';

// Pages
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import ManageUsers from './pages/admin/ManageUsers';
import ManageProjects from './pages/admin/ManageProjects';
import ManageTasks from './pages/admin/ManageTasks';
import TaskDetail from './pages/shared/TaskDetail';
import MentorDashboard from './pages/mentor/MentorDashboard';
import MentorTasks from './pages/mentor/MentorTasks';
import MentorFeedback from './pages/mentor/MentorFeedback';
import InternDashboard from './pages/intern/InternDashboard';
import InternTasks from './pages/intern/InternTasks';
import InternFeedback from './pages/intern/InternFeedback';
import CalendarPage from './pages/shared/CalendarPage';
import AppLayout from './components/layout/AppLayout';

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="loading-spinner" style={{ minHeight: '100vh' }}>
      <div className="spinner-ring"></div>
      <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading InternFlow AI...</p>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
};

const DashboardRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (user.role === 'admin') return <Navigate to="/admin/dashboard" />;
  if (user.role === 'mentor') return <Navigate to="/mentor/dashboard" />;
  return <Navigate to="/intern/dashboard" />;
};

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#1e293b',
                color: '#f1f5f9',
                border: '1px solid rgba(255,255,255,0.08)',
                fontSize: '14px',
              },
              success: { iconTheme: { primary: '#52b788', secondary: '#fff' } },
              error: { iconTheme: { primary: '#e74c3c', secondary: '#fff' } },
            }}
          />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardRedirect /></ProtectedRoute>} />

            {/* Admin Routes */}
            <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AppLayout /></ProtectedRoute>}>
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="users" element={<ManageUsers />} />
              <Route path="projects" element={<ManageProjects />} />
              <Route path="tasks" element={<ManageTasks />} />
              <Route path="tasks/:id" element={<TaskDetail />} />
              <Route path="calendar" element={<CalendarPage />} />
            </Route>

            {/* Mentor Routes */}
            <Route path="/mentor" element={<ProtectedRoute roles={['mentor']}><AppLayout /></ProtectedRoute>}>
              <Route path="dashboard" element={<MentorDashboard />} />
              <Route path="tasks" element={<MentorTasks />} />
              <Route path="tasks/:id" element={<TaskDetail />} />
              <Route path="feedback" element={<MentorFeedback />} />
              <Route path="calendar" element={<CalendarPage />} />
            </Route>

            {/* Intern Routes */}
            <Route path="/intern" element={<ProtectedRoute roles={['intern']}><AppLayout /></ProtectedRoute>}>
              <Route path="dashboard" element={<InternDashboard />} />
              <Route path="tasks" element={<InternTasks />} />
              <Route path="tasks/:id" element={<TaskDetail />} />
              <Route path="feedback" element={<InternFeedback />} />
              <Route path="calendar" element={<CalendarPage />} />
            </Route>

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
}

