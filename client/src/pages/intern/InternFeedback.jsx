import { useEffect, useState } from 'react';
import { feedbackAPI } from '../../api';
import { PageHeader, LoadingSpinner, EmptyState, formatDate } from '../../components/shared/UIComponents';
import toast from 'react-hot-toast';

export default function InternFeedback() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    feedbackAPI.getAll({})
      .then(r => setFeedbacks(r.data.feedbacks.filter(f => f.isApproved)))
      .catch(() => toast.error('Failed to load feedback.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner message="Loading feedback..." />;

  const renderList = (items, icon = '•') =>
    items?.length > 0 ? (
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {items.map((item, i) => (
          <li key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', padding: '3px 0', display: 'flex', gap: 8 }}>
            <span>{icon}</span><span>{item}</span>
          </li>
        ))}
      </ul>
    ) : <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>None noted.</p>;

  return (
    <div>
      <PageHeader title="My Feedback" icon="💬" subtitle="Review feedback from your mentor" />

      {feedbacks.length === 0 ? (
        <EmptyState icon="💬" title="No feedback yet" message="Feedback from your mentor will appear here after review meetings." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 2fr' : '1fr', gap: 20 }}>
          {/* List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {feedbacks.map(fb => (
              <div key={fb._id} className="if-card"
                style={{ cursor: 'pointer', border: selected?._id === fb._id ? '1px solid var(--accent)' : undefined }}
                onClick={() => setSelected(selected?._id === fb._id ? null : fb)}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{fb.task?.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  👨‍💼 {fb.mentor?.name} · {fb.reviewStage} · {formatDate(fb.createdAt)}
                </div>
                {fb.overallRating && (
                  <div style={{ marginTop: 6, fontSize: 14 }}>{'⭐'.repeat(fb.overallRating)}</div>
                )}
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                  {fb.aiStructuredFeedback?.completedRequirements?.length || 0} completed ·{' '}
                  {fb.aiStructuredFeedback?.identifiedProblems?.length || 0} issues ·{' '}
                  {fb.aiStructuredFeedback?.tasksBeforeNextReview?.length || 0} action items
                </div>
              </div>
            ))}
          </div>

          {/* Detail panel */}
          {selected && (
            <div>
              <div className="if-card" style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 700 }}>{selected.task?.title}</h2>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                      Reviewed by {selected.mentor?.name} on {formatDate(selected.createdAt)}
                    </p>
                  </div>
                  {selected.overallRating && <span style={{ fontSize: 22 }}>{'⭐'.repeat(selected.overallRating)}</span>}
                </div>

                {selected.mentorNotes && (
                  <div style={{ background: 'var(--bg-dark-3)', padding: 14, borderRadius: 8, marginBottom: 16 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>MENTOR'S NOTES</div>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{selected.mentorNotes}</p>
                  </div>
                )}
              </div>

              {selected.aiStructuredFeedback && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {selected.aiStructuredFeedback.completedRequirements?.length > 0 && (
                    <div className="feedback-section green">
                      <h5>✅ What You Completed Well</h5>
                      {renderList(selected.aiStructuredFeedback.completedRequirements, '✅')}
                    </div>
                  )}
                  {selected.aiStructuredFeedback.identifiedProblems?.length > 0 && (
                    <div className="feedback-section red">
                      <h5>⚠️ Issues Found</h5>
                      {renderList(selected.aiStructuredFeedback.identifiedProblems, '❌')}
                    </div>
                  )}
                  {selected.aiStructuredFeedback.missingRequirements?.length > 0 && (
                    <div className="feedback-section orange">
                      <h5>📋 Missing Requirements</h5>
                      {renderList(selected.aiStructuredFeedback.missingRequirements, '🔴')}
                    </div>
                  )}
                  {selected.aiStructuredFeedback.recommendedCorrections?.length > 0 && (
                    <div className="feedback-section blue">
                      <h5>🔧 Recommended Corrections</h5>
                      {renderList(selected.aiStructuredFeedback.recommendedCorrections, '🔧')}
                    </div>
                  )}
                  {selected.aiStructuredFeedback.improvementInstructions?.length > 0 && (
                    <div className="if-card">
                      <h5 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--text-primary)' }}>📚 Step-by-Step Improvement</h5>
                      <ol style={{ paddingLeft: 20 }}>
                        {selected.aiStructuredFeedback.improvementInstructions.map((item, i) => (
                          <li key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6, lineHeight: 1.6 }}>{item}</li>
                        ))}
                      </ol>
                    </div>
                  )}
                  {selected.aiStructuredFeedback.learningResources?.length > 0 && (
                    <div className="if-card">
                      <h5 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--accent)' }}>📖 Learning Resources</h5>
                      {renderList(selected.aiStructuredFeedback.learningResources, '📌')}
                    </div>
                  )}
                  {selected.aiStructuredFeedback.tasksBeforeNextReview?.length > 0 && (
                    <div className="if-card" style={{ background: 'rgba(230,126,34,0.05)', border: '1px solid rgba(230,126,34,0.2)' }}>
                      <h5 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--warning)' }}>🎯 Complete Before Next Review</h5>
                      {renderList(selected.aiStructuredFeedback.tasksBeforeNextReview, '✏️')}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
