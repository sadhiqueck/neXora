const Users= require('../models/userModel')
const Cart = require('../models/cartModel');

const authsession = async (req, res, next) => {
    try {
        if (req.session.user) {
            // Check if the user is blocked
            const user = await Users.findById(req.session.user._id);
            if (user && (user.isBlocked || user.isDeleted)) {
                req.session.user=null;
                req.session.isLoggedIn=false;
                return res.redirect('/user/login');
            }
            next();
        } else {
            res.redirect('/user/login');
        }
    } catch (error) {
        console.error("Error in authsession middleware:", error);
        res.redirect('/user/home'); 
    }
};


const isLogin = (req, res, next) => {
    if (req.session.user) {
        return res.redirect('/user/home'); // Redirect to home if already logged in
    }
    next(); // Proceed if not logged in
};

const checkoutAccess = (req, res, next) => {
    if (req.session.checkoutAccess) {
        next();
    }
    else {
        res.redirect('/user/home');
    }
}

async function loginStatus(req, res, next) {
    res.locals.isLoggedIn = req.session.isLoggedIn || false;
    res.locals.user = req.session.user || null;

    if (res.locals.isLoggedIn) {
        try {
            const userId = req.session.user._id;
            const cart = await Cart.findOne({ userId });
            res.locals.cartItemCount = cart ? cart.products.reduce((total, product) => total + product.quantity, 0) : 0;
        } catch (error) {
            console.error("Error in loginStatus middleware:", error);
            res.locals.cartItemCount = 0;

        }
    }
    else {
        res.locals.cartItemCount = 0;
    }

    next();
}


const validateResetFlow = (req, res, next) => {
    if (!req.session.resetFlow) {
        return res.redirect('/user/login');
    }
    next();
};

module.exports = { authsession, loginStatus, isLogin, checkoutAccess,validateResetFlow }