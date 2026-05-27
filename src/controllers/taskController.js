const Task = require('../models/Task');
const User = require('../models/User');
const sendResponse = require('../utils/sendResponse');

// === HR / ADMIN CONTROLLERS ===

// Assign task to employee
exports.createTask = async (req, res, next) => {
  try {
    const { title, description, assignedTo, dueDate } = req.body;

    if (!title || !assignedTo) {
      return sendResponse(res, 400, false, 'Title and assignedTo (employee ID) are required.');
    }

    // Verify employee exists and belongs to the same client company
    const employee = await User.findOne({ _id: assignedTo, clientId: req.clientId });
    if (!employee) {
      return sendResponse(res, 404, false, 'Employee not found or not in your client company.');
    }

    const task = await Task.create({
      title,
      description: description || '',
      assignedTo,
      assignedBy: req.user._id,
      clientId: req.clientId,
      status: 'pending',
      progress: 0,
      dueDate: dueDate ? new Date(dueDate) : null,
    });

    return sendResponse(res, 201, true, 'Task assigned successfully.', task);
  } catch (error) {
    next(error);
  }
};

// List all tasks for HR/Admin
exports.getAllTasks = async (req, res, next) => {
  try {
    const tasks = await Task.find({ clientId: req.clientId })
      .populate('assignedTo', 'name email designation employeeId')
      .populate('assignedBy', 'name email')
      .sort({ createdAt: -1 });

    return sendResponse(res, 200, true, 'All client tasks fetched.', tasks);
  } catch (error) {
    next(error);
  }
};

// Delete task
exports.deleteTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const task = await Task.findOneAndDelete({ _id: id, clientId: req.clientId });

    if (!task) {
      return sendResponse(res, 404, false, 'Task not found.');
    }

    return sendResponse(res, 200, true, 'Task deleted successfully.');
  } catch (error) {
    next(error);
  }
};

// === EMPLOYEE CONTROLLERS ===

// Fetch tasks assigned to the logged-in employee
exports.getMyTasks = async (req, res, next) => {
  try {
    const tasks = await Task.find({ assignedTo: req.user._id, clientId: req.clientId })
      .populate('assignedBy', 'name email')
      .sort({ createdAt: -1 });

    return sendResponse(res, 200, true, 'Your assigned tasks fetched.', tasks);
  } catch (error) {
    next(error);
  }
};

// Update status and progress of a task
exports.updateTaskStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, progress, autoPauseOthers } = req.body;

    const task = await Task.findOne({ _id: id, assignedTo: req.user._id, clientId: req.clientId });
    if (!task) {
      return sendResponse(res, 404, false, 'Task not found or unauthorized.');
    }

    if (status) {
      task.status = status;
      if (status === 'completed') {
        task.progress = 100;
        task.completedAt = new Date();
      } else if (status === 'pending' && task.progress === 100) {
        // Reset progress if completed goes back to pending
        task.progress = 90;
        task.completedAt = null;
      }
    }

    if (progress !== undefined && status !== 'completed') {
      task.progress = Math.min(100, Math.max(0, parseInt(progress, 10)));
      if (task.progress === 100) {
        task.status = 'completed';
        task.completedAt = new Date();
      } else if (task.status === 'completed') {
        task.status = 'in-progress';
        task.completedAt = null;
      }
    }

    // Logical Rule: Auto-pause other tasks if this task is set to in-progress
    if (status === 'in-progress' && autoPauseOthers) {
      await Task.updateMany(
        {
          _id: { $ne: task._id },
          assignedTo: req.user._id,
          clientId: req.clientId,
          status: 'in-progress',
        },
        {
          $set: { status: 'pending' },
        }
      );
    }

    await task.save();

    return sendResponse(res, 200, true, 'Task updated successfully.', task);
  } catch (error) {
    next(error);
  }
};
