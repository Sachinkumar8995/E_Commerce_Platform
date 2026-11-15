const express = require('express');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { protect } = require('../middleware/auth');

const router = express.Router();

// ─── REGISTER ─────────────────────────────────────────────────────────────────
// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (typeof name !== 'string' || !name.trim()
    || typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email.trim())
    || typeof password !== 'string' || password.length < 8) {
    res.status(400);
    throw new Error('Name, valid email and a password of at least 8 characters are required');
  }
  const normalizedEmail = email.trim().toLowerCase();

  const userExists = await User.findOne({ email: normalizedEmail });
  if (userExists) {
    res.status(400);
    throw new Error('User already exists');
  }

  const user = await User.create({ name: name.trim(), email: normalizedEmail, password });
  if (user) {
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } else {
    res.status(400);
    throw new Error('Invalid user data');
  }
}));

// ─── LOGIN ────────────────────────────────────────────────────────────────────
// @desc    Authenticate user & return token
// @route   POST /api/auth/login
// @access  Public
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const user = await User.findOne({ email: normalizedEmail });
  if (user && (await user.matchPassword(password))) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } else {
    res.status(401);
    throw new Error('Invalid email or password');
  }
}));

// ─── GET PROFILE ──────────────────────────────────────────────────────────────
// @desc    Get current user's profile
// @route   GET /api/auth/profile
// @access  Protected
router.get('/profile', protect, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  res.json(user);
}));

// ─── UPDATE PROFILE ───────────────────────────────────────────────────────────
// @desc    Update current user's name / email / password
// @route   PUT /api/auth/profile
// @access  Protected
router.put('/profile', protect, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (req.body.name !== undefined && (typeof req.body.name !== 'string' || !req.body.name.trim())) {
    res.status(400);
    throw new Error('Name cannot be empty');
  }
  if (req.body.email !== undefined && (typeof req.body.email !== 'string' || !/^\S+@\S+\.\S+$/.test(req.body.email.trim()))) {
    res.status(400);
    throw new Error('A valid email is required');
  }
  if (req.body.password !== undefined && (typeof req.body.password !== 'string' || req.body.password.length < 8)) {
    res.status(400);
    throw new Error('Password must be at least 8 characters');
  }

  user.name  = req.body.name  || user.name;
  if (req.body.email) {
    user.email = req.body.email.trim().toLowerCase();
  }
  if (req.body.password) {
    user.password = req.body.password; // pre-save hook will hash it
  }

  const updated = await user.save();
  res.json({
    _id: updated._id,
    name: updated.name,
    email: updated.email,
    role: updated.role,
    token: generateToken(updated._id),
  });
}));

// ─── ADD / UPDATE ADDRESS ─────────────────────────────────────────────────────
// @desc    Add or update an address in the user's address book
// @route   PUT /api/auth/address
// @access  Protected
router.put('/address', protect, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const { id, address, city, postalCode, country, isDefault } = req.body;
  const addressFields = [address, city, postalCode, country];
  const invalidAddress = addressFields.some((value) =>
    value !== undefined && (typeof value !== 'string' || !value.trim())
  );
  if ((!id && addressFields.some((value) => typeof value !== 'string' || !value.trim())) || invalidAddress) {
    res.status(400);
    throw new Error('Address, city, postal code and country are required');
  }

  // If isDefault is true, unset any existing default
  if (isDefault) {
    user.addresses.forEach((a) => { a.isDefault = false; });
  }

  if (id) {
    // Update existing address
    const addr = user.addresses.id(id);
    if (!addr) {
      res.status(404);
      throw new Error('Address not found');
    }
    addr.address    = address    || addr.address;
    addr.city       = city       || addr.city;
    addr.postalCode = postalCode || addr.postalCode;
    addr.country    = country    || addr.country;
    addr.isDefault  = isDefault !== undefined ? isDefault : addr.isDefault;
  } else {
    // Add new address
    user.addresses.push({ address, city, postalCode, country, isDefault: isDefault || false });
  }

  await user.save();
  res.json({ addresses: user.addresses });
}));

// ─── DELETE ADDRESS ───────────────────────────────────────────────────────────
// @desc    Remove an address from the user's address book
// @route   DELETE /api/auth/address/:id
// @access  Protected
router.delete('/address/:id', protect, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const addr = user.addresses.id(req.params.id);
  if (!addr) {
    res.status(404);
    throw new Error('Address not found');
  }

  addr.deleteOne();
  await user.save();
  res.json({ addresses: user.addresses });
}));

module.exports = router;
