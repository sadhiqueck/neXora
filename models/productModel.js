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
  variants: [
    {
      color: { type: String, required: false },
      storage: { type: String, required: false },
      additionalPrice: { type: Number, default: 0 },
      stock: { type: Number, required: true, default: 0 },
      // images: { type: [String], default: [] }, avoiding now because of complexity
    },
  ],
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
    required: false,
  },
  images: {
    type: [String],
    required: true,
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