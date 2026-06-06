const Project = require('../models/Project');
const ProjectLog = require('../models/ProjectLog');
const cryptoHelper = require('../utils/cryptoHelper');
const r2Helper = require('../utils/r2Helper');
const sendResponse = require('../utils/sendResponse');

// Log action helper
const logProjectAction = async (projectId, userId, actionText) => {
  try {
    await ProjectLog.create({
      projectId,
      updatedBy: userId,
      action: actionText,
    });
  } catch (err) {
    console.error('Failed to log project action:', err.message);
  }
};

// Create project
exports.createProject = async (req, res, next) => {
  try {
    const {
      name,
      description,
      projectType,
      legalEntity,
      businessEmail,
      quickLinks,
      logins,
      paymentGateways,
      marketing,
      githubUsername,
      envContent,
      members,
    } = req.body;

    if (!name || !projectType) {
      return sendResponse(res, 400, false, 'Project Name and Project Type are required.');
    }

    // Encrypt env content if provided
    const encryptedEnv = envContent ? cryptoHelper.encrypt(envContent) : '';

    // Parsed quick links if passed as string JSON
    let parsedLinks = [];
    if (quickLinks) {
      parsedLinks = typeof quickLinks === 'string' ? JSON.parse(quickLinks) : quickLinks;
    }

    // Parsed payment gateways array
    let parsedPayments = [];
    if (paymentGateways) {
      parsedPayments = typeof paymentGateways === 'string' ? JSON.parse(paymentGateways) : paymentGateways;
    }

    // Parsed logins object
    let parsedLogins = {};
    if (logins) {
      parsedLogins = typeof logins === 'string' ? JSON.parse(logins) : logins;
    }

    const projectData = {
      name,
      description,
      projectType,
      createdBy: req.user._id,
      clientId: req.clientId, // Multi-tenant client context
      businessEmail,
      githubUsername,
      quickLinks: parsedLinks,
      logins: parsedLogins,
      paymentGateways: parsedPayments,
      marketing: marketing || {},
      envContent: encryptedEnv,
    };

    if (legalEntity) {
      projectData.legalEntity = legalEntity;
    }

    // Admins/HR can assign team members during creation
    if ((req.user.role === 'admin' || req.user.role === 'hr') && members) {
      projectData.members = typeof members === 'string' ? JSON.parse(members) : members;
    }

    const project = await Project.create(projectData);

    // Write initial Audit log
    await logProjectAction(project._id, req.user._id, `Project created by ${req.user.name}`);

    return sendResponse(res, 201, true, 'Project created successfully', project);
  } catch (error) {
    next(error);
  }
};

// Get all projects for active company/client
exports.getProjects = async (req, res, next) => {
  try {
    const isClientAdmin = req.user.role === 'admin' || req.user.role === 'hr';

    let filter = { clientId: req.clientId };

    // Employees can only see projects they created or are assigned to
    if (!isClientAdmin) {
      filter.$or = [
        { createdBy: req.user._id },
        { members: req.user._id },
      ];
    }

    const projects = await Project.find(filter)
      .populate('createdBy', 'name email employeeId designation')
      .populate('members', 'name email employeeId designation')
      .sort({ createdAt: -1 });

    return sendResponse(res, 200, true, 'Projects fetched successfully', projects);
  } catch (error) {
    next(error);
  }
};

// Get single project details (including decrypted .env if member)
exports.getProjectDetails = async (req, res, next) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, clientId: req.clientId })
      .populate('createdBy', 'name email employeeId designation')
      .populate('members', 'name email employeeId designation')
      .populate('files.uploadedBy', 'name email employeeId')
      .populate('audits.auditedBy', 'name email employeeId designation');

    if (!project) {
      return sendResponse(res, 404, false, 'Project not found');
    }

    // Verify user authorization
    const isClientAdmin = req.user.role === 'admin' || req.user.role === 'hr';
    const isCreator = project.createdBy._id.toString() === req.user._id.toString();
    const isMember = project.members.some(m => m._id.toString() === req.user._id.toString());

    if (!isClientAdmin && !isCreator && !isMember) {
      return sendResponse(res, 403, false, 'Access denied. You are not assigned to this project.');
    }

    // Decrypt envContent dynamically
    let decryptedEnv = '';
    if (project.envContent) {
      decryptedEnv = cryptoHelper.decrypt(project.envContent);
    }

    // Convert document to JSON object and append decrypted envContent
    const responseData = project.toObject();
    responseData.envContent = decryptedEnv;

    return sendResponse(res, 200, true, 'Project details fetched', responseData);
  } catch (error) {
    next(error);
  }
};

// Update project configuration/credentials
exports.updateProject = async (req, res, next) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, clientId: req.clientId });
    if (!project) {
      return sendResponse(res, 404, false, 'Project not found');
    }

    // Verify user authorization
    const isClientAdmin = req.user.role === 'admin' || req.user.role === 'hr';
    const isCreator = project.createdBy.toString() === req.user._id.toString();
    const isMember = project.members.includes(req.user._id);

    if (!isClientAdmin && !isCreator && !isMember) {
      return sendResponse(res, 403, false, 'Access denied. You cannot modify this project.');
    }

    const {
      name,
      description,
      legalEntity,
      businessEmail,
      quickLinks,
      logins,
      paymentGateways,
      marketing,
      githubUsername,
      envContent,
    } = req.body;

    const changes = [];

    if (name !== undefined && name !== project.name) {
      project.name = name;
      changes.push('Project name');
    }
    if (description !== undefined) project.description = description;
    if (legalEntity !== undefined) project.legalEntity = legalEntity;
    if (businessEmail !== undefined) project.businessEmail = businessEmail;
    
    if (quickLinks !== undefined) {
      project.quickLinks = typeof quickLinks === 'string' ? JSON.parse(quickLinks) : quickLinks;
      changes.push('Quick Links');
    }

    // Structured logins
    if (logins !== undefined) {
      const loginsData = typeof logins === 'string' ? JSON.parse(logins) : logins;
      project.logins = loginsData;
      changes.push('Deployment logins');
    }

    // Structured payment gateways array
    if (paymentGateways !== undefined) {
      const paymentsData = typeof paymentGateways === 'string' ? JSON.parse(paymentGateways) : paymentGateways;
      project.paymentGateways = paymentsData;
      changes.push('Payment Gateways list');
    }

    if (marketing !== undefined) {
      const marketingData = typeof marketing === 'string' ? JSON.parse(marketing) : marketing;
      project.marketing = marketingData;
      changes.push('Marketing accounts');
    }

    if (githubUsername !== undefined) project.githubUsername = githubUsername;

    // Encrypt env Content if it is changing
    if (envContent !== undefined) {
      const encrypted = cryptoHelper.encrypt(envContent);
      if (encrypted !== project.envContent) {
        project.envContent = encrypted;
        changes.push('.env variables');
      }
    }

    await project.save();

    // Log the update actions
    if (changes.length > 0) {
      await logProjectAction(
        project._id,
        req.user._id,
        `Updated details by ${req.user.name}: ${changes.join(', ')}`
      );
    }

    return sendResponse(res, 200, true, 'Project updated successfully', project);
  } catch (error) {
    next(error);
  }
};

// Assign team members (HR/Admin only)
exports.assignMembers = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'hr') {
      return sendResponse(res, 403, false, 'Access denied. HR/Admin access required.');
    }

    const project = await Project.findOne({ _id: req.params.id, clientId: req.clientId });
    if (!project) {
      return sendResponse(res, 404, false, 'Project not found');
    }

    const { members } = req.body;
    if (!members) {
      return sendResponse(res, 400, false, 'Members list is required.');
    }

    const newMembers = typeof members === 'string' ? JSON.parse(members) : members;
    project.members = newMembers;
    await project.save();

    await logProjectAction(
      project._id,
      req.user._id,
      `Team members assignment list updated by Admin/HR: ${req.user.name}`
    );

    return sendResponse(res, 200, true, 'Team members assigned successfully', project);
  } catch (error) {
    next(error);
  }
};

// Upload file asset to R2
exports.uploadAsset = async (req, res, next) => {
  try {
    if (!req.file) {
      return sendResponse(res, 400, false, 'No file was uploaded.');
    }

    const project = await Project.findOne({ _id: req.params.id, clientId: req.clientId });
    if (!project) {
      return sendResponse(res, 404, false, 'Project not found');
    }

    // Verify user authorization
    const isClientAdmin = req.user.role === 'admin' || req.user.role === 'hr';
    const isCreator = project.createdBy.toString() === req.user._id.toString();
    const isMember = project.members.includes(req.user._id);

    if (!isClientAdmin && !isCreator && !isMember) {
      return sendResponse(res, 403, false, 'Access denied. You cannot upload files to this project.');
    }

    const { category } = req.body;
    if (!category || !['logo', 'business_card', 'proposal', 'banner', 'mou', 'pem', 'firebase_json'].includes(category)) {
      return sendResponse(res, 400, false, 'Valid file category is required.');
    }

    // Upload to Cloudflare R2
    const fileKey = `projects/${project._id}/${category}_${Date.now()}_${req.file.originalname}`;
    await r2Helper.uploadToR2(req.file.buffer, fileKey, req.file.mimetype);

    // Push asset details to project model
    const fileData = {
      key: fileKey,
      originalName: req.file.originalname,
      category,
      size: req.file.size,
      uploadedBy: req.user._id,
      uploadedAt: new Date(),
    };

    project.files.push(fileData);
    await project.save();

    // Log upload in history
    await logProjectAction(
      project._id,
      req.user._id,
      `Uploaded asset file "${req.file.originalname}" in category "${category}"`
    );

    return sendResponse(res, 201, true, 'File asset uploaded successfully', fileData);
  } catch (error) {
    next(error);
  }
};

// Delete file asset from project and R2
exports.deleteAsset = async (req, res, next) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, clientId: req.clientId });
    if (!project) {
      return sendResponse(res, 404, false, 'Project not found');
    }

    // Verify user authorization
    const isClientAdmin = req.user.role === 'admin' || req.user.role === 'hr';
    const isCreator = project.createdBy.toString() === req.user._id.toString();
    const isMember = project.members.includes(req.user._id);

    if (!isClientAdmin && !isCreator && !isMember) {
      return sendResponse(res, 403, false, 'Access denied.');
    }

    const { fileKey } = req.body;
    if (!fileKey) {
      return sendResponse(res, 400, false, 'File key is required to delete.');
    }

    // Find file index in project document
    const fileIndex = project.files.findIndex(f => f.key === fileKey);
    if (fileIndex === -1) {
      return sendResponse(res, 404, false, 'File asset metadata not found in project');
    }

    const originalName = project.files[fileIndex].originalName;

    // Delete from R2
    try {
      await r2Helper.deleteFromR2(fileKey);
    } catch (r2Err) {
      console.warn('Failed to delete file from R2 bucket, metadata will still be cleaned:', r2Err.message);
    }

    // Remove from array and save
    project.files.splice(fileIndex, 1);
    await project.save();

    // Log deletion
    await logProjectAction(
      project._id,
      req.user._id,
      `Deleted asset file "${originalName}"`
    );

    return sendResponse(res, 200, true, 'File asset deleted successfully');
  } catch (error) {
    next(error);
  }
};

// Generate a secure presigned temporary download URL
exports.getDownloadUrl = async (req, res, next) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, clientId: req.clientId });
    if (!project) {
      return sendResponse(res, 404, false, 'Project not found');
    }

    // Verify user authorization
    const isClientAdmin = req.user.role === 'admin' || req.user.role === 'hr';
    const isCreator = project.createdBy.toString() === req.user._id.toString();
    const isMember = project.members.includes(req.user._id);

    if (!isClientAdmin && !isCreator && !isMember) {
      return sendResponse(res, 403, false, 'Access denied.');
    }

    const fileKey = req.query.fileKey;
    if (!fileKey) {
      return sendResponse(res, 400, false, 'fileKey query parameter is required.');
    }

    const fileMeta = project.files.find(f => f.key === fileKey);
    if (!fileMeta) {
      return sendResponse(res, 404, false, 'File metadata not found in project.');
    }

    // Generate signed link
    const downloadUrl = await r2Helper.getPresignedUrlFromR2(fileKey, fileMeta.originalName, 300); // 5 mins URL

    // Log the download action
    await logProjectAction(
      project._id,
      req.user._id,
      `Requested secure download link for asset "${fileMeta.originalName}"`
    );

    return sendResponse(res, 200, true, 'Secure link generated successfully', { downloadUrl });
  } catch (error) {
    next(error);
  }
};

// Get audit activity logs
exports.getProjectLogs = async (req, res, next) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, clientId: req.clientId });
    if (!project) {
      return sendResponse(res, 404, false, 'Project not found');
    }

    // Verify authorization
    const isClientAdmin = req.user.role === 'admin' || req.user.role === 'hr';
    const isCreator = project.createdBy.toString() === req.user._id.toString();
    const isMember = project.members.includes(req.user._id);

    if (!isClientAdmin && !isCreator && !isMember) {
      return sendResponse(res, 403, false, 'Access denied.');
    }

    const logs = await ProjectLog.find({ projectId: req.params.id })
      .populate('updatedBy', 'name email employeeId designation')
      .sort({ createdAt: -1 });

    return sendResponse(res, 200, true, 'Audit logs fetched successfully', logs);
  } catch (error) {
    next(error);
  }
};

// Submit project audit
exports.auditProject = async (req, res, next) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, clientId: req.clientId });
    if (!project) {
      return sendResponse(res, 404, false, 'Project not found');
    }

    // Verify user authorization (admin, hr, or assigned members can audit)
    const isClientAdmin = req.user.role === 'admin' || req.user.role === 'hr';
    const isCreator = project.createdBy.toString() === req.user._id.toString();
    const isMember = project.members.includes(req.user._id);

    if (!isClientAdmin && !isCreator && !isMember) {
      return sendResponse(res, 403, false, 'Access denied. You cannot audit this project.');
    }

    const { status, description } = req.body;
    if (!status || !['clean', 'issues_found'].includes(status)) {
      return sendResponse(res, 400, false, 'Valid audit status is required.');
    }

    if (status === 'issues_found' && (!description || !description.trim())) {
      return sendResponse(res, 400, false, 'Description is required when issues are found.');
    }

    // Push new audit record
    const auditData = {
      auditedBy: req.user._id,
      auditedAt: new Date(),
      status,
      description: description || '',
    };

    project.audits.push(auditData);
    project.auditStatus = status;
    await project.save();

    // Log this action in Project logs timeline
    const statusText = status === 'clean' ? 'Clean (No issues)' : 'Issues Found';
    const logDesc = `Submitted audit: ${statusText} ${description ? `- "${description}"` : ''}`;
    await logProjectAction(project._id, req.user._id, logDesc);

    return sendResponse(res, 201, true, 'Project audit submitted successfully', auditData);
  } catch (error) {
    next(error);
  }
};
