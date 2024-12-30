const express = require('express');
const router = express.Router();
const { loadHome, googleLogin } = require('../controllers/userController/userController');
const { loadProductsPage, getProductsDetails } = require('../controllers/userController/productController');
const { sendOTP, resendOtp } = require('../controllers/userController/otpController')
const { signup, login } = require('../controllers/userController/authController');
const { isLogin, authsession } = require("../middleware/userAuth");
const { loadCart, addToCart, removeFromCart, updateCart } = require('../controllers/userController/cartController');
const { checkoutAddress } = require('../controllers/userController/checkoutAddress')
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

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
router.post('/cart/update', updateCart)
router.post('/cart/checkout', checkoutAddress)


// address page
router.get('/address', (req, res) => {
    res.render('user/address', { title: 'Address' })
});

// shipping method
router.get('/ship-method', (req, res) => {
    res.render('user/shippingMethod', { title: 'Shipping_Method' })
});

// payment page
router.get('/payment', (req, res) => {
    res.render('user/payment', { title: 'Payment_Page' })
});

// user dashboard

router.get('/dashboard', (req, res) => {
    res.render('user/user_dashboard', { title: 'User_dashboard' })
});


module.exports = router