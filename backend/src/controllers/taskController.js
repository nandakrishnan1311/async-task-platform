const Task = require("../models/Task");
const { pushToQueue } = require("../services/redis");

const QUEUE_NAME = "task_queue";

// POST /api/tasks
const createTask = async (req, res) => {
  try {
    const { title, inputText, operation } = req.body;

    if (!title || !inputText || !operation) {
      return res.status(400).json({ error: "title, inputText, and operation are required" });
    }

    const validOps = ["uppercase", "lowercase", "reverse", "word_count"];
    if (!validOps.includes(operation)) {
      return res.status(400).json({
        error: `Invalid operation. Must be one of: ${validOps.join(", ")}`,
      });
    }

    // Create task with pending status
    const task = await Task.create({
      userId: req.user._id,
      title,
      inputText,
      operation,
      status: "pending",
      logs: [`Task created at ${new Date().toISOString()}`],
    });

    // Push to Redis queue
    await pushToQueue(QUEUE_NAME, {
      taskId: task._id.toString(),
      operation,
      inputText,
    });

    task.logs.push("Pushed to processing queue");
    await task.save();

    res.status(201).json({
      message: "Task created and queued successfully",
      task,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/tasks
const getTasks = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const filter = { userId: req.user._id };
    if (status) filter.status = status;

    const tasks = await Task.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Task.countDocuments(filter);

    res.json({
      tasks,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/tasks/:id
const getTask = async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.json({ task });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/tasks/:id
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.json({ message: "Task deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { createTask, getTasks, getTask, deleteTask };
