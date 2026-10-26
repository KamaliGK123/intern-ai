import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { taskAPI, meetingAPI, feedbackAPI, userAPI, projectAPI } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import {
  StatusBadge, PriorityBadge, LoadingSpinner, formatDate, formatDateTime, EmptyState
} from '../../components/shared/UIComponents';
import { VoicePlayer } from '../../components/shared/VoiceComponents';
import toast from 'react-hot-toast';


export default function TaskDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [generating, setGenerating] = useState(false);
  const [approving, setApproving] = useState(false);
  const [editedExplanation, setEditedExplanation] = useState('');
  const [isEditingExplanation, setIsEditingExplanation] = useState(false);
  const [submitForm, setSubmitForm] = useState({ submissionLink: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [meetingForm, setMeetingForm] = useState({ title: '', reviewStage: 'first-review', scheduledAt: '', duration: 60, timeZone: 'Asia/Kolkata', meetingLink: '', notes: '' });
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({ mentorNotes: '', reviewStage: 'first-review', overallRating: 4 });
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [savingMeeting, setSavingMeeting] = useState(false);
  const [mentors, setMentors] = useState([]);
  const [projects, setProjects] = useState([]);
  const [rescheduleModal, setRescheduleModal] = useState(null);
  const [rescheduleForm, setRescheduleForm] = useState({ scheduledAt: '', meetingLink: '' });

  useEffect(() => {
    fetchAll();
  }, [id]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [tRes, sRes, fRes, mRes] = await Promise.all([
        taskAPI.getById(id),
        taskAPI.getSubmissions(id),
        feedbackAPI.getAll({ task: id }),
        meetingAPI.getAll({ }),
      ]);
      setTask(tRes.data.task);
      setEditedExplanation(tRes.data.task.aiExplanation || '');
      setSubmissions(sRes.data.submissions);
      setFeedbacks(fRes.data.feedbacks);
      const taskMeetings = mRes.data.meetings?.filter(m => m.task?._id === id || m.task === id) || [];
      setMeetings(taskMeetings);
    } catch (err) {
      toast.error('Failed to load task.');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateExplanation = async () => {
    setGenerating(true);
    try {
      const res = await taskAPI.generateExplanation(id);
      setEditedExplanation(res.data.aiExplanation);
      setTask(t => ({ ...t, aiExplanation: res.data.aiExplanation, aiExplanationApproved: false }));
      toast.success('AI explanation generated! Please review before approving.');
      setActiveTab('explanation');
    } catch (err) {
      toast.error(err.response?.data?.message || 'AI generation failed.');
    } finally {
      setGenerating(false);
    }
  };

  const handleApproveExplanation = async () => {
    setApproving(true);
    try {
      await taskAPI.approveExplanation(id, { aiExplanation: editedExplanation });
      setTask(t => ({ ...t, aiExplanationApproved: true, assignmentEmailSent: true }));
      toast.success('✅ Explanation approved! Assignment email sent to intern.');
      setIsEditingExplanation(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Approval failed.');
    } finally {
      setApproving(false);
    }
  };

  const handleSubmitTask = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await taskAPI.submit(id, submitForm);
      toast.success('Task submitted successfully!');
      setSubmitForm({ submissionLink: '', notes: '' });
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (status) => {
    try {
      await taskAPI.updateStatus(id, status);
      setTask(t => ({ ...t, status }));
      toast.success(`Status updated to "${status}".`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Status change failed.');
    }
  };

  const handleScheduleMeeting = async (e) => {
    e.preventDefault();
    setSavingMeeting(true);
    try {
      await meetingAPI.create({
        ...meetingForm,
        task: id,
        intern: task.intern._id,
        mentor: task.mentor._id,
        project: task.project._id,
        module: task.module?._id,
        title: meetingForm.title || `${meetingForm.reviewStage} — ${task.title}`,
      });
      toast.success('Meeting scheduled! Notifications sent to intern and mentor.');
      setShowMeetingModal(false);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to schedule meeting.');
    } finally {
      setSavingMeeting(false);
    }
  };

  const handleCreateFeedback = async (e) => {
    e.preventDefault();
    setSavingFeedback(true);
    try {
      const res = await feedbackAPI.create({ ...feedbackForm, task: id, intern: task.intern._id });
      toast.success('Feedback created with AI suggestions. Please review and approve.');
      setShowFeedbackModal(false);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create feedback.');
    } finally {
      setSavingFeedback(false);
    }
  };

  const handleApproveFeedback = async (feedbackId) => {
    try {
      await feedbackAPI.approve(feedbackId);
      toast.success('Feedback approved and emailed to intern!');
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve feedback.');
    }
  };

  const handleRescheduleMeeting = async (e) => {
    e.preventDefault();
    try {
      await meetingAPI.reschedule(rescheduleModal._id, rescheduleForm);
      toast.success('Meeting rescheduled. Notifications sent.');
      setRescheduleModal(null);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reschedule.');
    }
  };

  const handleCancelMeeting = async (meetingId) => {
    try {
      await meetingAPI.cancel(meetingId, { cancelReason: 'Cancelled by mentor/admin.' });
      toast.success('Meeting cancelled. Participants notified.');
      fetchAll();
    } catch (err) {
      toast.error('Failed to cancel meeting.');
    }
  };

  if (loading) return <LoadingSpinner message="Loading task details..." />;
  if (!task) return null;

  const canManage = user.role === 'admin' || user.role === 'mentor';
  const isIntern = user.role === 'intern';

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <button className="btn-ghost" style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => navigate(-1)}>
          ← Back
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>{task.title}</h1>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>🗂️ {task.project?.name}</span>
            {task.module && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>📦 {task.module?.name}</span>}
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>📅 Due: {formatDate(task.deadline)}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {canManage && !task.aiExplanation && (
            <button className="btn-primary-custom" onClick={handleGenerateExplanation} disabled={generating}>
              {generating ? <><div className="spinner-ring" style={{ width: 14, height: 14, borderWidth: 2 }}></div> Generating...</> : '🤖 Generate AI Explanation'}
            </button>
          )}
          {canManage && task.aiExplanation && !task.aiExplanationApproved && (
            <button className="btn-success-custom" onClick={handleApproveExplanation} disabled={approving}>
              {approving ? '⏳...' : '✅ Approve & Send'}
            </button>
          )}
          {canManage && (
            <button className="btn-primary-custom" onClick={() => setShowMeetingModal(true)}>
              📅 Schedule Meeting
            </button>
          )}
          {canManage && task.status === 'submitted' && (
            <button className="btn-primary-custom" onClick={() => setShowFeedbackModal(true)}>
              💬 Add Feedback
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-nav">
        {[
          { key: 'overview', label: '📋 Overview' },
          { key: 'explanation', label: `🤖 AI Explanation${task.aiExplanationApproved ? ' ✅' : task.aiExplanation ? ' ⏳' : ''}` },
          { key: 'submissions', label: `📤 Submissions (${submissions.length})` },
          { key: 'feedback', label: `💬 Feedback (${feedbacks.length})` },
          { key: 'meetings', label: `📅 Meetings (${meetings.length})` },
        ].map(tab => (
          <button key={tab.key} className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}>{tab.label}</button>
        ))}
      </div>

      {/* OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="two-col-grid">
          <div className="if-card">
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)' }}>📋 Task Details</h3>
            <InfoRow label="Intern" value={`${task.intern?.name} (${task.intern?.email})`} />
            <InfoRow label="Mentor" value={`${task.mentor?.name} (${task.mentor?.email})`} />
            <InfoRow label="Project" value={task.project?.name} />
            <InfoRow label="Module" value={task.module?.name || 'N/A'} />
            <InfoRow label="Deadline" value={formatDateTime(task.deadline)} />
            <InfoRow label="Created" value={formatDate(task.createdAt)} />
            <InfoRow label="Email Sent" value={task.assignmentEmailSent ? '✅ Yes' : '❌ Not yet'} />
            {task.technologies?.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>TECHNOLOGIES</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {task.technologies.map(t => (
                    <span key={t} style={{ background: 'rgba(74,144,217,0.1)', color: 'var(--accent)', fontSize: 11, padding: '2px 8px', borderRadius: 12 }}>{t}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="if-card">
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>📝 Description</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{task.description}</p>
            </div>
            {task.expectedDeliverables && (
              <div className="if-card">
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>📦 Expected Deliverables</h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{task.expectedDeliverables}</p>
              </div>
            )}
            {task.acceptanceCriteria && (
              <div className="if-card">
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>✅ Acceptance Criteria</h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{task.acceptanceCriteria}</p>
              </div>
            )}
            {/* Status change for intern */}
            {isIntern && task.status === 'assigned' && (
              <div className="if-card">
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>🚀 Start Working</h3>
                <button className="btn-primary-custom" onClick={() => handleStatusChange('in-progress')}>
                  ▶️ Mark as In Progress
                </button>
              </div>
            )}
            {/* Submit form for intern */}
            {isIntern && ['assigned', 'in-progress', 'changes-requested'].includes(task.status) && (
              <div className="if-card">
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>📤 Submit Task</h3>
                <form onSubmit={handleSubmitTask}>
                  <div style={{ marginBottom: 10 }}>
                    <label className="form-label-custom">Submission Link (GitHub/Drive/etc.)</label>
                    <input className="form-control-custom" placeholder="https://github.com/..." value={submitForm.submissionLink}
                      onChange={e => setSubmitForm({ ...submitForm, submissionLink: e.target.value })} />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label className="form-label-custom">Notes</label>
                    <textarea className="form-control-custom" rows={3} placeholder="What did you implement? Any issues?" value={submitForm.notes}
                      onChange={e => setSubmitForm({ ...submitForm, notes: e.target.value })} />
                  </div>
                  <button type="submit" className="btn-success-custom" disabled={submitting}>
                    {submitting ? '⏳ Submitting...' : '📤 Submit Task'}
                  </button>
                </form>
              </div>
            )}
            {/* Mentor review actions */}
            {canManage && task.status === 'submitted' && (
              <div className="if-card">
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>🔍 Review Submission</h3>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn-success-custom" onClick={() => handleStatusChange('approved')}>✅ Approve Task</button>
                  <button className="btn-danger-custom" onClick={() => handleStatusChange('changes-requested')}>🔁 Request Changes</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI EXPLANATION */}
      {activeTab === 'explanation' && (
        <div className="if-card">
          {!task.aiExplanation ? (
            <EmptyState icon="🤖" title="No AI Explanation Yet"
              message="Generate an AI-powered task explanation using the button above."
              action={canManage && (
                <button className="btn-primary-custom" onClick={handleGenerateExplanation} disabled={generating}>
                  {generating ? '🤖 Generating...' : '🤖 Generate Explanation'}
                </button>
              )}
            />
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>🤖 AI-Generated Task Explanation</h3>
                  {task.aiExplanationApproved && (
                    <span style={{ fontSize: 12, color: 'var(--success-light)' }}>✅ Approved & Sent to Intern</span>
                  )}
                </div>
                {canManage && !task.aiExplanationApproved && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-ghost" style={{ fontSize: 12 }} onClick={() => setIsEditingExplanation(!isEditingExplanation)}>
                      {isEditingExplanation ? '👁️ Preview' : '✏️ Edit'}
                    </button>
                    <button className="btn-primary-custom" onClick={handleGenerateExplanation} disabled={generating} style={{ fontSize: 12 }}>
                      🔄 Regenerate
                    </button>
                    <button className="btn-success-custom" onClick={handleApproveExplanation} disabled={approving} style={{ fontSize: 12 }}>
                      {approving ? '⏳...' : '✅ Approve & Send Email'}
                    </button>
                  </div>
                )}
              </div>

              {canManage && !task.aiExplanationApproved && isEditingExplanation ? (
                <textarea
                  className="form-control-custom ai-explanation"
                  rows={25}
                  value={editedExplanation}
                  onChange={e => setEditedExplanation(e.target.value)}
                  style={{ fontFamily: 'inherit', resize: 'vertical' }}
                />
              ) : (
                <>
                  {/* Voice Player — read explanation aloud */}
                  <VoicePlayer
                    text={editedExplanation}
                    label="🔊 Listen to Explanation"
                  />
                  <div className="ai-explanation">{editedExplanation}</div>
                </>
              )}


              {!task.aiExplanationApproved && canManage && (
                <div className="alert-custom alert-warning" style={{ marginTop: 16 }}>
                  ⚠️ This explanation has not been approved yet. Review and click "Approve & Send Email" to send it to the intern.
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* SUBMISSIONS */}
      {activeTab === 'submissions' && (
        <div>
          {submissions.length === 0 ? (
            <EmptyState icon="📤" title="No submissions yet" message={isIntern ? "Submit your work from the Overview tab." : "Waiting for intern submission."} />
          ) : submissions.map(sub => (
            <div key={sub._id} className="if-card" style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>Submission v{sub.version}</span>
                  <span className={`badge-status badge-${sub.status}`} style={{ marginLeft: 10 }}>{sub.status}</span>
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDateTime(sub.submittedAt)}</span>
              </div>
              {sub.submissionLink && (
                <div style={{ marginBottom: 8 }}>
                  <a href={sub.submissionLink} target="_blank" rel="noreferrer"
                    style={{ color: 'var(--accent)', fontSize: 13 }}>🔗 {sub.submissionLink}</a>
                </div>
              )}
              {sub.notes && <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{sub.notes}</p>}
            </div>
          ))}
        </div>
      )}

      {/* FEEDBACK */}
      {activeTab === 'feedback' && (
        <div>
          {canManage && (
            <div style={{ marginBottom: 16 }}>
              <button className="btn-primary-custom" onClick={() => setShowFeedbackModal(true)}>
                💬 Add Feedback
              </button>
            </div>
          )}
          {feedbacks.length === 0 ? (
            <EmptyState icon="💬" title="No feedback yet" message="Feedback will appear here after the mentor reviews the submission." />
          ) : feedbacks.map(fb => (
            <div key={fb._id} className="if-card" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>Feedback by {fb.mentor?.name}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 12 }}>{formatDate(fb.createdAt)}</span>
                  {fb.reviewStage && <span className="badge-status badge-assigned" style={{ marginLeft: 10, fontSize: 10 }}>{fb.reviewStage}</span>}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {fb.overallRating && <span style={{ fontSize: 14 }}>{'⭐'.repeat(fb.overallRating)}</span>}
                  {!fb.isApproved && canManage && (
                    <button className="btn-success-custom" style={{ fontSize: 12, padding: '5px 12px' }}
                      onClick={() => handleApproveFeedback(fb._id)}>
                      ✅ Approve & Email Intern
                    </button>
                  )}
                  {fb.isApproved && <span style={{ fontSize: 12, color: 'var(--success-light)' }}>✅ Approved & Sent</span>}
                </div>
              </div>

              {fb.mentorNotes && (
                <div className="feedback-section blue" style={{ marginBottom: 12 }}>
                  <h5>📝 Mentor Notes</h5>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{fb.mentorNotes}</p>
                </div>
              )}

              {fb.aiStructuredFeedback && (
                <>
                  {fb.aiStructuredFeedback.completedRequirements?.length > 0 && (
                    <div className="feedback-section green">
                      <h5>✅ Completed</h5>
                      <ul>{fb.aiStructuredFeedback.completedRequirements.map((item, i) => <li key={i}><span>✅</span>{item}</li>)}</ul>
                    </div>
                  )}
                  {fb.aiStructuredFeedback.identifiedProblems?.length > 0 && (
                    <div className="feedback-section red">
                      <h5>⚠️ Issues Found</h5>
                      <ul>{fb.aiStructuredFeedback.identifiedProblems.map((item, i) => <li key={i}><span>❌</span>{item}</li>)}</ul>
                    </div>
                  )}
                  {fb.aiStructuredFeedback.recommendedCorrections?.length > 0 && (
                    <div className="feedback-section orange">
                      <h5>🔧 Recommended Corrections</h5>
                      <ul>{fb.aiStructuredFeedback.recommendedCorrections.map((item, i) => <li key={i}><span>→</span>{item}</li>)}</ul>
                    </div>
                  )}
                  {fb.aiStructuredFeedback.improvementInstructions?.length > 0 && (
                    <div className="feedback-section blue">
                      <h5>📚 Improvement Steps</h5>
                      <ul>{fb.aiStructuredFeedback.improvementInstructions.map((item, i) => <li key={i}><span>{i + 1}.</span>{item}</li>)}</ul>
                    </div>
                  )}
                  {fb.aiStructuredFeedback.tasksBeforeNextReview?.length > 0 && (
                    <div className="if-card" style={{ background: 'rgba(230,126,34,0.05)', border: '1px solid rgba(230,126,34,0.2)' }}>
                      <h5 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--warning)' }}>🎯 Before Next Review</h5>
                      <ul style={{ listStyle: 'none', padding: 0 }}>
                        {fb.aiStructuredFeedback.tasksBeforeNextReview.map((item, i) => (
                          <li key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', padding: '3px 0' }}>✏️ {item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* MEETINGS */}
      {activeTab === 'meetings' && (
        <div>
          {canManage && (
            <div style={{ marginBottom: 16 }}>
              <button className="btn-primary-custom" onClick={() => setShowMeetingModal(true)}>📅 Schedule Meeting</button>
            </div>
          )}
          {meetings.length === 0 ? (
            <EmptyState icon="📅" title="No meetings scheduled" message="Schedule a review meeting from the button above." />
          ) : meetings.map(m => (
            <div key={m._id} className="if-card" style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{m.title || m.reviewStage}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    📅 {formatDateTime(m.scheduledAt)} · ⏱️ {m.duration} min · 🕐 {m.timeZone}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    👤 {m.intern?.name} × 👨‍💼 {m.mentor?.name}
                  </div>
                  {m.meetingLink && (
                    <a href={m.meetingLink} target="_blank" rel="noreferrer"
                      style={{ fontSize: 13, color: 'var(--accent)', display: 'block', marginTop: 6 }}>
                      🔗 Join Meeting
                    </a>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, flexDirection: 'column', alignItems: 'flex-end' }}>
                  <span className={`badge-status badge-${m.status}`}>{m.status}</span>
                  {canManage && m.status !== 'cancelled' && m.status !== 'completed' && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn-ghost" style={{ fontSize: 11, padding: '4px 10px' }}
                        onClick={() => { setRescheduleModal(m); setRescheduleForm({ scheduledAt: '', meetingLink: m.meetingLink || '' }); }}>
                        🔄 Reschedule
                      </button>
                      <button className="btn-danger-custom" style={{ fontSize: 11, padding: '4px 10px' }}
                        onClick={() => handleCancelMeeting(m._id)}>
                        ❌ Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Schedule Meeting Modal */}
      {showMeetingModal && (
        <div className="modal-overlay" onClick={() => setShowMeetingModal(false)}>
          <div className="modal-box" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">📅 Schedule Review Meeting</h3>
              <button className="modal-close" onClick={() => setShowMeetingModal(false)}>✕</button>
            </div>
            <form onSubmit={handleScheduleMeeting}>
              <div className="modal-body">
                <div className="two-col-grid" style={{ marginBottom: 14 }}>
                  <div>
                    <label className="form-label-custom">Review Stage *</label>
                    <select className="form-control-custom" value={meetingForm.reviewStage}
                      onChange={e => setMeetingForm({ ...meetingForm, reviewStage: e.target.value })}>
                      <option value="initial-discussion">Initial Discussion</option>
                      <option value="first-review">First Review</option>
                      <option value="second-review">Second Review</option>
                      <option value="final-review">Final Review</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label-custom">Date & Time *</label>
                    <input type="datetime-local" className="form-control-custom" value={meetingForm.scheduledAt}
                      onChange={e => setMeetingForm({ ...meetingForm, scheduledAt: e.target.value })} required />
                  </div>
                </div>
                <div className="two-col-grid" style={{ marginBottom: 14 }}>
                  <div>
                    <label className="form-label-custom">Duration (minutes)</label>
                    <input type="number" min="15" max="180" className="form-control-custom" value={meetingForm.duration}
                      onChange={e => setMeetingForm({ ...meetingForm, duration: e.target.value })} />
                  </div>
                  <div>
                    <label className="form-label-custom">Timezone</label>
                    <select className="form-control-custom" value={meetingForm.timeZone}
                      onChange={e => setMeetingForm({ ...meetingForm, timeZone: e.target.value })}>
                      <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">America/New_York (EST)</option>
                      <option value="Europe/London">Europe/London (GMT)</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label className="form-label-custom">Meeting Link (Google Meet / Zoom)</label>
                  <input className="form-control-custom" placeholder="https://meet.google.com/..." value={meetingForm.meetingLink}
                    onChange={e => setMeetingForm({ ...meetingForm, meetingLink: e.target.value })} />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label className="form-label-custom">Notes</label>
                  <textarea className="form-control-custom" rows={2} value={meetingForm.notes}
                    onChange={e => setMeetingForm({ ...meetingForm, notes: e.target.value })} />
                </div>
                <div className="alert-custom alert-info">
                  ℹ️ Both the intern and mentor will receive email notifications about this meeting.
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-ghost" onClick={() => setShowMeetingModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary-custom" disabled={savingMeeting}>
                  {savingMeeting ? '⏳ Scheduling...' : '📅 Schedule Meeting'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="modal-overlay" onClick={() => setShowFeedbackModal(false)}>
          <div className="modal-box" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">💬 Add Feedback</h3>
              <button className="modal-close" onClick={() => setShowFeedbackModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateFeedback}>
              <div className="modal-body">
                <div className="two-col-grid" style={{ marginBottom: 14 }}>
                  <div>
                    <label className="form-label-custom">Review Stage</label>
                    <select className="form-control-custom" value={feedbackForm.reviewStage}
                      onChange={e => setFeedbackForm({ ...feedbackForm, reviewStage: e.target.value })}>
                      <option value="initial-discussion">Initial Discussion</option>
                      <option value="first-review">First Review</option>
                      <option value="second-review">Second Review</option>
                      <option value="final-review">Final Review</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label-custom">Overall Rating</label>
                    <select className="form-control-custom" value={feedbackForm.overallRating}
                      onChange={e => setFeedbackForm({ ...feedbackForm, overallRating: Number(e.target.value) })}>
                      {[1, 2, 3, 4, 5].map(r => <option key={r} value={r}>{r} Star{r > 1 ? 's' : ''}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label className="form-label-custom">Mentor Notes * (AI will structure this into detailed feedback)</label>
                  <textarea className="form-control-custom" rows={5} required value={feedbackForm.mentorNotes}
                    onChange={e => setFeedbackForm({ ...feedbackForm, mentorNotes: e.target.value })}
                    placeholder="e.g., The React form works but email validation is missing and the layout is not responsive..." />
                </div>
                <div className="alert-custom alert-info">
                  🤖 AI will automatically generate structured improvement instructions from your notes.
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-ghost" onClick={() => setShowFeedbackModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary-custom" disabled={savingFeedback}>
                  {savingFeedback ? '🤖 Generating AI feedback...' : '💬 Create Feedback'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleModal && (
        <div className="modal-overlay" onClick={() => setRescheduleModal(null)}>
          <div className="modal-box" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">🔄 Reschedule Meeting</h3>
              <button className="modal-close" onClick={() => setRescheduleModal(null)}>✕</button>
            </div>
            <form onSubmit={handleRescheduleMeeting}>
              <div className="modal-body">
                <div style={{ marginBottom: 14 }}>
                  <label className="form-label-custom">New Date & Time *</label>
                  <input type="datetime-local" className="form-control-custom" value={rescheduleForm.scheduledAt}
                    onChange={e => setRescheduleForm({ ...rescheduleForm, scheduledAt: e.target.value })} required />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label className="form-label-custom">Meeting Link</label>
                  <input className="form-control-custom" value={rescheduleForm.meetingLink}
                    onChange={e => setRescheduleForm({ ...rescheduleForm, meetingLink: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-ghost" onClick={() => setRescheduleModal(null)}>Cancel</button>
                <button type="submit" className="btn-primary-custom">🔄 Reschedule</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper component
const InfoRow = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 13 }}>
    <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{label}</span>
    <span style={{ color: 'var(--text-secondary)', textAlign: 'right', maxWidth: '60%' }}>{value}</span>
  </div>
);
