const express = require("express");
const router = express.Router();
const { createTask, getTasks, getTask, deleteTask } = require("../controllers/taskController");
const authenticate = require("../middleware/auth");

// All task routes require authentication
router.use(authenticate);

router.post("/", createTask);
router.get("/", getTasks);
router.get("/:id", getTask);
router.delete("/:id", deleteTask);

module.exports = router;
