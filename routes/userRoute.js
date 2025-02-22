const express = require('express');
const router = express.Router();
const statusCodes = require('../utils/statusCodes');
const AppError = require('../utils/errors/AppError');

const { loadHome, loadUserProfile, updateName, loadAddressprofile,
    updateAddress, profileAddAddress, deleteAddress, LoadChangePassword,
    updatePassword } = require('../controllers/userController/userController');
const { searchResultApi } = require('../controllers/userController/searchController');
const { loadProductsPage, getProductsDetails } = require('../controllers/userController/productController');
const { sendOTP, resendOtp, sendresetOtp,LoadOtpVerifyPage } = require('../controllers/userController/otpController')
const { signup, login, googleLogin, logout, forgotPassword, loadResetOtpPage, resetPassword } = require('../controllers/userController/authController');
const { loadCart, addToCart, productDetailsaddToCart, removeFromCart, updateCart } = require('../controllers/userController/cartController');
const { loadAddress, addAddress, loadShippingMethod,
    saveDeliveryMethod, shippingMethod } = require('../controllers/userController/checkoutController');

const { loadPaymentPage, placeOrder, orderSuccess, verifyPayment,
    createRazorpayOrder, verifyWalletPayment, handlePaymentFailure, retryPayment, verifyRetryPayment } = require('../controllers/userController/paymentController')

const { loadOrder, loadOrderDetails, cancelItem, cancelOrder, returnOrder, returnItem, getInvoice } = require('../controllers/userController/orderController');
const { addTransaction, getWallet } = require('../controllers/userController/walletController');
const { getWishlist, toggleWishlist, removeFromWishlist, moveAllToCart } = require('../controllers/userController/wishlistController')
const { validateCoupon } = require('../controllers/adminController/couponController')
const { getRefferalPage, verifyReferralCode } = require('../controllers/userController/offerController')
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

// middlewares
const { isLogin, authsession, checkoutAccess, validateResetFlow,validateSignupFlow, redirectionUrl } = require("../middleware/userAuth");
const { validateProductsFilter } = require('../middleware/validateProductFilter')
const { stockStatusValidation,cartVersionValidation } = require('../middleware/checkoutValidation')


// signup pages

router.get('/login', isLogin, (req, res) => {
    const sccsmssg = req.query;
    res.render('user/login', { title: 'User_login', sccsmssg })
})
router.get('/signup', isLogin, (req, res) => {
    res.render('user/signup', { title: 'User_signup' })
})

router.post('/login', login)
router.post('/send-otp', isLogin, sendOTP);
router.get('/verify-otp', isLogin,validateSignupFlow, LoadOtpVerifyPage);
router.post('/verify-otp', isLogin, signup);
router.post('/resend-otp', isLogin, resendOtp);
router.get('/logout', authsession, logout)
// forgot password
router.get('/forgot-password', forgotPassword)
router.post('/forgot-password', sendresetOtp);
router.get('/otp-verify', validateResetFlow, loadResetOtpPage)
router.post('/forgot/verify-otp', validateResetFlow, resetPassword)

// google signup

router.get('/auth/google', redirectionUrl, passport.authenticate('google', { scope: ['profile', 'email'] }));

// Callback route after Google authentication   
router.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/user/signup', session: true }), googleLogin);


//default access
router.get('/home', loadHome); // home page

// API endpoint for live search 
router.get('/api/search', searchResultApi);

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
router.post('/place-order', authsession, checkoutAccess,cartVersionValidation, placeOrder)
router.get('/order-success', authsession, checkoutAccess, orderSuccess)
router.post('/handle-payment-failure', authsession, handlePaymentFailure);
router.post('/retry-payment', authsession, retryPayment);
// router.post('cartVersion-validation', authsession, checkoutAccess, cartVersionValidation)
// validate coupon
router.post('/coupon-validate', authsession, checkoutAccess, validateCoupon)

// razorpay
router.post('/create-razorpay-order', authsession, checkoutAccess, stockStatusValidation,cartVersionValidation, createRazorpayOrder);
router.post('/verify-payment', authsession, checkoutAccess, verifyPayment);
router.post('/verify-retryPayment', authsession, verifyRetryPayment)

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
router.get('/order/:orderId/invoice', authsession, getInvoice);


// Wallet
router.get('/wallet', authsession, getWallet)
router.post('/wallet/create-razorpay-order', authsession, addTransaction, createRazorpayOrder);
router.post('/wallet/verify-payment', authsession, verifyWalletPayment);


// wishlist
router.get('/wishlist', authsession, getWishlist)
router.post('/wishlist/:productId', authsession, toggleWishlist);
router.delete('/wishlist/:productId', authsession, removeFromWishlist);
router.post('/moveAlltoCart', authsession, moveAllToCart);

// refferal
router.get('/referral', authsession, getRefferalPage)
router.post('/verify-referral', verifyReferralCode)


module.exports = router