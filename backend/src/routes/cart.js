const express = require('express');
const asyncHandler = require('express-async-handler');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { protect } = require('../middleware/auth');

const router = express.Router();

// ─── GET CART ─────────────────────────────────────────────────────────────────
// @desc    Get the current user's cart
// @route   GET /api/cart
// @access  Protected
router.get('/', protect, asyncHandler(async (req, res) => {
  let cart = await Cart.findOne({ user: req.user._id }).populate('items.product', 'name image price countInStock');
  if (!cart) {
    cart = { user: req.user._id, items: [] };
  }
  res.json(cart);
}));

// ─── ADD ITEM TO CART ─────────────────────────────────────────────────────────
// @desc    Add an item to the cart (or increase qty if already present)
// @route   POST /api/cart
// @access  Protected
router.post('/', protect, asyncHandler(async (req, res) => {
  const { productId, qty } = req.body;
  const quantity = qty === undefined ? 1 : Number(qty);
  if (!Number.isSafeInteger(quantity) || quantity < 1) {
    res.status(400);
    throw new Error('Quantity must be a positive whole number');
  }

  // Validate product and stock
  const product = await Product.findById(productId);
  if (!product || product.isActive === false) {
    res.status(404);
    throw new Error('Product not found');
  }
  if (product.countInStock < quantity) {
    res.status(400);
    throw new Error('Insufficient stock');
  }

  let cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    cart = new Cart({ user: req.user._id, items: [] });
  }

  // Check if item already in cart
  const existingItem = cart.items.find((i) => i.product.toString() === productId);
  if (existingItem) {
    const newQty = existingItem.qty + quantity;
    if (newQty > product.countInStock) {
      res.status(400);
      throw new Error('Insufficient stock');
    }
    existingItem.qty   = newQty;
    existingItem.price = product.price;
  } else {
    cart.items.push({ product: productId, qty: quantity, price: product.price });
  }

  await cart.save();
  const populated = await Cart.findById(cart._id).populate('items.product', 'name image price countInStock');
  res.status(201).json(populated);
}));

// ─── UPDATE ITEM QTY ──────────────────────────────────────────────────────────
// @desc    Update the quantity of a cart item
// @route   PUT /api/cart/:itemId
// @access  Protected
router.put('/:itemId', protect, asyncHandler(async (req, res) => {
  const { qty } = req.body;
  const quantity = Number(qty);

  if (!Number.isSafeInteger(quantity) || quantity < 1) {
    res.status(400);
    throw new Error('Quantity must be at least 1');
  }

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    res.status(404);
    throw new Error('Cart not found');
  }

  const item = cart.items.id(req.params.itemId);
  if (!item) {
    res.status(404);
    throw new Error('Item not in cart');
  }

  // Validate stock
  const product = await Product.findById(item.product);
  if (!product || product.countInStock < quantity) {
    res.status(400);
    throw new Error('Insufficient stock');
  }

  item.qty   = quantity;
  item.price = product.price;
  await cart.save();

  const populated = await Cart.findById(cart._id).populate('items.product', 'name image price countInStock');
  res.json(populated);
}));

// ─── REMOVE ITEM FROM CART ────────────────────────────────────────────────────
// @desc    Remove a single item from the cart
// @route   DELETE /api/cart/:itemId
// @access  Protected
router.delete('/:itemId', protect, asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    res.status(404);
    throw new Error('Cart not found');
  }

  const item = cart.items.id(req.params.itemId);
  if (!item) {
    res.status(404);
    throw new Error('Item not in cart');
  }

  item.deleteOne();
  await cart.save();

  const populated = await Cart.findById(cart._id).populate('items.product', 'name image price countInStock');
  res.json(populated);
}));

// ─── CLEAR CART ───────────────────────────────────────────────────────────────
// @desc    Remove all items from the cart
// @route   DELETE /api/cart
// @access  Protected
router.delete('/', protect, asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });
  if (cart) {
    cart.items = [];
    await cart.save();
  }
  res.json({ message: 'Cart cleared' });
}));

module.exports = router;
