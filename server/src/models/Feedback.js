const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
  {
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
    meeting: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ReviewMeeting',
    },
    reviewStage: {
      type: String,
      enum: ['initial-discussion', 'first-review', 'second-review', 'final-review'],
    },
    // Raw mentor notes
    mentorNotes: {
      type: String,
      required: [true, 'Mentor notes are required'],
      trim: true,
    },
    // AI-generated structured feedback
    aiStructuredFeedback: {
      completedRequirements: [String],
      identifiedProblems: [String],
      missingRequirements: [String],
      recommendedCorrections: [String],
      improvementInstructions: [String],
      learningResources: [String],
      tasksBeforeNextReview: [String],
    },
    aiRawResponse: { type: String },
    // Approval workflow
    isApproved: { type: Boolean, default: false },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: { type: Date },
    // Notification
    feedbackEmailSent: { type: Boolean, default: false },
    feedbackEmailSentAt: { type: Date },
    // Overall rating
    overallRating: {
      type: Number,
      min: 1,
      max: 5,
    },
  },
  { timestamps: true }
);

feedbackSchema.index({ task: 1 });
feedbackSchema.index({ intern: 1 });
feedbackSchema.index({ mentor: 1 });
feedbackSchema.index({ isApproved: 1 });

module.exports = mongoose.model('Feedback', feedbackSchema);
