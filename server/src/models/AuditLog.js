const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      enum: [
        'user.created', 'user.updated', 'user.deleted', 'user.login', 'user.logout',
        'task.created', 'task.updated', 'task.assigned', 'task.status-changed', 'task.deleted',
        'task.explanation-generated', 'task.explanation-approved',
        'submission.created',
        'meeting.scheduled', 'meeting.rescheduled', 'meeting.cancelled',
        'feedback.created', 'feedback.approved',
        'notification.sent', 'notification.failed',
        'project.created', 'project.updated',
        'module.created', 'module.updated',
      ],
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    targetUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    resourceType: {
      type: String,
      enum: ['User', 'Task', 'Project', 'Module', 'ReviewMeeting', 'Feedback', 'Notification', 'TaskSubmission'],
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    changes: { type: mongoose.Schema.Types.Mixed },
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true }
);

auditLogSchema.index({ performedBy: 1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
