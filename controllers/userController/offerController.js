
const User = require('../../models/userModel')
const ReferralHistory = require('../../models/referralHIstoryModel')
const ReferralOffer = require('../../models/referralOfferModel');
const categoryOfferModel = require('../../models/categoryOfferModel');

const getRefferalPage = async (req, res) => {
    const userId = req.session.user._id
    try {
        const referralOffers = await ReferralOffer.findOne({})

        const referralBonus = referralOffers.referralBonus;
        const refereeBonus = referralOffers.refereeBonus;

        const referralHistory = await ReferralHistory.find({ referrer: userId })
            .populate('referee', 'username email')
            .sort({ createdAt: -1 });

        const totalEarnings = referralHistory.reduce((total, val) => {
            return total + val.referralBonus;
        }, 0)

        const totalReferal = referralHistory.length


        res.render('user/refferal', { title: "Refferal Page", referralBonus, refereeBonus, referralHistory, totalEarnings, totalReferal });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

const verifyReferralCode = async (req, res) => {
    try {

        const { referralCode } = req.body;

        const user = await User.findOne({ referralCode: referralCode.toUpperCase() });
        if (user) {
            res.status(200).json({ valid: true, message: "Referral code is valid." });
        } else {
            res.status(404).json({ valid: false, message: "Referral code not found." });
        }

    } catch (error) {
        console.log(error)
    }
}

module.exports = {
    getRefferalPage,
    verifyReferralCode
};
