const Users = require('../../models/userModel')
const productsDB = require("../../models/productModel")
const mongoose = require('mongoose')
const Cart = require('../../models/cartModel');
const categoriesDB = require('../../models/categoryModel');
const Wishlist = require('../../models/wishListModel');
const calculateEffectivePrice = require('../../utils/EffectivePriceCalculator')
const CategoryOffer = require('../../models/categoryOfferModel')


const loadProductsPage = async (req, res) => {
    try {
        const category = req.params.category;
        const page = parseInt(req.query.page) || 1;
        const limit = 12;
        const skip = (page - 1) * limit;
        const {
            search = '',
            minPrice,
            maxPrice,
            brand,
            discount,
            selectedcategories,
            sort = '',
            availability
        } = req.query;


        let query = { isDeleted: false };


        if (selectedcategories && selectedcategories.length) {
            const categoryArray = Array.isArray(selectedcategories) ? selectedcategories : [selectedcategories];
            query.category = { $in: categoryArray };
        }

        // Add search filter
        if (search.trim()) {
            query.productName = { $regex: search, $options: 'i' };
        }

        // Add price range filter
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = parseFloat(minPrice);
            if (maxPrice) query.price.$lte = parseFloat(maxPrice);
        }

        if (brand) {
            query.brand = brand;
        }


        if (discount) {
            query.discount = { $gte: parseInt(discount) };
        }

        let sortQuery = {};
        switch (sort) {
            case 'price-asc':
                sortQuery = { price: 1 };
                break;
            case 'price-desc':
                sortQuery = { price: -1 };
                break;
            case 'discount':
                sortQuery = { discount: -1 };
                break;
            default:
                sortQuery = { createdAt: -1 };
        }


        const totalProducts = await productsDB.countDocuments(query);
        const totalPages = Math.ceil(totalProducts / limit);

        let products = await productsDB.find(query)
            .sort(sortQuery)
            .skip(skip)
            .limit(limit);

        const categories = await categoriesDB.find({ isDeleted: false });
        const brands = await productsDB.distinct('brand', { isDeleted: false });

        const categoryOffers = await CategoryOffer.find({
            expiryDate: { $gt: Date.now() }
        }).populate('categoryId', 'categoryName');

        const productsWithVariants = products.map(product => {
            const productObj = product.toObject();
            const variant=productObj.variants.filter(variant =>
                variant.status === 'active' && variant.stock > 0
            )
            const priceInfo = calculateEffectivePrice(product, categoryOffers,variant);

            return {
                ...productObj,
                discountedPrice: priceInfo.discountedPrice,
                effectiveDiscount: priceInfo.effectiveDiscountPercentage,
                hasCategoryOffer: priceInfo.isCategoryOffer,
                activeVariants:variant
            }
        });

        let filteredProducts = productsWithVariants;
        if (availability === 'in-stock') {
            filteredProducts = productsWithVariants.filter(product =>
                product.activeVariants && product.activeVariants.length > 0
            );
        }


        let finalProducts = filteredProducts;

        if (req.session.user) {
            const userId = req.session.user._id;
            const userCart = await Cart.findOne({
                userId,
            });
            // get wishlist
            const userWishlist = await Wishlist.findOne({ user: userId }).lean();
            const wishlistProductIds = new Set(userWishlist?.products.map(item => item.product.toString()) || []);
            const cartProductIds = new Set();

            if (userCart) {
                userCart.products.forEach(item => {
                    cartProductIds.add(item.productId.toString());
                });
            }


            finalProducts = filteredProducts.map(product => ({
                ...product,
                inCart: cartProductIds.has(product._id.toString()),
                isWishlisted: wishlistProductIds.has(product._id.toString())
            }));
        }


        res.render("user/products", {
            title: 'Products',
            products: finalProducts,
            category,
            categories,
            brands,
            pagination: {
                currentPage: page,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            },
            filters: {
                search,
                minPrice,
                maxPrice,
                brand,
                discount,
                sort,
                selectedcategories,
                availability
            }
        });

    } catch (error) {
        console.error("Error loading products page:", error);
        res.status(500).send("An error occurred while loading the products page. Please try again later.");
    }
};


const getProductsDetails = async (req, res) => {
    try {
        const productId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(404).render('404',{layout:false});
        }
        const product = await productsDB.findById(productId);

        if (!product) {
            return res.status(404).render('404',{layout:false});
        }

        const categoryOffers = await CategoryOffer.find({
            expiryDate: { $gt: Date.now() },
            isActive: true
        }).populate('categoryId', 'categoryName');


        const categoryOffer = categoryOffers.find(offer =>
            offer.categoryId.categoryName === product.category &&
            new Date(offer.expiryDate) > new Date()
        );
        let hasAdditionalDiscount=null

        if(categoryOffer){
            const categoryDiscount = categoryOffer?.discountPercentage || 0;
            const effectiveDiscount = Math.max(product.discount, categoryDiscount);
            hasAdditionalDiscount=categoryDiscount > product.discount
            product.discount=effectiveDiscount;
        }


        const activeVariants = product.variants.filter(variant => variant.status === 'active');

        // Unique colors
        const colors = [...new Map(activeVariants
            .filter(variant =>
                variant.color &&
                variant.color.trim() !== '' &&
                activeVariants.some(v =>
                    v.color.toLowerCase() === variant.color.toLowerCase() &&
                    v.stock > 0
                )
            ).map(variant =>
                [variant.color.toLowerCase(), {
                    color: variant.color,
                    colorCode: variant.colorCode
                }]
            )).values()];

        // Unique storage combinations
        const storages = [...new Map(activeVariants
            .filter(variant =>
                variant.storage &&
                variant.storage.trim() !== '' &&
                variant.storageUnit &&
                variant.storageUnit.trim() !== 'NULL'
            ).map(variant =>
                [`${variant.storage}${variant.storageUnit}`, {
                    storage: variant.storage,
                    storageUnit: variant.storageUnit,
                    additionalPrice: variant.additionalPrice,
                    stock: variant.stock,
                    stockStatus: variant.stockStatus
                }]
            )).values()];

        // Related products
        let relatedProducts = await productsDB.find({
            category: product.category,
            _id: { $ne: productId },
        }).limit(4);

        const updatedRelatedProducts = relatedProducts.map(relProduct => {
            const relProductObj = relProduct.toObject();
            const variant=relProductObj.variants.filter(variant =>
                variant.status === 'active' && variant.stock > 0)
            const priceInfo = calculateEffectivePrice(relProduct, categoryOffers,variant);
            return {
            ...relProductObj,
            discountedPrice: priceInfo.discountedPrice,
            effectiveDiscount: priceInfo.effectiveDiscountPercentage,
            hasCategoryOffer: priceInfo.isCategoryOffer,
            activeVariants: variant
            };
        });
        

        if (req.session.user) {
            const userId = req.session.user._id;
            const userCart = await Cart.findOne({ userId });

            const productWithCart = product.toObject();
            productWithCart.inCart = userCart ? userCart.products.some(cartItem => cartItem.productId.equals(product._id)) : false;

            // get wishlist
            const userWishlist = await Wishlist.findOne({ user: req.session.user._id }).lean();
            const wishlistProductIds = new Set(userWishlist?.products.map(item => item.product.toString()) || []);

            productWithCart.isWishlisted = wishlistProductIds.has(product._id.toString());

            // Check if any related product is in cart
            relatedProducts = relatedProducts.map(relProduct => {
            const relProductObj = relProduct.toObject();
            relProductObj.inCart = userCart ? userCart.products.some(cartItem => cartItem.productId.equals(relProduct._id)) : false;
            relProductObj.isWishlisted = wishlistProductIds.has(relProduct._id.toString());
            return relProductObj;
            });

            return res.render('user/product_details', {
            title: 'Product_details',
            product: productWithCart,
            relatedProducts: updatedRelatedProducts,
            colors,
            storages,
            hasAdditionalDiscount
            });
        }

        // If not logged in
        res.render('user/product_details', {
            title: 'Product_details',
            product,
            relatedProducts:updatedRelatedProducts,
            colors,
            storages,
            hasAdditionalDiscount
        });
    } catch (error) {
        console.error("Error fetching product details:", error);
        res.status(500).render('error', { message: 'Something went wrong!' });
    }
};

module.exports = { getProductsDetails, loadProductsPage };