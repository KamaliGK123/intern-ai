import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI, aiAPI } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { StatCard, LoadingSpinner, StatusBadge, formatDate, formatDateTime, EmptyState } from '../../components/shared/UIComponents';
import { VoicePlayer, MicrophoneInput } from '../../components/shared/VoiceComponents';
import toast from 'react-hot-toast';


export default function InternDashboard() {
  const { user } = useAuth();
  const { subscribe } = useSocket();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: `Hello ${user?.name || 'there'}! 👋 I'm your InternFlow AI Assistant. I can help you understand your tasks, answer questions about your assignments, and guide you through your internship. Ask me anything!` }
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const [lastAIResponse, setLastAIResponse] = useState('');
  const chatEndRef = useRef(null);


  const refreshData = useCallback(() => {
    dashboardAPI.getIntern().then(r => setData(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    dashboardAPI.getIntern()
      .then(r => setData(r.data))
      .catch(() => toast.error('Failed to load dashboard.'))
      .finally(() => setLoading(false));
  }, []);

  // Real-time socket subscriptions
  useEffect(() => {
    if (!subscribe) return;
    const unsubs = [
      subscribe('task:assigned', () => refreshData()),
      subscribe('task:statusChanged', () => refreshData()),
      subscribe('task:explanation-approved', () => refreshData()),
      subscribe('meeting:scheduled', () => refreshData()),
      subscribe('feedback:approved', () => refreshData()),
    ];
    return () => unsubs.forEach(fn => fn && fn());
  }, [subscribe, refreshData]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const sendMessage = async (msg) => {
    if (!msg?.trim() || chatLoading) return;
    const userMsg = msg.trim();
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setChatLoading(true);
    try {
      const res = await aiAPI.chat(userMsg);
      const reply = res.data.response;
      setChatMessages(prev => [...prev, { role: 'assistant', content: reply, isError: false }]);
      setLastAIResponse(reply);
    } catch (err) {
      const errMsg = err.response?.data?.message || 'AI assistant is unavailable. Please set a valid GEMINI_API_KEY in server/.env.';
      setChatMessages(prev => [...prev, { role: 'assistant', content: errMsg, isError: true }]);
    } finally {
      setChatLoading(false);
    }
  };


  const suggestedQuestions = [
    'What are my current tasks?',
    'How do I submit my work?',
    'When is my next review?',
    'What should I focus on first?',
  ];

  if (loading) return <LoadingSpinner message="Loading your dashboard..." />;

  const { stats, tasks, upcomingMeetings, recentFeedback, notifications } = data;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">👨‍💻 Welcome back, {user?.name}!</h1>
          <p className="page-subtitle">Here's your internship overview</p>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard icon="📋" value={stats.totalTasks} label="Total Tasks" colorClass="stat-blue" />
        <StatCard icon="⚙️" value={stats.inProgressTasks} label="In Progress" colorClass="stat-orange" />
        <StatCard icon="✅" value={stats.approvedTasks} label="Approved" colorClass="stat-green" />
        <StatCard icon="🔴" value={stats.overdueTasks} label="Overdue" colorClass="stat-red" />
        <StatCard icon="📅" value={stats.upcomingMeetings} label="Upcoming Meetings" colorClass="stat-purple" />
        <StatCard icon="🔔" value={stats.unreadNotifications} label="Notifications" colorClass="stat-teal" />
      </div>

      <div className="two-col-grid">
        {/* My Tasks */}
        <div className="if-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>📋 My Tasks</h3>
            <button className="btn-ghost" style={{ fontSize: 12, padding: '5px 12px' }} onClick={() => navigate('/intern/tasks')}>View All</button>
          </div>
          {tasks?.length === 0 ? (
            <EmptyState icon="📋" title="No tasks yet" message="Your mentor will assign tasks to you soon." />
          ) : tasks?.slice(0, 5).map(task => (
            <div key={task._id}
              onClick={() => navigate(`/intern/tasks/${task._id}`)}
              style={{ padding: '10px 0', borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontWeight: 600, fontSize: 13, flex: 1, marginRight: 8 }}>{task.title}</div>
                <StatusBadge status={task.status} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                🗂️ {task.project?.name} · ⏰ {formatDate(task.deadline)}
                {new Date(task.deadline) < new Date() && task.status !== 'approved' && (
                  <span style={{ color: '#ff6b6b', marginLeft: 6 }}>OVERDUE</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Upcoming Meetings & Feedback */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="if-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700 }}>📅 Upcoming Meetings</h3>
              <button className="btn-ghost" style={{ fontSize: 12, padding: '5px 12px' }} onClick={() => navigate('/intern/calendar')}>Calendar</button>
            </div>
            {upcomingMeetings?.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>No upcoming meetings.</p>
            ) : upcomingMeetings?.map(m => (
              <div key={m._id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{m.reviewStage?.replace(/-/g, ' ')}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  👨‍💼 {m.mentor?.name} · 📅 {formatDateTime(m.scheduledAt)}
                </div>
                {m.meetingLink && (
                  <a href={m.meetingLink} target="_blank" rel="noreferrer"
                    style={{ fontSize: 12, color: 'var(--accent)', display: 'block', marginTop: 4 }}>🔗 Join Meeting</a>
                )}
              </div>
            ))}
          </div>

          {recentFeedback?.length > 0 && (
            <div className="if-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700 }}>💬 Recent Feedback</h3>
                <button className="btn-ghost" style={{ fontSize: 12, padding: '5px 12px' }} onClick={() => navigate('/intern/feedback')}>View All</button>
              </div>
              {recentFeedback.map(fb => (
                <div key={fb._id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{fb.task?.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    👨‍💼 {fb.mentor?.name} · {formatDate(fb.createdAt)}
                    {fb.overallRating && <span style={{ marginLeft: 8 }}>{'⭐'.repeat(fb.overallRating)}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* AI Chatbot */}
      <div className="if-card" style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #4a90d9, #7c3aed)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🤖</div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>AI Task Assistant</h3>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Powered by Google Gemini · Knows your tasks & schedule · 🎙 Voice enabled</p>
          </div>
          {/* Voice player for last AI response — hidden if last message was an error */}
          {lastAIResponse && chatMessages.at(-1)?.isError !== true && (
            <VoicePlayer text={lastAIResponse} label="Read aloud" />
          )}
        </div>

        <div className="chat-container">
          <div className="chat-messages">
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={`chat-message ${msg.role}`}
                style={msg.isError ? {
                  background: 'rgba(231,76,60,0.08)',
                  border: '1px solid rgba(231,76,60,0.25)',
                  color: '#ff8a80',
                } : {}}
              >
                {/* Error badge */}
                {msg.isError && (
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#ff6b6b', marginBottom: 4 }}>
                    ⚠️ AI Unavailable
                  </div>
                )}
                <div>{msg.content}</div>
                {/* Voice controls — only on real AI responses, never on errors */}
                {msg.role === 'assistant' && i > 0 && !msg.isError && (
                  <VoicePlayer text={msg.content} label="🔊" />
                )}
              </div>
            ))}
            {chatLoading && (
              <div className="chat-message assistant">
                <div className="typing-dots"><span></span><span></span><span></span></div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Suggested Questions */}
          {chatMessages.length <= 1 && (
            <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>Quick questions:</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['What are my current tasks?', 'How do I submit my work?', 'When is my next review?', 'What should I focus on first?'].map(q => (
                  <button key={q} className="btn-ghost" style={{ fontSize: 11, padding: '4px 10px' }}
                    onClick={() => sendMessage(q)}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Microphone input with speech recognition fallback */}
          <div className="chat-input-row" style={{ display: 'block', padding: '8px 12px' }}>
            <MicrophoneInput
              onResult={sendMessage}
              placeholder="Ask anything about your tasks, deadlines, or reviews..."
              disabled={chatLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

