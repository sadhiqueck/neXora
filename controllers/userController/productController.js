const Users = require('../../models/userModel')
const productsDB = require("../../models/productModel")
const Cart = require('../../models/cartModel');

const loadProductsPage = async (req, res) => {
    try {
        const category = req.params.category;
        let products;

        if (category === "all") {
            products = await productsDB.find({ isDeleted: false });
        } else {
            products = await productsDB.find({ isDeleted: false, category: category });
        }

        if (req.session.user) {
            const userId = req.session.user._id;
            const userCart = await Cart.findOne({ 
                userId,
                isOrdered: false 
            });

           
            const cartProductIds = new Set();
            if (userCart) {
                userCart.products.forEach(item => {
                    cartProductIds.add(item.productId.toString());
                });
            }

           
            const productsWithCartStatus = products.map(product => {
                const productObj = product.toObject();
                productObj.inCart = cartProductIds.has(product._id.toString());
                return productObj;
            });

            return res.render("user/products", { 
                title: 'Products', 
                products: productsWithCartStatus, 
                category, 
            });
        }

        res.render("user/products", { 
            title: 'Products', 
            products, 
            category,
        });

    } catch (error) {
        console.error("Error loading products page:", error);
        res.status(500).send("An error occurred while loading the products page. Please try again later.");
    }
};

const getProductsDetails = async (req, res) => {
    try {
        const productId = req.params.id;
        const product = await productsDB.findById(productId);

        if (!product) {
            return res.status(404).json({ message: "product not found!" });
        }

        const activeVariants = product.variants.filter(variant => variant.status === 'active');

        //  unique colors
        const colors = [...new Map(activeVariants.map(variant =>
            [variant.color.toLowerCase(), {
                color: variant.color,
                colorCode: variant.colorCode
            }]
        )).values()];

        // unique storage combinations
        const storages = [...new Map(activeVariants.map(variant =>
            [`${variant.storage}${variant.storageUnit}`, {
                storage: variant.storage,
                storageUnit: variant.storageUnit,
                additionalPrice: variant.additionalPrice,
                stock: variant.stock,
                stockStatus: variant.stockStatus
            }]
        )).values()];

        //  related products
        let relatedProducts = await productsDB.find({
            category: product.category,
            _id: { $ne: productId },
        }).limit(4);

        if (req.session.user) {
            const userId = req.session.user._id;
            const userCart = await Cart.findOne({ 
                userId,
                isOrdered: false
            });

            //  Set of cart product ids
            const cartProductIds = new Set();
            if (userCart) {
                userCart.products.forEach(item => {
                    cartProductIds.add(item.productId.toString());
                });
            }

           
            const productWithCart = product.toObject();
            productWithCart.inCart = cartProductIds.has(product._id.toString());

            relatedProducts = relatedProducts.map(relProduct => {
                const relProductObj = relProduct.toObject();
                relProductObj.inCart = cartProductIds.has(relProduct._id.toString());
                return relProductObj;
            });

            return res.render('user/product_details', {
                title: 'Product_details',
                product: productWithCart,
                relatedProducts,
                colors,
                storages,
            });
        }

        res.render('user/product_details', {
            title: 'Product_details',
            product,
            relatedProducts,
            colors,
            storages,
        });

    } catch (error) {
        console.error("Error fetching product details:", error);
        res.status(500).render('error', { message: 'Something went wrong!' });
    }
};

module.exports = { getProductsDetails,loadProductsPage};