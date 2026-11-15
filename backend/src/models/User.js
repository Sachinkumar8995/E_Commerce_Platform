const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Sub-schema for user address book entries
const addressSchema = new mongoose.Schema({
  address:    { type: String, required: true, trim: true },
  city:       { type: String, required: true, trim: true },
  postalCode: { type: String, required: true, trim: true },
  country:    { type: String, required: true, trim: true },
  isDefault:  { type: Boolean, default: false },
});

const userSchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true },
  email:     { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^\S+@\S+\.\S+$/ },
  password:  { type: String, required: true, minlength: 8 },
  role:      { type: String, enum: ['customer', 'admin'], default: 'customer' },
  addresses: [addressSchema],
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare entered password with the hashed one
userSchema.methods.matchPassword = function (entered) {
  return bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model('User', userSchema);
