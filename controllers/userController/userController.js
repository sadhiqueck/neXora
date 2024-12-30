
const Users = require('../../models/userModel')
const bcrypt = require('bcrypt');
const productsDB = require("../../models/productModel")




const googleLogin = async (req, res) => {
    try {

        const products = await productsDB.find({});
        req.session.isLoggedIn = true;
        req.session.user = req.user

        return res.redirect('/user/home');
    } catch (error) {
        console.error("Error during Google login:", error);
        res.render('user/login', {
            title: 'Login',
            mssg: "An error occurred, please try again."
        });
    }
};





const loadHome = async (req, res) => {
    try {
        if (req.session.isLoggedIn) {
            const products = await productsDB.find({})
            return res.render("user/home", { title: 'HomePage', products })
        } else {
            const products = await productsDB.find({});
            return res.render("user/home", { title: 'HomePage', products });
        }
    }

    catch (error) {
        console.error("Error loading home page:", error);
        res.status(500).render('error', { message: 'Something went wrong!' });

    }
}


module.exports = { loadHome, googleLogin, }