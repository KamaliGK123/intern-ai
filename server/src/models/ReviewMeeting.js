const mongoose = require('mongoose');

const reviewMeetingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Meeting title is required'],
      trim: true,
    },
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: [true, 'Task reference is required'],
    },
    intern: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Intern reference is required'],
    },
    mentor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Mentor reference is required'],
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    module: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Module',
    },
    reviewStage: {
      type: String,
      enum: ['initial-discussion', 'first-review', 'second-review', 'final-review'],
      required: [true, 'Review stage is required'],
    },
    scheduledAt: {
      type: Date,
      required: [true, 'Meeting date/time is required'],
    },
    duration: {
      type: Number, // in minutes
      default: 60,
    },
    timeZone: {
      type: String,
      default: 'Asia/Kolkata',
    },
    meetingLink: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['scheduled', 'rescheduled', 'cancelled', 'completed'],
      default: 'scheduled',
    },
    notes: { type: String, trim: true },
    cancelReason: { type: String, trim: true },
    // Notification tracking
    createdNotificationSent: { type: Boolean, default: false },
    reminderSent24h: { type: Boolean, default: false },
    reminderSent1h: { type: Boolean, default: false },
    updateNotificationSent: { type: Boolean, default: false },
    rescheduledFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ReviewMeeting',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

reviewMeetingSchema.index({ intern: 1 });
reviewMeetingSchema.index({ mentor: 1 });
reviewMeetingSchema.index({ scheduledAt: 1 });
reviewMeetingSchema.index({ status: 1 });
reviewMeetingSchema.index({ task: 1 });

module.exports = mongoose.model('ReviewMeeting', reviewMeetingSchema);
