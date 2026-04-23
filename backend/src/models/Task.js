const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    inputText: {
      type: String,
      required: [true, "Input text is required"],
    },
    operation: {
      type: String,
      enum: ["uppercase", "lowercase", "reverse", "word_count"],
      required: [true, "Operation is required"],
    },
    status: {
      type: String,
      enum: ["pending", "running", "success", "failed"],
      default: "pending",
      index: true,
    },
    result: {
      type: String,
      default: null,
    },
    logs: {
      type: [String],
      default: [],
    },
    errorMessage: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// Compound index for faster queries
taskSchema.index({ userId: 1, status: 1 });
taskSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Task", taskSchema);
