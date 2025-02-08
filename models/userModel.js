const mongoose = require('mongoose');
const findOrCreate = require('mongoose-findorcreate');
const crypto = require('crypto')

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: false,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true
    },
    password: {
        type: String,
        required: false,
    },
    googleId: { type: String, required: false },
    isBlocked: {
        type: Boolean,
        default: false,
    },
    isDeleted: {
        type: Boolean,
        default: false,
    },
    referralCode: {
        type: String,
        unique: true,
    },
    referredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
    }

}, { timestamps: true });


userSchema.plugin(findOrCreate);
userSchema.index({ username: 1, referralCode: 1 });

//pre save hook for creating unique refferal code 
userSchema.pre('save', async function (next) {
    if (!this.referralCode) {
        let referralCode;
        let isUnique = false;
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        function generateCustomReferralCode(length = 8) {
            return Array.from(crypto.randomBytes(length))
                .map(byte => characters[byte % characters.length])
                .join('');
        }
        // Ensure the generated code is unique
        while (!isUnique) {
            referralCode = generateCustomReferralCode();
            const existingUser = await mongoose.model('user').findOne({ referralCode });

            if (!existingUser) {
                isUnique = true;
            }
        }

        this.referralCode = referralCode;
    }
    next();
});
const Users = mongoose.model("user", userSchema)

module.exports = Users;