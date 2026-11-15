const express = require('express');
const asyncHandler = require('express-async-handler');
const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');
const AuditLog = require('../models/AuditLog');
const { protect, admin } = require('../middleware/auth');

const router = express.Router();

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
// @desc    Get admin dashboard statistics
// @route   GET /api/admin/dashboard
// @access  Admin
router.get('/dashboard', protect, admin, asyncHandler(async (req, res) => {
  // Total revenue (from paid/packed/shipped/delivered orders)
  const revenueAgg = await Order.aggregate([
    { $match: { status: { $in: ['paid', 'packed', 'shipped', 'delivered'] } } },
    { $group: { _id: null, totalRevenue: { $sum: '$totalPrice' } } },
  ]);
  const totalRevenue = revenueAgg.length ? revenueAgg[0].totalRevenue : 0;

  // Total orders
  const totalOrders = await Order.countDocuments();

  // Orders by status
  const ordersByStatus = await Order.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  // Recent 10 orders
  const recentOrders = await Order.find()
    .populate('user', 'name email')
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  // Top 5 selling products
  const topSelling = await Order.aggregate([
    { $match: { status: { $in: ['paid', 'packed', 'shipped', 'delivered'] } } },
    { $unwind: '$orderItems' },
    {
      $group: {
        _id: '$orderItems.product',
        name: { $first: '$orderItems.name' },
        totalQty: { $sum: '$orderItems.qty' },
        totalSales: { $sum: { $multiply: ['$orderItems.price', '$orderItems.qty'] } },
      },
    },
    { $sort: { totalQty: -1 } },
    { $limit: 5 },
  ]);

  // Total customers
  const totalCustomers = await User.countDocuments({ role: 'customer' });

  // Daily sales for the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const dailySales = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: thirtyDaysAgo },
        status: { $in: ['paid', 'packed', 'shipped', 'delivered'] },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        sales: { $sum: '$totalPrice' },
        orders: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  res.json({
    totalRevenue,
    totalOrders,
    ordersByStatus,
    recentOrders,
    topSelling,
    totalCustomers,
    dailySales,
  });
}));

// ─── LIST CUSTOMERS ──────────────────────────────────────────────────────────
// @desc    Get all customer users (paginated)
// @route   GET /api/admin/customers
// @access  Admin
router.get('/customers', protect, admin, asyncHandler(async (req, res) => {
  const page  = Math.max(Number(req.query.page)  || 1, 1);
  const limit = Math.max(Number(req.query.limit) || 10, 1);
  const skip  = (page - 1) * limit;

  const filter = { role: 'customer' };

  const [customers, total] = await Promise.all([
    User.find(filter).select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  res.json({ customers, page, pages: Math.ceil(total / limit), total });
}));

// ─── AUDIT LOGS ──────────────────────────────────────────────────────────────
// @desc    Get audit logs (paginated, filterable by entity/action)
// @route   GET /api/admin/audit-log
// @access  Admin
router.get('/audit-log', protect, admin, asyncHandler(async (req, res) => {
  const page  = Math.max(Number(req.query.page)  || 1, 1);
  const limit = Math.max(Number(req.query.limit) || 20, 1);
  const skip  = (page - 1) * limit;

  const filter = {};
  if (req.query.entity) filter.entity = req.query.entity;
  if (req.query.action) filter.action = req.query.action;

  const [logs, total] = await Promise.all([
    AuditLog.find(filter).populate('user', 'name email').sort({ timestamp: -1 }).skip(skip).limit(limit),
    AuditLog.countDocuments(filter),
  ]);

  res.json({ logs, page, pages: Math.ceil(total / limit), total });
}));

module.exports = router;
