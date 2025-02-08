const mongoose= require('mongoose')

const referralHistorySchema = new mongoose.Schema({
    referrer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true,
    },
    referee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true,
    },
    referralBonus: {
        type: Number,
        required: true,
    },
    refereeBonus: {
        type: Number,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports= mongoose.model('ReferralHistory',referralHistorySchema)