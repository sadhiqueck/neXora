const Users = require('../../models/userModel')
const productsDB = require("../../models/productModel")


const loadProductsPage = async (req, res) => {
    try {
        const category = req.params.category;

        if (category === "all") {
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

module.exports = { getProductsDetails, loadProductsPage }