const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  productName: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  discount: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  category: {
    type: String,
    required: true,
  },
  categoryId: {
    type: mongoose.Types.ObjectId,
    ref: 'Category',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  description: {
    type: String,
    required: true,
  },
  brand: {
    type: String,
    required: true,
  },
  model: {
    type: String,
    required: true,
  },
  platform: {
    type: String,
    required: true,
  },

  additional: {
    type: String,
    required: true,
  },
  returnPeriod: {
    type: Number,
    required: true,
    min: 0
  },
  warranty: {
    type: Number,
    required: true,
    min: 0
  },
  qauntity: {
    type: Number,
    required: true,
  },
  images: {
    type: [String],
    default: false,
  },
  discountedPrice: {
    type: Number,
    required: true,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

module.exports = mongoose.model("Products", productSchema)