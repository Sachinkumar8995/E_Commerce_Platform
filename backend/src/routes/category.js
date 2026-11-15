const express = require('express');
const asyncHandler = require('express-async-handler');
const Category = require('../models/Category');
const { protect, admin } = require('../middleware/auth');
const { logAudit } = require('../middleware/auditMiddleware');

const router = express.Router();

// ─── LIST CATEGORIES ─────────────────────────────────────────────────────────
// @desc    Get all active categories
// @route   GET /api/categories
// @access  Public
router.get('/', asyncHandler(async (_req, res) => {
  const categories = await Category.find({ isActive: true }).sort({ name: 1 });
  res.json(categories);
}));

// ─── CREATE CATEGORY ─────────────────────────────────────────────────────────
// @desc    Create a new category
// @route   POST /api/categories
// @access  Admin
router.post('/', protect, admin, asyncHandler(async (req, res) => {
  const { name, description, image } = req.body;

  const exists = await Category.findOne({ name });
  if (exists) {
    res.status(400);
    throw new Error('Category already exists');
  }

  const category = await Category.create({ name, description, image });

  await logAudit('CREATE', 'Category', category._id, req.user._id, { name }, req.ip);

  res.status(201).json(category);
}));

// ─── UPDATE CATEGORY ─────────────────────────────────────────────────────────
// @desc    Update a category
// @route   PUT /api/categories/:id
// @access  Admin
router.put('/:id', protect, admin, asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) {
    res.status(404);
    throw new Error('Category not found');
  }

  const changes = {};
  ['name', 'description', 'image', 'isActive'].forEach((field) => {
    if (req.body[field] !== undefined) {
      changes[field] = { from: category[field], to: req.body[field] };
      category[field] = req.body[field];
    }
  });

  const updated = await category.save();

  await logAudit('UPDATE', 'Category', updated._id, req.user._id, changes, req.ip);

  res.json(updated);
}));

// ─── DELETE CATEGORY ─────────────────────────────────────────────────────────
// @desc    Delete a category
// @route   DELETE /api/categories/:id
// @access  Admin
router.delete('/:id', protect, admin, asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) {
    res.status(404);
    throw new Error('Category not found');
  }

  await Category.deleteOne({ _id: category._id });

  await logAudit('DELETE', 'Category', category._id, req.user._id, { name: category.name }, req.ip);

  res.json({ message: 'Category removed' });
}));

module.exports = router;
