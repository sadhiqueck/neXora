const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const cartSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    products: [{
        productId: {
            type: Schema.Types.ObjectId,
            ref: 'Products',
            required: true
        },
        quantity: {
            type: Number,
            required: true,
        },
        variantDetails: {
            color: String,
            storage: String,
            additionalPrice: Number
        }
    }],
    isOrdered: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = mongoose.model('cart', cartSchema);
