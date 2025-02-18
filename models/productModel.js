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
  discountedPrice: {
    type: Number,
    required: true,
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
  totalStock: {
    type: Number,
    default: 0,
    required: true
  },
  variants: [
    {
      color: { type: String, required: false },
      colorCode: { type: String, required: true },
      storage: { type: String, required: false },
      storageUnit: {type: String, required: false},
      additionalPrice: { type: Number, default: 0 },
      stock: { type: Number, required: true, default: 0 },
      status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active',
      },
      // images: { type: [String], default: [] }, avoiding now because of complexity,can implement if necessary
      lowStockThreshold: {
        type: Number,
        default: 5
      },
      stockStatus: {
        type: String,
        enum: ['low', 'out', 'normal'],
        default: 'normal',
      },
    }

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
  totalStock: {
    type: Number,
    default: 0,
    required: true
  },
  images: {
    type: [String],
    required: true,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },

}, { timestamps: true });


// middleware to calculate totalStock

productSchema.pre('save', function(next) {
  this.totalStock = this.variants.reduce((total, variant) => {
    return total + (variant.status === 'active' ? variant.stock : 0);
  }, 0);
  next();
});

productSchema.pre('save', function(next) {
  this.variants.forEach(variant => {
    if (variant.color) {
      variant.color = variant.color.charAt(0).toUpperCase() + variant.color.slice(1).toLowerCase();
    }
  });
  next();
});

productSchema.index({ category: 1, discountedPrice: 1, discount: 1,brand: 1  });
productSchema.index({ productName: 'text' });
productSchema.index({ totalStock: 1 });


module.exports = mongoose.model("Products", productSchema)