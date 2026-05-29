const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const WFHRequest = require('../models/WFHRequest');
const CorrectionRequest = require('../models/CorrectionRequest');
const Feedback = require('../models/Feedback');
const WorkReport = require('../models/WorkReport');
const Policy = require('../models/Policy');
const { getTodayString } = require('../utils/dateHelpers');
const sendResponse = require('../utils/sendResponse');
const bcrypt = require('bcryptjs');

// === EMPLOYEE MANAGEMENT ===

exports.getEmployees = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    const { search, department } = req.query;

    // Always filter by clientId for data isolation
    const query = { clientId: req.clientId };
    if (department) {
      query.department = department;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await User.countDocuments(query);
    const employees = await User.find(query)
      .sort({ employeeId: 1 })
      .skip(skip)
      .limit(limit);

    return sendResponse(res, 200, true, 'Employees fetched successfully', {
      employees,
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

exports.getEmployeeById = async (req, res, next) => {
  try {
    const employee = await User.findOne({ _id: req.params.id, clientId: req.clientId });
    if (!employee) {
      return sendResponse(res, 404, false, 'Employee not found');
    }
    return sendResponse(res, 200, true, 'Employee details fetched', employee);
  } catch (error) {
    next(error);
  }
};

exports.updateEmployee = async (req, res, next) => {
  try {
    const {
      name, role, department, designation, phone, joiningDate, isActive,
      aadhaar, pan, temporaryAddress, permanentAddress, localGuardianPhone,
      reportingManagerName, reportingManagerEmail, reportingManagerPhone,
      password, workMode, weekends
    } = req.body;
    
    const employee = await User.findOne({ _id: req.params.id, clientId: req.clientId });
    if (!employee) {
      return sendResponse(res, 404, false, 'Employee not found');
    }

    // Role Hierarchy Validation: HR cannot update an Admin's or another HR's details
    if (req.user.role === 'hr' && (employee.role === 'admin' || employee.role === 'hr') && req.user._id.toString() !== employee._id.toString()) {
      return sendResponse(res, 403, false, 'Access denied. HR cannot update Admin or other HR details.');
    }

    // Role Hierarchy Validation: HR cannot promote users to Admin
    if (role === 'admin' && req.user.role === 'hr') {
      return sendResponse(res, 403, false, 'Access denied. HR cannot promote users to Admin.');
    }

    if (name !== undefined) employee.name = name;
    if (role !== undefined) employee.role = role;
    if (department !== undefined) employee.department = department;
    if (designation !== undefined) employee.designation = designation;
    if (phone !== undefined) employee.phone = phone;
    if (joiningDate !== undefined) employee.joiningDate = new Date(joiningDate);
    if (isActive !== undefined) employee.isActive = isActive;

    if (aadhaar !== undefined) employee.aadhaar = aadhaar;
    if (pan !== undefined) employee.pan = pan;
    if (temporaryAddress !== undefined) employee.temporaryAddress = temporaryAddress;
    if (permanentAddress !== undefined) employee.permanentAddress = permanentAddress;
    if (localGuardianPhone !== undefined) employee.localGuardianPhone = localGuardianPhone;
    if (reportingManagerName !== undefined) employee.reportingManagerName = reportingManagerName;
    if (reportingManagerEmail !== undefined) employee.reportingManagerEmail = reportingManagerEmail;
    if (reportingManagerPhone !== undefined) employee.reportingManagerPhone = reportingManagerPhone;
    if (workMode !== undefined) employee.workMode = workMode;
    if (weekends !== undefined) employee.weekends = weekends;

    if (password !== undefined && password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      employee.password = await bcrypt.hash(password, salt);
    }

    await employee.save();
    return sendResponse(res, 200, true, 'Employee updated successfully', employee);
  } catch (error) {
    next(error);
  }
};

exports.deactivateEmployee = async (req, res, next) => {
  try {
    const employee = await User.findOne({ _id: req.params.id, clientId: req.clientId });
    if (!employee) {
      return sendResponse(res, 404, false, 'Employee not found');
    }

    // Role Hierarchy Validation: HR cannot deactivate an Admin or HR
    if (req.user.role === 'hr' && (employee.role === 'admin' || employee.role === 'hr')) {
      return sendResponse(res, 403, false, 'Access denied. HR cannot deactivate an Admin or HR.');
    }

    employee.isActive = false;
    await employee.save();
    
    return sendResponse(res, 200, true, 'Employee deactivated successfully', employee);
  } catch (error) {
    next(error);
  }
};

exports.onboardEmployee = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      role = 'employee',
      phone = '',
      department = '',
      designation = '',
      joiningDate = new Date(),
      aadhaar = '',
      pan = '',
      temporaryAddress = '',
      permanentAddress = '',
      localGuardianPhone = '',
      reportingManagerName = '',
      reportingManagerEmail = '',
      reportingManagerPhone = '',
      workMode = 'office',
      weekends = [0]
    } = req.body;

    if (!name || !email || !password) {
      return sendResponse(res, 400, false, 'Name, email and password are required.');
    }

    // Role Hierarchy Validation: HR cannot onboard an Admin user
    if (role === 'admin' && req.user.role === 'hr') {
      return sendResponse(res, 403, false, 'Access denied. HR cannot onboard an Admin user.');
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail, clientId: req.clientId });
    if (existingUser) {
      return sendResponse(res, 409, false, 'Email is already registered for this company.');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const employee = await User.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role,
      phone,
      department,
      designation,
      joiningDate: new Date(joiningDate),
      clientId: req.clientId,
      approvalStatus: 'approved',
      isActive: true,
      aadhaar,
      pan,
      temporaryAddress,
      permanentAddress,
      localGuardianPhone,
      reportingManagerName,
      reportingManagerEmail,
      reportingManagerPhone,
      workMode,
      weekends
    });

    return sendResponse(res, 201, true, 'Employee onboarded successfully.', {
      id: employee._id,
      name: employee.name,
      email: employee.email,
      employeeId: employee.employeeId,
      role: employee.role,
      department: employee.department,
      designation: employee.designation,
      workMode: employee.workMode,
      weekends: employee.weekends
    });
  } catch (error) {
    next(error);
  }
};

// === ATTENDANCE MANAGEMENT ===

exports.getAllAttendance = async (req, res, next) => {
  try {
    const { date, userId, status } = req.query;
    // Always scope to current client
    const filter = { clientId: req.clientId };

    if (date) filter.date = date;
    if (userId) filter.userId = userId;
    if (status) filter.status = status;

    const records = await Attendance.find(filter)
      .populate('userId', 'name email employeeId department')
      .sort({ date: -1 });

    return sendResponse(res, 200, true, 'Attendance records fetched', records);
  } catch (error) {
    next(error);
  }
};

exports.getAttendanceReport = async (req, res, next) => {
  try {
    const { month, year, format = 'csv' } = req.query;
    if (!month || !year) {
      return sendResponse(res, 400, false, 'Month and year parameters are required.');
    }

    const prefix = `${year}-${String(month).padStart(2, '0')}-`;
    const records = await Attendance.find({
      clientId: req.clientId,
      date: { $regex: new RegExp(`^${prefix}`) }
    }).populate('userId', 'name email employeeId department designation');

    if (format === 'json') {
      return sendResponse(res, 200, true, 'Monthly attendance report fetched', records);
    }

    // Default to CSV
    let csv = 'Employee Name,Employee ID,Email,Department,Designation,Date,Check-In,Check-Out,Total Hours,Status,Type\n';
    records.forEach(r => {
      const name = r.userId ? r.userId.name : 'Unknown';
      const empId = r.userId ? r.userId.employeeId : '';
      const email = r.userId ? r.userId.email : '';
      const dept = r.userId ? r.userId.department : '';
      const des = r.userId ? r.userId.designation : '';
      const checkIn = r.checkInTime ? r.checkInTime.toISOString() : '';
      const checkOut = r.checkOutTime ? r.checkOutTime.toISOString() : '';
      csv += `"${name}","${empId}","${email}","${dept}","${des}","${r.date}","${checkIn}","${checkOut}",${r.totalHours},"${r.status}","${r.type}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=attendance_report_${year}_${month}.csv`);
    return res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};

exports.correctAttendance = async (req, res, next) => {
  try {
    const { checkInTime, checkOutTime, status, type } = req.body;
    const attendance = await Attendance.findOne({ _id: req.params.id, clientId: req.clientId });

    if (!attendance) {
      return sendResponse(res, 404, false, 'Attendance record not found');
    }

    if (checkInTime) attendance.checkInTime = new Date(checkInTime);
    if (checkOutTime) attendance.checkOutTime = new Date(checkOutTime);
    if (status) attendance.status = status;
    if (type) attendance.type = type;

    if (attendance.checkInTime && attendance.checkOutTime) {
      const hours = (attendance.checkOutTime - attendance.checkInTime) / (1000 * 60 * 60);
      attendance.totalHours = parseFloat(hours.toFixed(2));
    }
    attendance.isMarked = true;

    await attendance.save();
    return sendResponse(res, 200, true, 'Attendance record corrected successfully', attendance);
  } catch (error) {
    next(error);
  }
};

exports.getEmployeeAttendanceSummary = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { month, year } = req.query;

    if (!month || !year) {
      return sendResponse(res, 400, false, 'Month and year parameters are required.');
    }

    // Verify employee exists and is under this client
    const employee = await User.findOne({ _id: userId, clientId: req.clientId });
    if (!employee) {
      return sendResponse(res, 404, false, 'Employee not found');
    }

    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);

    // Get number of days in that month
    const daysInMonth = new Date(yearNum, monthNum, 0).getDate();

    // Query all attendance records for this employee in this month
    const prefix = `${yearNum}-${String(monthNum).padStart(2, '0')}-`;
    const records = await Attendance.find({
      userId,
      clientId: req.clientId,
      date: { $regex: new RegExp(`^${prefix}`) }
    });

    // Create a lookup map of existing records
    const recordMap = {};
    records.forEach(rec => {
      recordMap[rec.date] = rec;
    });

    const empWeekends = employee.weekends || [0];
    const todayStr = getTodayString(); // 'YYYY-MM-DD'
    const days = [];
    let pCount = 0;
    let aCount = 0;
    let clCount = 0;
    let woCount = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const rec = recordMap[dateStr];
      const dayOfWeek = new Date(yearNum, monthNum - 1, d).getDay();
      
      let status = '';
      if (rec) {
        if (['present', 'late', 'wfh', 'half-day'].includes(rec.status)) {
          status = 'P';
          pCount++;
        } else if (rec.status === 'leave') {
          status = 'CL';
          clCount++;
        } else if (rec.status === 'absent') {
          status = 'A';
          aCount++;
        } else {
          status = 'P';
          pCount++;
        }
      } else {
        // No record exists. Check if date is in the future.
        if (dateStr > todayStr) {
          status = ''; // future date
        } else {
          // Check if this day is a weekend for this employee
          if (empWeekends.includes(dayOfWeek)) {
            status = 'WO';
            woCount++;
          } else {
            status = 'A'; // past date with no record is Absent
            aCount++;
          }
        }
      }

      days.push({
        day: d,
        date: dateStr,
        status,
        checkInTime: rec?.checkInTime || null,
        checkOutTime: rec?.checkOutTime || null,
        totalHours: rec?.totalHours || 0
      });
    }

    return sendResponse(res, 200, true, 'Employee attendance summary fetched successfully', {
      employee: {
        id: employee._id,
        name: employee.name,
        employeeId: employee.employeeId,
        department: employee.department,
        designation: employee.designation,
        joiningDate: employee.joiningDate,
        weekends: empWeekends
      },
      totals: {
        present: pCount + clCount,
        absent: aCount,
        leaves: clCount,
        weeklyOffs: woCount
      },
      days
    });
  } catch (error) {
    next(error);
  }
};

// === LEAVE MANAGEMENT ===

exports.getAllLeaves = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = { clientId: req.clientId };
    if (status) filter.status = status;

    const leaves = await Leave.find(filter)
      .populate('userId', 'name email employeeId department designation')
      .sort({ createdAt: -1 });

    return sendResponse(res, 200, true, 'Leave requests fetched', leaves);
  } catch (error) {
    next(error);
  }
};

exports.approveLeave = async (req, res, next) => {
  try {
    const leave = await Leave.findById(req.params.id);
    if (!leave) {
      return sendResponse(res, 404, false, 'Leave request not found');
    }

    leave.status = 'approved';
    leave.approvedBy = req.user._id;
    leave.approvedAt = new Date();
    await leave.save();

    // Automatically seed/mark Attendance records as 'leave' for this user during dates
    const start = new Date(leave.fromDate);
    const end = new Date(leave.toDate);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = getTodayString(d);
      await Attendance.findOneAndUpdate(
        { userId: leave.userId, date: dateStr },
        {
          status: 'leave',
          type: 'leave',
          isMarked: true,
          totalHours: 0
        },
        { upsert: true, new: true }
      );
    }

    return sendResponse(res, 200, true, 'Leave approved successfully and attendance updated', leave);
  } catch (error) {
    next(error);
  }
};

exports.rejectLeave = async (req, res, next) => {
  try {
    const { adminComment } = req.body;
    if (!adminComment) {
      return sendResponse(res, 400, false, 'Reason / Admin comment is required when rejecting a leave.');
    }

    const leave = await Leave.findById(req.params.id);
    if (!leave) {
      return sendResponse(res, 404, false, 'Leave request not found');
    }

    leave.status = 'rejected';
    leave.adminComment = adminComment;
    leave.approvedBy = req.user._id;
    leave.approvedAt = new Date();
    await leave.save();

    return sendResponse(res, 200, true, 'Leave request rejected', leave);
  } catch (error) {
    next(error);
  }
};

// === WFH MANAGEMENT ===

exports.getAllWfh = async (req, res, next) => {
  try {
    const requests = await WFHRequest.find({ clientId: req.clientId })
      .populate('userId', 'name email employeeId department designation')
      .sort({ createdAt: -1 });

    return sendResponse(res, 200, true, 'WFH requests fetched', requests);
  } catch (error) {
    next(error);
  }
};

exports.approveWfh = async (req, res, next) => {
  try {
    const request = await WFHRequest.findById(req.params.id);
    if (!request) {
      return sendResponse(res, 404, false, 'WFH request not found');
    }

    request.status = 'approved';
    request.approvedBy = req.user._id;
    request.approvedAt = new Date();
    await request.save();

    // Mark Attendance for the WFH date(s) as WFH/remote
    if (request.fromDate && request.toDate) {
      let currentDate = new Date(request.fromDate);
      const endDate = new Date(request.toDate);

      while (currentDate <= endDate) {
        const wfhDateStr = getTodayString(currentDate);
        await Attendance.findOneAndUpdate(
          { userId: request.userId, date: wfhDateStr },
          {
            status: 'wfh',
            type: 'remote',
            isMarked: true,
          },
          { upsert: true, new: true }
        );
        currentDate.setDate(currentDate.getDate() + 1);
      }
    } else if (request.date) {
      // Legacy fallback for single date requests
      const wfhDateStr = getTodayString(request.date);
      await Attendance.findOneAndUpdate(
        { userId: request.userId, date: wfhDateStr },
        {
          status: 'wfh',
          type: 'remote',
          isMarked: true,
        },
        { upsert: true, new: true }
      );
    }

    return sendResponse(res, 200, true, 'WFH request approved', request);
  } catch (error) {
    next(error);
  }
};

exports.rejectWfh = async (req, res, next) => {
  try {
    const { adminComment } = req.body;
    const request = await WFHRequest.findById(req.params.id);
    if (!request) {
      return sendResponse(res, 404, false, 'WFH request not found');
    }

    request.status = 'rejected';
    request.adminComment = adminComment || '';
    request.approvedBy = req.user._id;
    request.approvedAt = new Date();
    await request.save();

    return sendResponse(res, 200, true, 'WFH request rejected', request);
  } catch (error) {
    next(error);
  }
};

// === CORRECTION MANAGEMENT ===

exports.getAllCorrections = async (req, res, next) => {
  try {
    const corrections = await CorrectionRequest.find({ clientId: req.clientId })
      .populate('userId', 'name email employeeId department designation')
      .sort({ createdAt: -1 });
    return sendResponse(res, 200, true, 'Correction requests fetched', corrections);
  } catch (error) {
    next(error);
  }
};

exports.approveCorrection = async (req, res, next) => {
  try {
    const correction = await CorrectionRequest.findById(req.params.id);
    if (!correction) {
      return sendResponse(res, 404, false, 'Correction request not found');
    }

    correction.status = 'approved';
    correction.approvedBy = req.user._id;
    await correction.save();

    // Apply values to the corresponding user's Attendance record
    const dateStr = getTodayString(correction.date);
    
    // Fetch or construct Attendance
    let attendance = await Attendance.findOne({ userId: correction.userId, date: dateStr });
    if (!attendance) {
      attendance = new Attendance({
        userId: correction.userId,
        date: dateStr,
      });
    }

    if (correction.requestedCheckIn) {
      attendance.checkInTime = correction.requestedCheckIn;
    }
    if (correction.requestedCheckOut) {
      attendance.checkOutTime = correction.requestedCheckOut;
    }

    // Recompute hours
    if (attendance.checkInTime && attendance.checkOutTime) {
      const hours = (attendance.checkOutTime - attendance.checkInTime) / (1000 * 60 * 60);
      attendance.totalHours = parseFloat(hours.toFixed(2));
      attendance.status = attendance.totalHours < 4 ? 'half-day' : 'present';
    } else {
      attendance.status = 'present';
    }
    attendance.isMarked = true;

    await attendance.save();
    return sendResponse(res, 200, true, 'Correction approved and attendance record updated', correction);
  } catch (error) {
    next(error);
  }
};

exports.rejectCorrection = async (req, res, next) => {
  try {
    const { adminComment } = req.body;
    const correction = await CorrectionRequest.findById(req.params.id);
    if (!correction) {
      return sendResponse(res, 404, false, 'Correction request not found');
    }

    correction.status = 'rejected';
    correction.adminComment = adminComment || '';
    correction.approvedBy = req.user._id;
    await correction.save();

    return sendResponse(res, 200, true, 'Correction request rejected', correction);
  } catch (error) {
    next(error);
  }
};

// === FEEDBACK MANAGEMENT ===

exports.getAllFeedbacks = async (req, res, next) => {
  try {
    const { priority, status } = req.query;
    const filter = { clientId: req.clientId };
    if (priority) filter.priority = priority;
    if (status) filter.status = status;

    const feedbacks = await Feedback.find(filter)
      .populate('userId', 'name email employeeId department designation')
      .sort({ createdAt: -1 });

    return sendResponse(res, 200, true, 'Feedbacks fetched', feedbacks);
  } catch (error) {
    next(error);
  }
};

exports.replyFeedback = async (req, res, next) => {
  try {
    const { adminReply } = req.body;
    if (!adminReply) {
      return sendResponse(res, 400, false, 'Reply content is required.');
    }

    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) {
      return sendResponse(res, 404, false, 'Feedback not found');
    }

    feedback.adminReply = adminReply;
    feedback.repliedBy = req.user._id;
    feedback.repliedAt = new Date();
    feedback.status = 'in-review';

    await feedback.save();
    return sendResponse(res, 200, true, 'Reply submitted, status set to in-review', feedback);
  } catch (error) {
    next(error);
  }
};

exports.resolveFeedback = async (req, res, next) => {
  try {
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) {
      return sendResponse(res, 404, false, 'Feedback not found');
    }

    feedback.status = 'resolved';
    await feedback.save();

    return sendResponse(res, 200, true, 'Feedback marked as resolved', feedback);
  } catch (error) {
    next(error);
  }
};

// === WORK REPORTS ===

exports.getAllWorkReports = async (req, res, next) => {
  try {
    const { date, userId } = req.query;
    const filter = { clientId: req.clientId };

    if (date) filter.date = date;
    if (userId) filter.userId = userId;

    const reports = await WorkReport.find(filter)
      .populate('userId', 'name email employeeId department designation')
      .sort({ date: -1 });

    return sendResponse(res, 200, true, 'Work reports fetched', reports);
  } catch (error) {
    next(error);
  }
};

// === POLICIES / ANNOUNCEMENTS ===

exports.getPolicies = async (req, res, next) => {
  try {
    const list = await Policy.find({ clientId: req.clientId }).sort({ createdAt: -1 });
    return sendResponse(res, 200, true, 'All policies/announcements fetched for admin', list);
  } catch (error) {
    next(error);
  }
};

exports.createPolicy = async (req, res, next) => {
  try {
    const { title, content, category, isActive = true } = req.body;
    if (!title || !content || !category) {
      return sendResponse(res, 400, false, 'Title, content, and category are required.');
    }

    const policy = await Policy.create({
      title,
      content,
      category,
      isActive,
      createdBy: req.user._id,
      clientId: req.clientId,
    });

    return sendResponse(res, 201, true, 'Policy created successfully', policy);
  } catch (error) {
    next(error);
  }
};

exports.updatePolicy = async (req, res, next) => {
  try {
    const { title, content, category, isActive } = req.body;
    const policy = await Policy.findById(req.params.id);
    if (!policy) {
      return sendResponse(res, 404, false, 'Policy not found');
    }

    if (title !== undefined) policy.title = title;
    if (content !== undefined) policy.content = content;
    if (category !== undefined) policy.category = category;
    if (isActive !== undefined) policy.isActive = isActive;

    await policy.save();
    return sendResponse(res, 200, true, 'Policy updated successfully', policy);
  } catch (error) {
    next(error);
  }
};

exports.deletePolicy = async (req, res, next) => {
  try {
    const policy = await Policy.findByIdAndDelete(req.params.id);
    if (!policy) {
      return sendResponse(res, 404, false, 'Policy not found');
    }
    return sendResponse(res, 200, true, 'Policy deleted successfully');
  } catch (error) {
    next(error);
  }
};

// === ADMIN DASHBOARD ===

exports.getAdminStats = async (req, res, next) => {
  try {
    const todayStr = getTodayString();

    const activeEmployeesCount = await User.countDocuments({ clientId: req.clientId, isActive: true });

    // Today's attendance counters
    const todayAttendance = await Attendance.find({ clientId: req.clientId, date: todayStr });
    
    let presentCount = 0;
    let lateCount = 0;
    let wfhCount = 0;
    let leaveCount = 0;
    let halfDayCount = 0;

    todayAttendance.forEach(a => {
      if (a.status === 'present') presentCount++;
      if (a.status === 'late') lateCount++;
      if (a.status === 'wfh') wfhCount++;
      if (a.status === 'leave') leaveCount++;
      if (a.status === 'half-day') halfDayCount++;
    });

    const presentSum = presentCount + lateCount + halfDayCount;

    // Pending requests counters
    const pendingLeaves = await Leave.countDocuments({ clientId: req.clientId, status: 'pending' });
    const pendingWfh = await WFHRequest.countDocuments({ clientId: req.clientId, status: 'pending' });
    const pendingCorrections = await CorrectionRequest.countDocuments({ clientId: req.clientId, status: 'pending' });

    // Feedback counter
    const unresolvedFeedbacks = await Feedback.countDocuments({ clientId: req.clientId, status: { $ne: 'resolved' } });

    return sendResponse(res, 200, true, 'Admin stats fetched', {
      totalEmployees: activeEmployeesCount,
      todayStats: {
        present: presentSum,
        absent: Math.max(0, activeEmployeesCount - (presentSum + wfhCount + leaveCount)),
        wfh: wfhCount,
        leave: leaveCount
      },
      pendingRequests: {
        leaves: pendingLeaves,
        wfh: pendingWfh,
        corrections: pendingCorrections
      },
      unresolvedFeedbacks
    });
  } catch (error) {
    next(error);
  }
};

// === PENDING REGISTRATIONS APPROVAL (Disabled) ===

exports.getPendingRegistrations = async (req, res, next) => {
  return res.status(403).json({
    success: false,
    message: 'Registration approvals are disabled.',
    error: 'FORBIDDEN'
  });
};

exports.approveRegistration = async (req, res, next) => {
  return res.status(403).json({
    success: false,
    message: 'Registration approvals are disabled.',
    error: 'FORBIDDEN'
  });
};

exports.rejectRegistration = async (req, res, next) => {
  return res.status(403).json({
    success: false,
    message: 'Registration approvals are disabled.',
    error: 'FORBIDDEN'
  });
};
