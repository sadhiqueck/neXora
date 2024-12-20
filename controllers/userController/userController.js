
const Users = require('../../models/userModel')
const bcrypt = require('bcrypt');
const productsDB = require("../../models/productModel")


const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await Users.findOne({ email })

        if (!user) return res.render('user/login', { title: 'Login_Page', mssg: "User not found!!" })

        if (user.isBlocked || user.isDeleted) return res.render('user/login', { title: 'Login_Page', mssg: "You have no access!!" })

        const isMatch = await bcrypt.compare(password, user.password);

        if (isMatch) {
            req.session.user = user;
            req.session.isLoggedIn = true;
            const products = await productsDB.find({})
            return res.redirect('/user/home')
        } else {
            return res.render('user/login', { title: 'HomePage', mssg: "Incorrect password!, Please try again" })
        }

    } catch (error) {
        console.log(error);
        res.render('user/login', { title: 'HomePage', mssg: "An error occurred, please try again." });
    }
}

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

const loadProductsPage = async (req, res) => {
    try {
        // const isLoggedIn = req.session.user ? true : false;
        const products = await productsDB.find({});
        // const user = isLoggedIn ? req.session.user : null;

        res.render("user/products", { title: 'Products', products });
    } catch (error) {
        console.error("Error loading products page:", error);
        res.status(500).send("An error occurred while loading the products page. Please try again later.");
    }
};

const getProductsDetails = async (req, res) => {
    try {
        const productId = req.params.id;
        const product = await productsDB.findById(productId);

        const relatedProducts = await productsDB.find({
            category: product.category,
            _id: { $ne: productId },
        }).limit(4);


        if (!product) return res.status(404).json({ message: "product not found!" });

        res.render('user/product_details', { title: 'Product_details', product, relatedProducts });

    } catch (error) {

        console.error("Error fetching product details:", error);
        res.status(500).render('error', { message: 'Something went wrong!' });
    }
}


module.exports = { login, loadHome, loadProductsPage, getProductsDetails, googleLogin,  }