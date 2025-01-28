const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { v4: uuidv4 } = require('uuid');

const orderSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'user',
        required: true,
        index: true
    },
    orderNumber: {
        type: String,
        unique: true,
        required: true,
        default: () => {
            return `ORDER${uuidv4().slice(0, 8).toUpperCase()}`
        },
    },
    status: {
        type: String,
        enum: [
            'Pending',
            'Processing',
            'Shipped',
            'Out for delivery',
            'Delivered',
            'Partially Cancelled',
            'Cancelled',
        ],
        default: 'Pending',
    },

    products: [
        {
            productId: {
                type: Schema.Types.ObjectId,
                ref: "Products",
                required: true,
            },
            productName: { type: String, required: true },
            model: { type: String, required: true },
            price: { type: Number, required: true },
            discount: { type: Number, required: true },
            discountedPrice: { type: Number, required: true },
            category: { type: String, required: true },
            quantity: { type: Number, required: true, min: 1 },
            returnPeriod: { type: Number, required: true, min: 0 },
            warranty: { type: Number, required: true, min: 0 },
            images: { type: String, default: false },
            variant:{
                color: { type: String, required: true },
                storage: { type: String, required: false },
                additionalPrice: { type: Number, required: true, default: 0 },
            },
            status: {
                type: String,
                enum: [
                    "Processing",
                    "Shipped",
                    "Out for delivery",
                    "Delivered",
                    "Cancelled",
                    "Returned",
                ],
                default: "Processing",
            },
            deliveryDate: {
                type: Date,
                required: true,
            },
        },
    ],


    deliveryType: {
        type: String,
        enum: [
            "regular",
            "custom",
        ],
        required: true,
    },

    paymentMethod: {
        type: String,
        enum: [
            "cod",
            "online",
            "wallet",
        ],
        required: true,
    },

    paymentStatus: {
        type: String,
        enum: ["Pending", "Successful", "Refunded"],
        default: "Pending",
    },

    shippingAddress: {
        addressId: { type: mongoose.Schema.Types.ObjectId, ref: "address" },
        fullName: { type: String, trim: true },
        phone: { type: Number, trim: true },
        addressLine1: { type: String, trim: true },
        addressLine2: { type: String, trim: true },
        landmark: { type: String, trim: true },
        city: { type: String, trim: true },
        state: { type: String, trim: true },
        pincode: { type: String, trim: true },
        addressType: { type: String, trim: true },
    },
    originalTotal: { type: Number, required: true },
    subTotal: { type: Number, required: true },
    totalSavings: { type: Number, required: true },
    deliveryCharge: { type: Number, required: true },
    tax: { type: Number, required: true },
    total: { type: Number, required: true },
    orderDate: { type: Date, default: Date.now },
    deliveryDate: { type: Date, required: true },
    shippedDate: { type: Date, required: false },
    deliveredDate: { type: Date, required: false },
},
    { timestamps: true });


orderSchema.index({ userId: 1, orderDate: -1 });

module.exports = mongoose.model('order', orderSchema);