const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      maxlength: [300, 'Task title too long'],
    },
    description: {
      type: String,
      required: [true, 'Task description is required'],
      trim: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project reference is required'],
    },
    module: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Module',
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
    technologies: [{ type: String, trim: true }],
    deadline: {
      type: Date,
      required: [true, 'Deadline is required'],
    },
    expectedDeliverables: { type: String, trim: true },
    acceptanceCriteria: { type: String, trim: true },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['assigned', 'in-progress', 'submitted', 'changes-requested', 'approved', 'overdue'],
      default: 'assigned',
    },
    // AI-generated content
    aiExplanation: { type: String },
    aiExplanationApproved: { type: Boolean, default: false },
    aiExplanationApprovedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    aiExplanationApprovedAt: { type: Date },
    // Notification tracking
    assignmentEmailSent: { type: Boolean, default: false },
    assignmentEmailSentAt: { type: Date },
    overdueNotificationSent: { type: Boolean, default: false },
    // Deadline reminders
    reminderSent24h: { type: Boolean, default: false },
    reminderSent48h: { type: Boolean, default: false },
    // Soft delete
    isDeleted: { type: Boolean, default: false },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

// Compound indexes for performance
taskSchema.index({ intern: 1, status: 1 });
taskSchema.index({ mentor: 1, status: 1 });
taskSchema.index({ project: 1 });
taskSchema.index({ deadline: 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ isDeleted: 1 });

module.exports = mongoose.model('Task', taskSchema);
