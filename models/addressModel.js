const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const AddressSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    fullName: { type: String, required: true },
    phone: { type: Number, required: true },
    addressLine1: { type: String, required: true },
    addressLine2: { type: String, required: true },
    landmark: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    addressType: { type: String, required: true },
    isDefault: { type: Boolean, default: false },
}, { timestamps: true });

AddressSchema.index({ userId: 1 });


const Address = mongoose.model('address', AddressSchema);
module.exports = Address;