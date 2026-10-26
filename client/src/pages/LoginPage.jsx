import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome back, ${user.name}!`);
      if (user.role === 'admin') navigate('/admin/dashboard');
      else if (user.role === 'mentor') navigate('/mentor/dashboard');
      else navigate('/intern/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (role) => {
    const creds = {
      admin: { email: 'admin@internflow.com', password: 'Admin@123456' },
      mentor: { email: 'mentor@internflow.com', password: 'Mentor@123456' },
      intern: { email: 'intern@internflow.com', password: 'Intern@123456' },
    };
    setForm(creds[role]);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div style={{ fontSize: 48, marginBottom: 12 }}>⚡</div>
          <h1>InternFlow AI</h1>
          <p>Intelligent Internship Management Platform</p>
        </div>

        {error && (
          <div className="alert-custom alert-error" style={{ marginBottom: 20 }}>
            <span>⚠️</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label className="form-label-custom">Email Address</label>
            <input
              id="login-email"
              type="email"
              className="form-control-custom"
              placeholder="you@example.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              required
              autoFocus
            />
          </div>

          <div style={{ marginBottom: 24, position: 'relative' }}>
            <label className="form-label-custom">Password</label>
            <input
              id="login-password"
              type={showPass ? 'text' : 'password'}
              className="form-control-custom"
              placeholder="Enter your password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required
              style={{ paddingRight: 40 }}
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              style={{
                position: 'absolute', right: 12, top: 32, background: 'none',
                border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16
              }}
            >
              {showPass ? '🙈' : '👁️'}
            </button>
          </div>

          <button
            id="login-submit"
            type="submit"
            className="btn-primary-custom"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '13px' }}
          >
            {loading ? (
              <>
                <div className="spinner-ring" style={{ width: 18, height: 18, borderWidth: 2 }}></div>
                Signing in...
              </>
            ) : '🚀 Sign In'}
          </button>
        </form>

        <div style={{ marginTop: 24, borderTop: '1px solid var(--border-color)', paddingTop: 20 }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 12 }}>
            Quick demo access
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            {['admin', 'mentor', 'intern'].map(role => (
              <button
                key={role}
                id={`demo-${role}`}
                type="button"
                className="btn-ghost"
                onClick={() => fillDemo(role)}
                style={{ flex: 1, justifyContent: 'center', fontSize: 12, padding: '7px 10px' }}
              >
                {role === 'admin' ? '👑' : role === 'mentor' ? '👨‍💼' : '👨‍💻'} {role}
              </button>
            ))}
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', marginTop: 24 }}>
          Powered by Google Gemini AI · InternFlow AI v1.0
        </p>
      </div>
    </div>
  );
}
