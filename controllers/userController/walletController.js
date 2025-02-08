const Wallet = require('../../models/walletModel');
const Users = require('../../models/userModel');
const ReferralHistory= require('../../models/referralHIstoryModel')

const getWallet = async (req, res) => {

    try {
        const user = req.session.user._id;

        if (!user) {
            res.redirect('/user/login')
        }
        const walletData = await Wallet.findOne({ user });
         if (walletData && walletData.transactions) {
                    walletData.transactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                }

        if (!walletData) {
            const newWallet = new Wallet({
                user: user,
                balance: 0,
                transactions: []
            });
            await newWallet.save();
            return res.render('user/wallet', {
                title: "Wallet",
                wallet: newWallet,
                razorpayKey:process.env.RAZORPAY_KEY_ID
            });
        }

         const referralHistory = await ReferralHistory.find({ referrer: user })
                    .populate('referee', 'username email')
                    .sort({ createdAt: -1 });
        
                const totalReferralEarnings = referralHistory?.reduce((total, val) => {
                    return total + val.referralBonus;
                }, 0)
          
                const totalReferal=referralHistory?.length

        res.render('user/wallet', {
            title: "Wallet",
            wallet: walletData,
            razorpayKey:process.env.RAZORPAY_KEY_ID,
            totalReferal,
            totalReferralEarnings
        });

    } catch (error) {
        console.error("Error in getWallet:", error);
        res.status(500).render('error', {
            title: "Error",
            message: "Something went wrong while fetching wallet data"
        });
    }
}

const addTransaction = async (req, res,next) => {
    try {
        const amount = Number(req.body.total);
        const user = req.session.user._id;
        const MaxLimit=250000

         let wallet = await Wallet.findOne({ user });
    
        if (!wallet) {
            wallet = new Wallet({
                user,
                balance: 0,
                transactions: [],
            });
        }
  
        const currentBalance = wallet.balance;

        if (currentBalance + amount > MaxLimit) {
            return res.status(400).json({
                error: `Cannot add ₹${amount}. Maximum wallet balance allowed is ₹2.5 lakhs. You can add up to ₹${MaxLimit - currentBalance}`
            });
        }

    } catch (error) {
        res.status(500).json({ message: 'Transaction failed', error: error.message });
    }
    next();
};

module.exports = { getWallet, addTransaction }