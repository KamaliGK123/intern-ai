const mongoose = require('mongoose');

const moduleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Module name is required'],
      trim: true,
      maxlength: [200, 'Module name too long'],
    },
    description: {
      type: String,
      trim: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project reference is required'],
    },
    order: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['active', 'completed', 'archived'],
      default: 'active',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

moduleSchema.index({ project: 1 });
moduleSchema.index({ status: 1 });

module.exports = mongoose.model('Module', moduleSchema);
