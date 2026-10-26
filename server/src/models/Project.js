const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      maxlength: [200, 'Project name too long'],
    },
    description: {
      type: String,
      required: [true, 'Project description is required'],
      trim: true,
    },
    techStack: [{ type: String, trim: true }],
    status: {
      type: String,
      enum: ['active', 'completed', 'on-hold', 'archived'],
      default: 'active',
    },
    startDate: { type: Date },
    endDate: { type: Date },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

projectSchema.index({ status: 1 });
projectSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Project', projectSchema);
