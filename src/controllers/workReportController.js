const WorkReport = require('../models/WorkReport');
const { getTodayString } = require('../utils/dateHelpers');
const sendResponse = require('../utils/sendResponse');

// Submit daily work report
exports.submitReport = async (req, res, next) => {
  try {
    const { title, details, tags = [], priority = 2, attachments = [] } = req.body;
    const todayStr = getTodayString();

    if (!title || !details) {
      return sendResponse(res, 400, false, 'Title and details are required.');
    }

    // Check if report already exists for today
    const existingReport = await WorkReport.findOne({ userId: req.user._id, clientId: req.clientId, date: todayStr });
    if (existingReport) {
      return res.status(409).json({
        success: false,
        message: 'Already submitted today. You can only submit one report per day.',
        error: 'CONFLICT'
      });
    }

    const report = await WorkReport.create({
      userId: req.user._id,
      clientId: req.clientId,
      date: todayStr,
      title,
      details,
      tags,
      priority,
      attachments
    });

    return sendResponse(res, 201, true, 'Work report submitted successfully', report);
  } catch (error) {
    next(error);
  }
};

// Get own past reports (paginated)
exports.getMyReports = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const total = await WorkReport.countDocuments({ userId: req.user._id, clientId: req.clientId });
    const reports = await WorkReport.find({ userId: req.user._id, clientId: req.clientId })
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);

    return sendResponse(res, 200, true, 'Work reports history fetched', {
      reports,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Check if today's report is submitted
exports.checkTodayReportStatus = async (req, res, next) => {
  try {
    const todayStr = getTodayString();
    const report = await WorkReport.findOne({ userId: req.user._id, clientId: req.clientId, date: todayStr });
    
    return sendResponse(res, 200, true, 'Today report status checked', {
      submitted: !!report,
      report: report || null
    });
  } catch (error) {
    next(error);
  }
};

// Get a single report details by ID
exports.getReportById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const report = await WorkReport.findOne({ _id: id, userId: req.user._id, clientId: req.clientId });
    if (!report) {
      return sendResponse(res, 404, false, 'Work report not found or unauthorized.');
    }
    return sendResponse(res, 200, true, 'Work report fetched successfully', report);
  } catch (error) {
    next(error);
  }
};

// Update a work report
exports.updateReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, details, tags = [], priority = 2, attachments = [] } = req.body;

    if (!title || !details) {
      return sendResponse(res, 400, false, 'Title and details are required.');
    }

    const report = await WorkReport.findOne({ _id: id, userId: req.user._id, clientId: req.clientId });
    if (!report) {
      return sendResponse(res, 404, false, 'Work report not found or unauthorized.');
    }

    report.title = title;
    report.details = details;
    report.tags = tags;
    report.priority = priority;
    report.attachments = attachments;

    await report.save();

    return sendResponse(res, 200, true, 'Work report updated successfully', report);
  } catch (error) {
    next(error);
  }
};
