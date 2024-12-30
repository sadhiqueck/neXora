const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const cartSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    products: [
        {
            productId: {
                type: Schema.Types.ObjectId,
                ref: 'Products', 
                required: true
            },
            quantity: {
                type: Number,
                required: true,
                min: 1
            },
            price: {
                type: Number,
                required: false 
            },
            discount: {
                type: Number, // Discount percentage
                default: 0
            },
        }
    ],
    orderSummary: {
        totalItems: {
            type: Number,
            required: false
        },
        subtotal: {
            type: Number,
            required: false
        },
        deliveryCharge: {
            type: Number, 
            default: 0
        },
        totalSavings: {
            type: Number,
            required: false,
        },
        tax:{
            type:Number,
            required:false, 
        },

        totalAmount: {
            type: Number, 
            required: false
        }
    },
    isOrdered: {
        type: Boolean,
        default: false,
    },
}, {timestamps: true}

);

module.exports = mongoose.model('cart', cartSchema);
