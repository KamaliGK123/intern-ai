const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema(
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
    submissionLink: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Notes too long'],
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    version: {
      type: Number,
      default: 1,
    },
    status: {
      type: String,
      enum: ['pending-review', 'approved', 'changes-requested'],
      default: 'pending-review',
    },
  },
  { timestamps: true }
);

submissionSchema.index({ task: 1 });
submissionSchema.index({ intern: 1 });

module.exports = mongoose.model('TaskSubmission', submissionSchema);
