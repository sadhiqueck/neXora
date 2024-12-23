const express = require('express');
const router = express.Router();
const {loadHome, loadProductsPage, getProductsDetails, googleLogin } = require('../controllers/userController/userController');
const { sendOTP, resendOtp } = require('../controllers/userController/otpController')
const { signup,login} = require('../controllers/userController/authController');
const { authsession, isLogin } = require("../middleware/userAuth")
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

// signup pages

router.get('/login',isLogin, (req, res) => {
    res.render('user/login', { title: 'User_login' })
})
router.get('/signup',isLogin, (req, res) => {
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





module.exports = router