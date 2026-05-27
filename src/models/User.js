const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    googleId: {
      type: String,
      unique: true,
      sparse: true,
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
      unique: true,
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
      unique: true,
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
      default: 'pending',
    },
    isActive: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to auto-generate employeeId if not present
userSchema.pre('save', async function () {
  if (!this.employeeId) {
    const model = this.constructor;
    const count = await model.countDocuments();
    let nextNum = count + 1;
    let candidateId = `EMP-${String(nextNum).padStart(3, '0')}`;
    let exists = await model.findOne({ employeeId: candidateId });
    
    while (exists) {
      nextNum++;
      candidateId = `EMP-${String(nextNum).padStart(3, '0')}`;
      exists = await model.findOne({ employeeId: candidateId });
    }
    
    this.employeeId = candidateId;
  }
});

module.exports = mongoose.model('User', userSchema);
