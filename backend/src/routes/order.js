const express = require('express');
const asyncHandler = require('express-async-handler');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { protect, admin } = require('../middleware/auth');
const { logAudit } = require('../middleware/auditMiddleware');

const router = express.Router();

// Tax and shipping constants (from env or defaults)
const TAX_RATE = process.env.TAX_RATE === undefined ? 0.1 : Number(process.env.TAX_RATE);
const SHIPPING_FLAT_RATE = process.env.SHIPPING_FLAT_RATE === undefined ? 5.99 : Number(process.env.SHIPPING_FLAT_RATE);
const FREE_SHIPPING_MIN = 100;

// Valid order status transitions (state machine)
const VALID_TRANSITIONS = {
  placed:    ['paid', 'cancelled'],
  paid:      ['packed', 'cancelled'],
  packed:    ['shipped'],
  shipped:   ['delivered'],
  delivered: [],
  cancelled: [],
};

// ─── CREATE ORDER ─────────────────────────────────────────────────────────────
// @desc    Create an order from the user's cart
// @route   POST /api/orders
// @access  Protected
router.post('/', protect, asyncHandler(async (req, res) => {
  const { shippingAddress } = req.body;
  const idempotencyKey = req.headers['x-idempotency-key'];
  if (idempotencyKey !== undefined && (typeof idempotencyKey !== 'string' || idempotencyKey.length > 128)) {
    res.status(400);
    throw new Error('Idempotency key must be a string of at most 128 characters');
  }

  // Validate shipping address
  if (!shippingAddress || !shippingAddress.address || !shippingAddress.city || !shippingAddress.postalCode || !shippingAddress.country) {
    res.status(400);
    throw new Error('Shipping address is required (address, city, postalCode, country)');
  }

  // ── Idempotency check ──
  if (idempotencyKey) {
    const existing = await Order.findOne({ idempotencyKey });
    if (existing) {
      if (existing.user.toString() !== req.user._id.toString()) {
        res.status(409);
        throw new Error('Idempotency key has already been used');
      }
      return res.json(existing);
    }
  }

  // ── Load the user's cart ──
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart || cart.items.length === 0) {
    res.status(400);
    throw new Error('Cart is empty');
  }

  // ── Validate stock and decrement atomically ──
  const orderItems = [];
  const reservedItems = [];
  let order;
  let itemsPrice;
  let taxPrice;
  let shippingPrice;
  let totalPrice;
  try {
    for (const item of cart.items) {
      const product = await Product.findOneAndUpdate(
        { _id: item.product, isActive: { $ne: false }, countInStock: { $gte: item.qty } },
        { $inc: { countInStock: -item.qty } },
        { new: true }
      );
      if (!product) {
        const available = await Product.findById(item.product).select('name');
        res.status(409);
        throw new Error(`Insufficient stock for ${available?.name || 'a cart product'}`);
      }

      reservedItems.push({ product: product._id, qty: item.qty });
      orderItems.push({
        product: product._id,
        name: product.name,
        image: product.image,
        qty: item.qty,
        price: product.price,
      });
    }

    itemsPrice = orderItems.reduce((sum, item) => sum + item.price * item.qty, 0);
    taxPrice = +(itemsPrice * TAX_RATE).toFixed(2);
    shippingPrice = itemsPrice >= FREE_SHIPPING_MIN ? 0 : SHIPPING_FLAT_RATE;
    totalPrice = +(itemsPrice + taxPrice + shippingPrice).toFixed(2);

    order = await Order.create({
      user: req.user._id,
      orderItems,
      shippingAddress,
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
      idempotencyKey: idempotencyKey || undefined,
    });

    cart.items = [];
    await cart.save();
  } catch (error) {
    await Promise.all(reservedItems.map((item) =>
      Product.findByIdAndUpdate(item.product, { $inc: { countInStock: item.qty } })
    ));
    if (error.code === 11000 && idempotencyKey) {
      const existing = await Order.findOne({ idempotencyKey });
      if (existing?.user.toString() === req.user._id.toString()) return res.json(existing);
      if (existing) {
        res.status(409);
        throw new Error('Idempotency key has already been used');
      }
    }
    throw error;
  }

  await logAudit('CREATE', 'Order', order._id, req.user._id, { totalPrice, items: orderItems.length }, req.ip);

  res.status(201).json(order);
}));

// ─── GET USER'S ORDERS ────────────────────────────────────────────────────────
// @desc    Get orders for the logged-in user (paginated)
// @route   GET /api/orders
// @access  Protected
router.get('/', protect, asyncHandler(async (req, res) => {
  const page  = Math.max(Number(req.query.page)  || 1, 1);
  const limit = Math.max(Number(req.query.limit) || 10, 1);
  const skip  = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    Order.find({ user: req.user._id }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Order.countDocuments({ user: req.user._id }),
  ]);

  res.json({ orders, page, pages: Math.ceil(total / limit), total });
}));

// ─── ADMIN: GET ALL ORDERS ───────────────────────────────────────────────────
// @desc    Get all orders (admin, paginated, filterable by status)
// @route   GET /api/orders/admin/all
// @access  Admin
router.get('/admin/all', protect, admin, asyncHandler(async (req, res) => {
  const page  = Math.max(Number(req.query.page)  || 1, 1);
  const limit = Math.max(Number(req.query.limit) || 10, 1);
  const skip  = (page - 1) * limit;

  const filter = {};
  if (req.query.status) filter.status = req.query.status;

  const [orders, total] = await Promise.all([
    Order.find(filter).populate('user', 'name email').sort({ createdAt: -1 }).skip(skip).limit(limit),
    Order.countDocuments(filter),
  ]);

  res.json({ orders, page, pages: Math.ceil(total / limit), total });
}));

// ─── GET SINGLE ORDER ─────────────────────────────────────────────────────────
// @desc    Get a single order by ID (owner or admin)
// @route   GET /api/orders/:id
// @access  Protected
router.get('/:id', protect, asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('user', 'name email');
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  // Only the order owner or an admin may view
  if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized');
  }

  res.json(order);
}));

// ─── SIMULATE PAYMENT ────────────────────────────────────────────────────────
// @desc    Mark an order as paid (simulated)
// @route   PUT /api/orders/:id/pay
// @access  Protected
router.put('/:id/pay', protect, asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized');
  }

  if (order.status !== 'placed') {
    res.status(400);
    throw new Error(`Cannot pay an order with status "${order.status}"`);
  }

  if (req.body.success === false) {
    order.paymentResult = {
      id: req.body.id || 'SIMULATED-FAILED',
      status: 'FAILED',
      update_time: new Date().toISOString(),
      email_address: req.user.email,
    };
    await order.save();
    res.status(402);
    throw new Error('Simulated payment failed. You can retry payment or cancel the order.');
  }

  const paidOrder = await Order.findOneAndUpdate(
    { _id: order._id, user: order.user, status: 'placed' },
    {
      $set: {
        isPaid: true,
        paidAt: new Date(),
        status: 'paid',
        paymentResult: {
          id: req.body.id || 'SIMULATED',
          status: 'COMPLETED',
          update_time: new Date().toISOString(),
          email_address: req.user.email,
        },
      },
    },
    { new: true }
  );
  if (!paidOrder) {
    res.status(409);
    throw new Error('Order has already changed state');
  }

  await logAudit('STATUS_CHANGE', 'Order', paidOrder._id, req.user._id, { from: 'placed', to: 'paid' }, req.ip);

  res.json(paidOrder);
}));

// ─── CANCEL ORDER ─────────────────────────────────────────────────────────────
// @desc    Cancel an order and restore stock
// @route   PUT /api/orders/:id/cancel
// @access  Protected
router.put('/:id/cancel', protect, asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized');
  }

  if (!['placed', 'paid'].includes(order.status)) {
    res.status(400);
    throw new Error(`Cannot cancel an order with status "${order.status}"`);
  }

  const previousStatus = order.status;
  const cancelled = await Order.findOneAndUpdate(
    { _id: order._id, status: { $in: ['placed', 'paid'] } },
    { $set: { status: 'cancelled' } },
    { new: true }
  );
  if (!cancelled) {
    res.status(409);
    throw new Error('Order has already changed state');
  }

  for (const item of order.orderItems) {
    await Product.findByIdAndUpdate(item.product, { $inc: { countInStock: item.qty } });
  }

  await logAudit('STATUS_CHANGE', 'Order', cancelled._id, req.user._id, { from: previousStatus, to: 'cancelled' }, req.ip);

  res.json(cancelled);
}));

// ─── ADMIN: UPDATE ORDER STATUS ───────────────────────────────────────────────
// @desc    Update order status (admin state machine: paid→packed→shipped→delivered)
// @route   PUT /api/orders/:id/status
// @access  Admin
router.put('/:id/status', protect, admin, asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!status) {
    res.status(400);
    throw new Error('Status is required');
  }

  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  const allowed = VALID_TRANSITIONS[order.status] || [];
  if (!allowed.includes(status)) {
    res.status(400);
    throw new Error(`Invalid transition from "${order.status}" to "${status}"`);
  }

  const previousStatus = order.status;
  const update = { status };
  if (status === 'delivered') {
    update.isDelivered = true;
    update.deliveredAt = new Date();
  }
  const updated = await Order.findOneAndUpdate(
    { _id: order._id, status: previousStatus },
    { $set: update },
    { new: true, runValidators: true }
  );
  if (!updated) {
    res.status(409);
    throw new Error('Order has already changed state');
  }

  await logAudit('STATUS_CHANGE', 'Order', order._id, req.user._id, { from: previousStatus, to: status }, req.ip);

  res.json(updated);
}));

module.exports = router;
