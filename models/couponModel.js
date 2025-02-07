const mongoose= require('mongoose')

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    discountType: {
      type: String,
      required: true,
      enum: ['percentage', 'fixed'], 
      default: 'percentage',
    },
    value: {
      type: Number,
      required: true,
      min: 0,
    },
    maxDiscount: {
      type: Number,
      min: 0,
      default: null, 
    },
    minPurchase: {
      type: Number,
      min:0,
      default: 0,
    },
    expiryDate: {
      type: Date,
      required: true,
      validate: {
        validator: function (value) {
          return value > Date.now(); // Ensure expiry date is in the future
        },
        message: 'Expiry date must be in the future',
      },
    },
    usageLimit: {
      type: Number,
      min: 1,
      default: 1, 
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    applicableTo: {
      type: String,
      enum: ['all', 'specific'],
      default: 'all',
    },
    categories: [
      {
        type: String, 
      },
    ],
    isActive: {
      type: Boolean,
      default: true, 
    },
  },
  { timestamps: true } 
);

// Middleware to update expired coupons
couponSchema.post('init', async function () {
  if (this.expiryDate < Date.now() && this.isActive) {
    await this.updateOne({ isActive: false});
  }
});

couponSchema.index({ code: 1, expiryDate: 1, active: 1 });

//to convert code to uppercase
couponSchema.pre('save', function (next) {
  this.code = this.code.toUpperCase();
  next();
});

//Static method to check if a coupon is valid
couponSchema.statics.isValidCoupon = async function (code, userId) {
  const coupon = await this.findOne({
    code,
    isActive: true,
    expiryDate: { $gt: Date.now() },
    usedCount: { $lt: '$usageLimit' },
  });

  if (!coupon) {
    throw new Error('Invalid or expired coupon');
  }

  return coupon;
};

const Coupon = mongoose.model('Coupon', couponSchema);

module.exports=Coupon;