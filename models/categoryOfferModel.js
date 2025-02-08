const mongoose = require('mongoose');

const categoryOfferSchema = new mongoose.Schema({
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'categories',
        required: true
    },
    discountPercentage: {
        type: Number,   
        required: true,
        min: 0,
        max: 100,
    },
    expiryDate: {
        type: Date,
        required: true,
    },
  isActive: {
    type: Boolean,
    default: true
  },
});

categoryOfferSchema.index({ categoryId: 1, expiryDate: -1 });

module.exports = mongoose.model('CategoryOffer', categoryOfferSchema);   
