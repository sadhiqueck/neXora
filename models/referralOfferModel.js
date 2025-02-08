const mongoose = require('mongoose');

const referralOfferSchema = new mongoose.Schema({
    
    referralBonus:{
        type:Number,
        default:220
    },
    refereeBonus:{
        type:Number,
        default:100
    }
})

module.exports= mongoose.model('ReferralOffer',referralOfferSchema)