const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    googleId: {
      type: String,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      default: null,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    profileImageUrl: {
      type: String,
    },
    role: {
      type: String,
      enum: ['employee', 'admin', 'hr'],
      default: 'employee',
    },
    employeeId: {
      type: String,
    },
    department: {
      type: String,
      default: '',
    },
    designation: {
      type: String,
      default: '',
    },
    phone: {
      type: String,
      default: '',
    },
    joiningDate: {
      type: Date,
      default: Date.now,
    },
    password: {
      type: String,
    },
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'approved',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    aadhaar: {
      type: String,
      default: '',
    },
    pan: {
      type: String,
      default: '',
    },
    temporaryAddress: {
      type: String,
      default: '',
    },
    permanentAddress: {
      type: String,
      default: '',
    },
    localGuardianPhone: {
      type: String,
      default: '',
    },
    reportingManagerName: {
      type: String,
      default: '',
    },
    reportingManagerEmail: {
      type: String,
      default: '',
    },
    reportingManagerPhone: {
      type: String,
      default: '',
    },
    workMode: {
      type: String,
      enum: ['office', 'remote'],
      default: 'office',
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to auto-generate employeeId if not present (starts at DTID10006)
userSchema.pre('save', async function () {
  if (!this.employeeId) {
    const model = this.constructor;
    
    // Find all users under this client with employeeId in the DTIDxxxxx format
    const employees = await model.find({
      clientId: this.clientId,
      employeeId: /^DTID\d+$/
    });

    let maxNum = 10005; // So the first employee created will get DTID10006
    employees.forEach(emp => {
      const num = parseInt(emp.employeeId.replace('DTID', ''), 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    });

    let nextNum = maxNum + 1;
    let candidateId = `DTID${nextNum}`;
    let exists = await model.findOne({ employeeId: candidateId, clientId: this.clientId });
    
    while (exists) {
      nextNum++;
      candidateId = `DTID${nextNum}`;
      exists = await model.findOne({ employeeId: candidateId, clientId: this.clientId });
    }
    
    this.employeeId = candidateId;
  }
});

// Compound unique indexes scoped to clientId
userSchema.index({ email: 1, clientId: 1 }, { unique: true });
userSchema.index({ googleId: 1, clientId: 1 }, { unique: true, sparse: true });
userSchema.index({ employeeId: 1, clientId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('User', userSchema);
