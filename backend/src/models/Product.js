const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  sku: { type: String, unique: true, sparse: true, trim: true },
  name: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true, min: 0 },
  countInStock: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
  image: { type: String },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  brand: { type: String },
  rating: { type: Number, default: 0 },
  numReviews: { type: Number, default: 0 },
  variants: [{ name: String, options: [String] }],
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// text index for search
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ category: 1, isActive: 1 });

module.exports = mongoose.model('Product', productSchema);
