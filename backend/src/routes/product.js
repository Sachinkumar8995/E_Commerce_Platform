const express = require('express');
const asyncHandler = require('express-async-handler');
const Product = require('../models/Product');
const Category = require('../models/Category');
const { protect, admin } = require('../middleware/auth');
const { logAudit } = require('../middleware/auditMiddleware');

const router = express.Router();
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ─── LIST / SEARCH / FILTER PRODUCTS ──────────────────────────────────────────
// @desc    Get products with search, filter, sort, pagination
// @route   GET /api/products
// @access  Public
router.get('/', asyncHandler(async (req, res) => {
  const page  = Math.max(Number(req.query.page)  || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 12, 1), 100);
  const skip  = (page - 1) * limit;

  // Build filter
  const filter = { isActive: { $ne: false } };

  // Full-text search
  const keyword = req.query.keyword || req.query.q;
  if (keyword !== undefined && typeof keyword !== 'string') {
    res.status(400);
    throw new Error('Search query must be a string');
  }
  if (typeof keyword === 'string' && keyword.trim()) {
    if (keyword.length > 100) {
      res.status(400);
      throw new Error('Search query cannot exceed 100 characters');
    }
    const terms = keyword.trim().split(/\s+/).map(escapeRegex);
    filter.$and = terms.map((term) => ({
      $or: [
        { name: { $regex: term, $options: 'i' } },
        { description: { $regex: term, $options: 'i' } },
        { brand: { $regex: term, $options: 'i' } },
      ],
    }));
  }

  // Category filter
  if (req.query.category) {
    const categories = String(req.query.category).split(',').map((value) => value.trim()).filter(Boolean);
    const categoryDocs = await Category.find({
      $or: [{ _id: { $in: categories.filter((value) => /^[0-9a-fA-F]{24}$/.test(value)) } }, { name: { $in: categories } }],
      isActive: { $ne: false },
    }).select('_id');
    filter.category = { $in: categoryDocs.map((category) => category._id) };
  }

  // Price range filter
  if (req.query.minPrice || req.query.maxPrice) {
    filter.price = {};
    if (req.query.minPrice) filter.price.$gte = Number(req.query.minPrice);
    if (req.query.maxPrice) filter.price.$lte = Number(req.query.maxPrice);
  }

  // Brand filter
  if (req.query.brand) {
    filter.brand = req.query.brand;
  }

  // Sort
  let sort = {};
  switch (req.query.sort) {
    case 'price_asc':
    case 'price-asc':   sort = { price: 1 };      break;
    case 'price_desc':
    case 'price-desc':  sort = { price: -1 };     break;
    case 'rating':
    case 'rating-desc': sort = { rating: -1 };    break;
    case 'newest':
    case 'createdAt-desc': sort = { createdAt: -1 }; break;
    default:            sort = { createdAt: -1 };
  }

  const [products, total] = await Promise.all([
    Product.find(filter).populate('category', 'name').sort(sort).skip(skip).limit(limit),
    Product.countDocuments(filter),
  ]);

  res.json({
    products,
    page,
    pages: Math.ceil(total / limit),
    total,
  });
}));

// ─── SINGLE PRODUCT ──────────────────────────────────────────────────────────
// @desc    Get a single product by ID
// @route   GET /api/products/:id
// @access  Public
router.get('/:id', asyncHandler(async (req, res) => {
  const product = await Product.findOne({ _id: req.params.id, isActive: { $ne: false } }).populate('category', 'name');
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }
  res.json(product);
}));

// ─── CREATE PRODUCT ──────────────────────────────────────────────────────────
// @desc    Create a new product
// @route   POST /api/products
// @access  Admin
router.post('/', protect, admin, asyncHandler(async (req, res) => {
  const { name, description, price, countInStock, image, category, brand, variants } = req.body;

  const product = await Product.create({
    name,
    description,
    price,
    countInStock,
    image,
    category,
    brand,
    variants,
  });

  await logAudit('CREATE', 'Product', product._id, req.user._id, { name, price }, req.ip);

  res.status(201).json(product);
}));

// ─── UPDATE PRODUCT ──────────────────────────────────────────────────────────
// @desc    Update an existing product
// @route   PUT /api/products/:id
// @access  Admin
router.put('/:id', protect, admin, asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  const allowedFields = ['name', 'description', 'price', 'countInStock', 'image', 'category', 'brand', 'rating', 'numReviews', 'variants', 'isActive'];
  const changes = {};

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      changes[field] = { from: product[field], to: req.body[field] };
      product[field] = req.body[field];
    }
  });

  const updated = await product.save();

  await logAudit('UPDATE', 'Product', updated._id, req.user._id, changes, req.ip);

  res.json(updated);
}));

// ─── DELETE PRODUCT (soft-delete) ─────────────────────────────────────────────
// @desc    Soft-delete a product (set isActive = false)
// @route   DELETE /api/products/:id
// @access  Admin
router.delete('/:id', protect, admin, asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  product.isActive = false;
  await product.save();

  await logAudit('DELETE', 'Product', product._id, req.user._id, { softDeleted: true }, req.ip);

  res.json({ message: 'Product removed' });
}));

module.exports = router;
