const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name:    { type: String, required: true },
  image:   { type: String },
  qty:     { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
  price:   { type: Number, required: true, min: 0 },
});

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  orderItems: [orderItemSchema],
  shippingAddress: {
    address:    { type: String, required: true },
    city:       { type: String, required: true },
    postalCode: { type: String, required: true },
    country:    { type: String, required: true },
  },
  paymentResult: {
    id:            String,
    status:        String,
    update_time:   String,
    email_address: String,
  },
  itemsPrice:     { type: Number, required: true, min: 0 },
  taxPrice:       { type: Number, required: true, min: 0 },
  shippingPrice:  { type: Number, required: true, min: 0 },
  totalPrice:     { type: Number, required: true, min: 0 },
  isPaid:         { type: Boolean, default: false },
  paidAt:         Date,
  isDelivered:    { type: Boolean, default: false },
  deliveredAt:    Date,
  status: {
    type: String,
    enum: ['placed', 'paid', 'packed', 'shipped', 'delivered', 'cancelled'],
    default: 'placed',
  },
  idempotencyKey: { type: String, unique: true, sparse: true },
}, { timestamps: true });

// Compound index for querying a user's orders sorted by date
orderSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
