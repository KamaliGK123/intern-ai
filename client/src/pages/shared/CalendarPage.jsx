import { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import { meetingAPI } from '../../api';
import { PageHeader, LoadingSpinner, StatusBadge, formatDateTime } from '../../components/shared/UIComponents';
import toast from 'react-hot-toast';

const stageColors = {
  'initial-discussion': '#4a90d9',
  'first-review': '#52b788',
  'second-review': '#e67e22',
  'final-review': '#7c3aed',
};

export default function CalendarPage() {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeeting, setSelectedMeeting] = useState(null);

  useEffect(() => { fetchMeetings(); }, []);

  const fetchMeetings = async () => {
    try {
      const res = await meetingAPI.getAll({});
      setMeetings(res.data.meetings);
    } catch { toast.error('Failed to load meetings.'); }
    finally { setLoading(false); }
  };

  const events = meetings
    .filter(m => m.status !== 'cancelled')
    .map(m => ({
      id: m._id,
      title: `${m.reviewStage?.replace(/-/g, ' ')} — ${m.intern?.name || ''}`,
      start: m.scheduledAt,
      end: new Date(new Date(m.scheduledAt).getTime() + (m.duration || 60) * 60000).toISOString(),
      backgroundColor: stageColors[m.reviewStage] || '#4a90d9',
      borderColor: stageColors[m.reviewStage] || '#4a90d9',
      extendedProps: { meeting: m },
    }));

  if (loading) return <LoadingSpinner message="Loading calendar..." />;

  return (
    <div>
      <PageHeader
        title="Review Calendar"
        icon="📅"
        subtitle="All scheduled review meetings"
      />

      {/* Legend */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {Object.entries(stageColors).map(([stage, color]) => (
          <div key={stage} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: color }}></div>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
              {stage.replace(/-/g, ' ')}
            </span>
          </div>
        ))}
      </div>

      <div className="if-card">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
          }}
          events={events}
          eventClick={({ event }) => setSelectedMeeting(event.extendedProps.meeting)}
          height="auto"
          nowIndicator
          weekends
          eventTimeFormat={{ hour: '2-digit', minute: '2-digit', meridiem: 'short' }}
        />
      </div>

      {/* Meeting Detail Panel */}
      {selectedMeeting && (
        <div className="modal-overlay" onClick={() => setSelectedMeeting(null)}>
          <div className="modal-box" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">📅 Meeting Details</h3>
              <button className="modal-close" onClick={() => setSelectedMeeting(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <span className={`badge-status badge-${selectedMeeting.status}`}>{selectedMeeting.status}</span>
                <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, color: 'white', background: stageColors[selectedMeeting.reviewStage] || '#4a90d9' }}>
                  {selectedMeeting.reviewStage?.replace(/-/g, ' ')}
                </span>
              </div>

              {[
                { label: 'Task', value: selectedMeeting.task?.title },
                { label: 'Intern', value: selectedMeeting.intern?.name },
                { label: 'Mentor', value: selectedMeeting.mentor?.name },
                { label: 'Date & Time', value: formatDateTime(selectedMeeting.scheduledAt) },
                { label: 'Duration', value: `${selectedMeeting.duration} minutes` },
                { label: 'Timezone', value: selectedMeeting.timeZone },
              ].map(({ label, value }) => value && (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 13 }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{label}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{value}</span>
                </div>
              ))}

              {selectedMeeting.meetingLink && (
                <a href={selectedMeeting.meetingLink} target="_blank" rel="noreferrer"
                  className="btn-primary-custom" style={{ display: 'block', textAlign: 'center', marginTop: 16, textDecoration: 'none' }}>
                  🚀 Join Meeting
                </a>
              )}
              {selectedMeeting.notes && (
                <div style={{ marginTop: 16, padding: 12, background: 'var(--bg-dark-3)', borderRadius: 8 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Notes</div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{selectedMeeting.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upcoming meetings list */}
      <div className="if-card" style={{ marginTop: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)' }}>📋 All Meetings</h3>
        {meetings.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No meetings scheduled.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table-custom">
              <thead>
                <tr><th>Meeting</th><th>Intern</th><th>Mentor</th><th>Date</th><th>Status</th></tr>
              </thead>
              <tbody>
                {meetings.sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt)).map(m => (
                  <tr key={m._id} style={{ cursor: 'pointer' }} onClick={() => setSelectedMeeting(m)}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{m.reviewStage?.replace(/-/g, ' ')}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.task?.title}</div>
                    </td>
                    <td style={{ fontSize: 13 }}>{m.intern?.name}</td>
                    <td style={{ fontSize: 13 }}>{m.mentor?.name}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDateTime(m.scheduledAt)}</td>
                    <td><StatusBadge status={m.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
