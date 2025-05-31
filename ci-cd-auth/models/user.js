const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["student", "lecturer", "admin"],
    required: true,
  },
  githubAccessToken: {
    type: String,
    select: false
  },
  githubUsername: {
    type: String,
    unique: true,
    sparse: true
  },
    approved: {
    type: Boolean,
    default: function() {
      // Automatically approve students, require approval for lecturers
      return this.role !== 'lecturer';
    }
  },
    resetPasswordToken: String,
  resetPasswordExpires: Date
});

// ✅ Hash password before saving, only if it’s new or changed
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// ✅ Method to compare entered password to hashed one
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// ✅ Static method to update user securely (with optional password)
userSchema.statics.updateUserSecurely = async function (id, updates) {
  const user = await this.findById(id);
  if (!user) throw new Error("User not found");

  user.username = updates.username || user.username;
  user.email = updates.email || user.email;
  user.role = updates.role || user.role;

  if (updates.password) {
    user.password = updates.password; // will be hashed by pre('save')
  }

  await user.save();
  return user;
};

const User = mongoose.model("User", userSchema);
module.exports = User;
