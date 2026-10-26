const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: [
        'task-assigned',
        'task-updated',
        'task-overdue',
        'deadline-reminder-48h',
        'deadline-reminder-24h',
        'submission-received',
        'feedback-ready',
        'meeting-scheduled',
        'meeting-reminder-24h',
        'meeting-reminder-1h',
        'meeting-rescheduled',
        'meeting-cancelled',
        'changes-requested',
        'task-approved',
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    // Reference to related entities
    relatedTask: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
    relatedMeeting: { type: mongoose.Schema.Types.ObjectId, ref: 'ReviewMeeting' },
    relatedFeedback: { type: mongoose.Schema.Types.ObjectId, ref: 'Feedback' },
    // Deduplication key (prevents duplicate notifications)
    deduplicationKey: {
      type: String,
      unique: true,
      sparse: true,
    },
    // Email delivery
    emailSent: { type: Boolean, default: false },
    emailSentAt: { type: Date },
    emailError: { type: String },
    emailAttempts: { type: Number, default: 0 },
    // In-app read status
    isRead: { type: Boolean, default: false },
    readAt: { type: Date },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, isRead: 1 });
// deduplicationKey index auto-created via unique:true,sparse:true in field definition
notificationSchema.index({ createdAt: -1 });


module.exports = mongoose.model('Notification', notificationSchema);
