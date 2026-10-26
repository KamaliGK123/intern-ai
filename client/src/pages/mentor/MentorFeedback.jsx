import { useEffect, useState } from 'react';
import { feedbackAPI } from '../../api';
import { PageHeader, LoadingSpinner, EmptyState, formatDate } from '../../components/shared/UIComponents';
import toast from 'react-hot-toast';

export default function MentorFeedback() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => { fetchFeedbacks(); }, []);

  const fetchFeedbacks = async () => {
    setLoading(true);
    try {
      const res = await feedbackAPI.getAll({});
      setFeedbacks(res.data.feedbacks);
    } catch { toast.error('Failed to load feedback.'); }
    finally { setLoading(false); }
  };

  const handleApprove = async (id) => {
    try {
      await feedbackAPI.approve(id);
      toast.success('Feedback approved and emailed to intern!');
      fetchFeedbacks();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to approve.'); }
  };

  const filtered = feedbacks.filter(f => filter === 'all' ? true : filter === 'pending' ? !f.isApproved : f.isApproved);

  if (loading) return <LoadingSpinner message="Loading feedback..." />;

  return (
    <div>
      <PageHeader title="Feedback Management" icon="💬" subtitle="Review and approve AI-generated feedback" />

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['all', 'pending', 'approved'].map(f => (
          <button key={f} className={`pagination-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)} style={{ fontSize: 12, textTransform: 'capitalize' }}>
            {f} {f === 'pending' && `(${feedbacks.filter(fb => !fb.isApproved).length})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="💬" title="No feedback" message="Feedback is created from the task detail page." />
      ) : filtered.map(fb => (
        <div key={fb._id} className="if-card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{fb.task?.title}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                Intern: {fb.intern?.name} · Stage: {fb.reviewStage} · {formatDate(fb.createdAt)}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {fb.overallRating && <span style={{ fontSize: 14 }}>{'⭐'.repeat(fb.overallRating)}</span>}
              {!fb.isApproved ? (
                <button className="btn-success-custom" style={{ fontSize: 12 }} onClick={() => handleApprove(fb._id)}>
                  ✅ Approve & Send
                </button>
              ) : (
                <span style={{ fontSize: 12, color: 'var(--success-light)' }}>✅ Sent</span>
              )}
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>YOUR NOTES</div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{fb.mentorNotes}</p>
          </div>

          {fb.aiStructuredFeedback && Object.values(fb.aiStructuredFeedback).some(arr => arr?.length > 0) && (
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', marginBottom: 10 }}>🤖 AI STRUCTURED FEEDBACK</div>
              <div className="two-col-grid">
                {[
                  { key: 'completedRequirements', label: '✅ Completed', color: 'var(--success-light)' },
                  { key: 'identifiedProblems', label: '⚠️ Problems', color: 'var(--danger-light)' },
                  { key: 'missingRequirements', label: '📋 Missing', color: 'var(--warning)' },
                  { key: 'recommendedCorrections', label: '🔧 Corrections', color: 'var(--accent)' },
                ].map(({ key, label, color }) => fb.aiStructuredFeedback[key]?.length > 0 && (
                  <div key={key}>
                    <div style={{ fontSize: 11, fontWeight: 700, color, marginBottom: 6 }}>{label}</div>
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                      {fb.aiStructuredFeedback[key].map((item, i) => (
                        <li key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
