
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

const loadProductsPage = async (req, res) => {
    try {
        const category = req.params.category;
        
        if(category==="all"){
            const products = await productsDB.find({});
            return res.render("user/products", { title: 'Products', products, category });
        }
        const products = await productsDB.find({ category: category });
      
        
        res.render("user/products", { title: 'Products', products, category });

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


module.exports = { loadHome, loadProductsPage, getProductsDetails, googleLogin, }