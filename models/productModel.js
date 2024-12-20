const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  productName: {
    type: String,
    require: true,
  },
  price: {
    type: Number,
    require: true,
  },
  discount: {
    type: Number,
    require: true,
  },
  category: {
    type: String,
    require: true,
  },
  categoryId: {
    type: mongoose.Types.ObjectId,
    ref:'Category',
    require: true,
  },
  quantity: {
    type: Number,
    require: true,
  },
  description: {
    type: String,
    require: true,
  },
  brand: {
    type: String,
    require: true,
  },
  model: {
    type: String,
    require: true,
  },
  platform: {
    type: String,
    require: true,
  },

  additional: {
    type: String,
    require: true,
  },
  returnPeriod: {
    type: Number,
    require: true,
  },
  warranty: {
    type: Number,
    require: true,
  },
  qauntity: {
    type: Number,
    require: true,
  },
  images: {
    type: [String],
    default: false,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

module.exports = mongoose.model("Products", productSchema)