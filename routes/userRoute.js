const express = require('express');
const router = express.Router();
const { loadHome, loadUserProfile, updateName, loadAddressprofile,
    updateAddress, profileAddAddress, deleteAddress } = require('../controllers/userController/userController');
const { loadProductsPage, getProductsDetails } = require('../controllers/userController/productController');
const { sendOTP, resendOtp } = require('../controllers/userController/otpController')
const { signup, login, googleLogin } = require('../controllers/userController/authController');
const { isLogin, authsession, checkoutAccess } = require("../middleware/userAuth");
const { loadCart, addToCart, removeFromCart, updateCart } = require('../controllers/userController/cartController');
const { loadAddress, addAddress, loadShippingMethod, saveDeliveryMethod,
    shippingMethod, loadPaymentPage, placeOrder, orderSuccess } = require('../controllers/userController/checkoutController');
const { loadOrder, loadOrderDetails,cancelItem, cancelOrder } = require('../controllers/userController/orderController');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const sharp = require('sharp')

// signup pages

router.get('/login', isLogin, (req, res) => {
    res.render('user/login', { title: 'User_login' })
})
router.get('/signup', isLogin, (req, res) => {
    res.render('user/signup', { title: 'User_signup' })
})



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
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.redirect('/user/login');
    });
});

// product page

router.get('/products/:category', loadProductsPage)

router.get('/product/:id', getProductsDetails)


// cart page
router.get('/cart', authsession, loadCart)
router.post('/cart/add/:id', authsession, addToCart)
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
router.get('/order-success/', authsession, checkoutAccess, orderSuccess)

// user dashboard

router.get('/profile', authsession, loadUserProfile)
router.post('/update-name', authsession, updateName)


//Profile address

router.get('/profile-address', authsession, loadAddressprofile)
router.post('/profile-addAddress', authsession, profileAddAddress)
router.post('/update-address', authsession, updateAddress)
router.post('/address-delete/:id', authsession, deleteAddress)

// Orders

router.get('/orders', authsession, loadOrder)

router.get('/order-details/:orderId', authsession, loadOrderDetails)

router.post('/order/cancel-item',cancelItem);

// entire order cancel
router.post('/order/cancel',cancelOrder)


module.exports = router