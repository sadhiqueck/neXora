const express = require('express');
const router = express.Router();
const { loadHome, loadUserProfile, updateName, loadAddressprofile,
    updateAddress, profileAddAddress, deleteAddress, LoadChangePassword,
    updatePassword } = require('../controllers/userController/userController');
const { loadProductsPage, getProductsDetails } = require('../controllers/userController/productController');
const { sendOTP, resendOtp, sendresetOtp } = require('../controllers/userController/otpController')
const { signup, login, googleLogin, logout, forgotPassword, loadResetOtpPage, resetPassword } = require('../controllers/userController/authController');
const { loadCart, addToCart, productDetailsaddToCart, removeFromCart, updateCart } = require('../controllers/userController/cartController');
const { loadAddress, addAddress, loadShippingMethod,
    saveDeliveryMethod, shippingMethod } = require('../controllers/userController/checkoutController');
const { loadPaymentPage, placeOrder, orderSuccess, verifyPayment, createRazorpayOrder, verifyWalletPayment } = require('../controllers/userController/paymentController')
const { loadOrder, loadOrderDetails, cancelItem, cancelOrder, returnOrder, returnItem } = require('../controllers/userController/orderController');
const { addTransaction, getWallet } = require('../controllers/userController/walletController');
const { getWishlist, addToWishlist, removeFromWishlist, moveAllToCart } = require('../controllers/userController/wishlistController')
const { validateCoupon } = require('../controllers/adminController/couponController')
const { getRefferalPage, verifyReferralCode } = require('../controllers/userController/offerController')
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

// middlewares
const { isLogin, authsession, checkoutAccess, validateResetFlow } = require("../middleware/userAuth");
const { validateProductsFilter } = require('../middleware/validateProductFilter')
const { stockStatusValidation } = require('../middleware/stockValidation')


// signup pages

router.get('/login', isLogin, (req, res) => {
    const sccsmssg = req.query;
    res.render('user/login', { title: 'User_login', sccsmssg })
})
router.get('/signup', isLogin, (req, res) => {
    res.render('user/signup', { title: 'User_signup' })
})

router.get('/forgot-password', forgotPassword)
router.post('/forgot-password', sendresetOtp);
router.get('/otp-verify', validateResetFlow, loadResetOtpPage)
router.post('/forgot/verify-otp', validateResetFlow, resetPassword)


// google signup

router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Callback route after Google authentication   
router.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/user/signup' }), googleLogin);


// home page

//default access
router.get('/home', loadHome);
router.post('/home', login)
router.post('/send-otp', isLogin, sendOTP);
router.post('/verify-otp', isLogin, signup);
router.post('/resend-otp', isLogin, resendOtp);
router.get('/logout', authsession, logout)

// product page
router.get('/products/:category', validateProductsFilter, loadProductsPage)
router.get('/product/:id', getProductsDetails)


// cart page
router.get('/cart', authsession, loadCart)
router.post('/cart/add', authsession, addToCart)
router.post('/cart/:productId/add', authsession, productDetailsaddToCart)
router.post('/cart/remove/:id', authsession, removeFromCart)
router.post('/cart/update', authsession, updateCart)
router.post('/selectAddress', authsession, loadAddress)
// checkout pages

// address page
router.get('/selectAddress', authsession, checkoutAccess, loadAddress)
router.post('/addAddress', authsession, addAddress)
router.post('/select-address', authsession, loadShippingMethod)


// shipping method
router.get('/shipping', authsession, checkoutAccess, shippingMethod);
router.post('/save-delivery', authsession, saveDeliveryMethod)

// payment page
router.get('/payment', authsession, checkoutAccess, loadPaymentPage)
router.post('/place-order', authsession, checkoutAccess, placeOrder)
router.get('/order-success', authsession, checkoutAccess, orderSuccess)

// validate coupon
router.post('/coupon-validate', authsession, checkoutAccess, validateCoupon)

// razorpay
router.post('/create-razorpay-order', authsession, checkoutAccess, stockStatusValidation, createRazorpayOrder);
router.post('/verify-payment', authsession, checkoutAccess, verifyPayment);

// user dashboard
router.get('/profile', authsession, loadUserProfile)
router.post('/update-name', authsession, updateName)
router.get('/change-password', authsession, LoadChangePassword)
router.post('/update-password', authsession, updatePassword)


//Profile address

router.get('/profile-address', authsession, loadAddressprofile)
router.post('/profile-addAddress', authsession, profileAddAddress)
router.post('/update-address', authsession, updateAddress)
router.post('/address-delete/:id', authsession, deleteAddress)

// Orders

router.get('/orders', authsession, loadOrder)
router.get('/order-details/:orderId', authsession, loadOrderDetails)
router.post('/order/cancel-item', authsession, cancelItem);
router.post('/order/cancel', authsession, cancelOrder)// entire order cancel
router.post('/order/return', authsession, returnOrder)
router.post('/order/return-item', authsession, returnItem)

// Wallet
router.get('/wallet', authsession, getWallet)
router.post('/wallet/create-razorpay-order', authsession, addTransaction, createRazorpayOrder);
router.post('/wallet/verify-payment', authsession, verifyWalletPayment);


// wishlist
router.get('/wishlist', authsession, getWishlist)
router.post('/wishlist/:productId', authsession, addToWishlist);
router.delete('/wishlist/:productId', authsession, removeFromWishlist);
router.post('/moveAlltoCart', authsession, moveAllToCart);

// wallet
router.get('/referral', authsession, getRefferalPage)
router.post('/verify-referral', verifyReferralCode)

module.exports = router