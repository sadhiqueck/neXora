const productsDB = require('../../models/productModel');
const cartDb = require('../../models/cartModel');
const Wishlist = require('../../models/wishListModel');
const CategoryOffer = require('../../models/categoryOfferModel');
const calculateEffectivePrice = require('../../utils/EffectivePriceCalculator')



//GET /cart
const loadCart = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const cart = await cartDb.findOne({ userId }).populate('products.productId');
        let deliveryChargeLimit = 10000

        if (!cart || cart.products.length === 0) {
            return res.render('user/cart', {
                title: 'Cart',
                cart: null,
                totalItems: 0,
                subTotal: 0,
                totalSavings: 0,
                deliveryCharge: 0,
                tax: 0,
                total: 0
            });
        }

        let cartUpdated = false;

        const categoryOffers = await CategoryOffer.find({
            expiryDate: { $gt: Date.now() },
            isActive: true
        }).populate('categoryId', 'categoryName');


        const cartProductIds = cart.products.map(item => item.productId._id.toString());

        const userWishlist = await Wishlist.findOne({ user: req.session.user._id }).lean();
        const wishlistProductIds = new Set(userWishlist?.products.map(item => item.product.toString()) || []);

        const cartWithDetails = cart.products.map((item) => {
            const product = item.productId;


            if (product.isDeleted) {
                cartUpdated = true;
                return null;
            }

            const matchingVariants = product.variants.filter(v => {
                const colorMatch = v.color === item.variantDetails.color;

                if (item.variantDetails.storage) {
                    return colorMatch &&
                        v.storage !== null &&
                        v.storageUnit !== 'NIL' &&
                        `${v.storage}${v.storageUnit}` === item.variantDetails.storage;
                }

                return colorMatch && (v.storage === null || v.storageUnit === 'NIL');
            });


            const selectedVariant = matchingVariants[0];

            const priceInfo = calculateEffectivePrice(product, categoryOffers, matchingVariants);

            const isOutOfStock = !selectedVariant || selectedVariant.stock < 1;

            const adjustedQuantity = isOutOfStock ? 0 : Math.min(item.quantity, selectedVariant.stock);

            if (adjustedQuantity !== item.quantity) {
                cartUpdated = true;
                item.quantity = adjustedQuantity;
            }

            return {
                ...item.toObject(),
                variantPrice: priceInfo.discountedPrice,
                effectiveDiscount: priceInfo.effectiveDiscountPercentage,
                hasCategoryOffer: priceInfo.isCategoryOffer,
                productImage: product.images[0],
                outOfStock: isOutOfStock,
                isWishlisted: wishlistProductIds.has(product._id.toString())
            };
        }).filter(item => item !== null);


        const products = await productsDB.find({ isDeleted: false });

        const suggestedProducts = products
            .filter(product =>
                product.totalStock > 0 &&
                !cartProductIds.includes(product._id.toString())
            )
            .slice(0, 4)
            .map(product => ({
                ...product.toObject(),
                isWishlisted: wishlistProductIds.has(product._id.toString())
            }));



        const updatedSuggestedProducts = suggestedProducts.map(product => {
            const productObj = product;
            const variant = productObj.variants.filter(variant =>
                variant.status === 'active' && variant.stock > 0)
            const priceInfo = calculateEffectivePrice(product, categoryOffers, variant);

            return {
                ...productObj,
                discountedPrice: priceInfo.discountedPrice,
                effectiveDiscount: priceInfo.effectiveDiscountPercentage,
                hasCategoryOffer: priceInfo.isCategoryOffer,
                activeVariants: variant
            };
        });



        if (cartUpdated) {
            await cart.save();
        }
        const hasOutOfStock = cart.products.some(item => {
            const product = item.productId;
            const variant = product.variants.find(v => {
                const colorMatch = v.color === item.variantDetails.color;

                if (item.variantDetails.storage) {
                    return colorMatch &&
                        v.storage !== null &&
                        v.storageUnit !== 'NIL' &&
                        `${v.storage}${v.storageUnit}` === item.variantDetails.storage;
                }

                return colorMatch && (v.storage === null || v.storageUnit === 'NIL');
            });

            return !variant || variant.stock < 1;
        });

        cartWithDetails.hasOutOfStock = hasOutOfStock;

        const validProducts = cartWithDetails.filter(product => !product.outOfStock);
        const totalItems = validProducts.reduce((total, product) => total + product.quantity, 0);
        const subTotal = validProducts.reduce((total, product) => total + product.quantity * product.variantPrice, 0);
        const originalTotal = validProducts.reduce((total, product) => total + product.quantity * (product.productId.price + (product.variantDetails.additionalPrice || 0)), 0);
        const totalSavings = subTotal - originalTotal;
        const deliveryCharge = subTotal > deliveryChargeLimit ? 0 : 99;
        const tax = Math.round(subTotal * 0.18);
        const total = subTotal + deliveryCharge;

        res.render('user/cart', {
            title: 'Cart',
            cart: cartWithDetails,
            totalItems,
            originalTotal,
            subTotal,
            totalSavings,
            deliveryCharge,
            tax,
            total,
            suggestedProducts: updatedSuggestedProducts,
            // products
        });

    } catch (error) {
        console.error('Error loading cart:', error);
        res.status(500).render('error', { message: 'Failed to load cart' });
    }
};


const addToCart = async (req, res) => {

    try {
        const { productId } = req.body;
        const userId = req.session.user._id;
        const product = await productsDB.findById(productId);
        if (!product) {
            return res.status(404).json({ message: "Product not found!" });
        }


        // Find first available variant with stock
        const variant = product.variants.find(variant =>
            variant.status === 'active' && variant.stock > 0
        );

        if (!variant) {
            return res.status(400).json({ message: "No available variants in stock" });
        }

        let cart = await cartDb.findOne({ userId });
        if (!cart) {
            cart = new cartDb({ userId, products: [] });
        }

        const existingProductIndex = cart.products.findIndex(
            item => item.productId.toString() === productId &&
                item.variantDetails.color === variant.color &&
                item.variantDetails.storage === `${variant.storage}${variant.storageUnit}`
        );

        if (existingProductIndex !== -1) {
            cart.products[existingProductIndex].quantity += 1;
        } else {

            const variantDetails = {
                color: variant.color,
                additionalPrice: variant.additionalPrice || 0,
            };

            if (variant.storage !== null && variant.storageUnit !== 'NIL') {
                variantDetails.storage = `${variant.storage}${variant.storageUnit}`;
            }
            cart.products.push({
                productId,
                quantity: 1,
                variantDetails
            });
        }
        await cart.save();
        return res.status(200).json({ message: 'Item added to cart successfully' });
    } catch (error) {
        console.error('Error adding to cart:', error);
        return res.status(500).json({ message: 'Failed to add to cart' });
    }
};

const productDetailsaddToCart = async (req, res) => {

    try {
        const { productId, selectedColor, selectedStorage } = req.body;
        const userId = req.session.user._id;
        const product = await productsDB.findById(productId);
        if (!product) {
            return res.status(404).json({ message: "Product not found!" });
        }

        const variant = product.variants.find(variant => {
            // If product has no storage, only match by color
            if (!variant.storage) {
                return variant.color === selectedColor;
            }
            // For products with storage, match both color and storage
            return variant.color === selectedColor &&
                variant.storage + variant.storageUnit === selectedStorage;
        });

        if (!variant) {
            return res.status(400).json({ message: "Selected variant not available" });
        }

        if (variant.stock < 1) {
            return res.status(400).json({ message: "Selected variant out of stock" });
        }

        let cart = await cartDb.findOne({ userId });
        if (!cart) {
            cart = new cartDb({ userId, products: [] });
        }

        const existingProductIndex = cart.products.findIndex(
            item =>
                item.productId.toString() === productId &&
                item.variantDetails.color === selectedColor &&
                item.variantDetails.storage === selectedStorage
        );

        if (existingProductIndex !== -1) {
            cart.products[existingProductIndex].quantity += 1;
        } else {

            const variantDetails = {
                color: selectedColor,
                additionalPrice: variant.additionalPrice || 0,
            };

            if (selectedStorage !== null && selectedStorage !== 'NIL' && selectedStorage !== '') {
                variantDetails.storage = `${variant.storage}${variant.storageUnit}`;
            }
            cart.products.push({
                productId,
                quantity: 1,
                variantDetails
            });
        }

        await cart.save();
        return res.status(200).json({ message: 'Item added to cart successfully' });
    } catch (error) {
        console.error('Error adding to cart:', error);
        return res.status(500).json({ message: 'Failed to add to cart' });
    }
};



const removeFromCart = async (req, res) => {
    try {
        const productId = req.body.productId
        const userId = req.session.user._id;
        let cart = await cartDb.findOne({ userId });
        const productIndex = cart.products.findIndex(product => product.productId.toString() === productId);
        if (productIndex === -1) {
            return res.status(400).json({ message: 'Product not found' });
        }
        cart.products.splice(productIndex, 1);
        await cart.save();
        return res.status(200).json({ message: 'Product removed from cart' });

    } catch (error) {
        console.error('Error removing from cart:', error);
        return res.status(500).json({ message: 'Failed to remove from cart' });
    }
};


const updateCart = async (req, res) => {
    try {
        const { productId, action } = req.body;
        const userId = req.session.user._id;

        const cart = await cartDb.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ message: "Cart not found" });
        }

        const product = await productsDB.findById(productId);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        // Find the product in cart
        const cartProductIndex = cart.products.findIndex(
            item => item.productId.toString() === productId
        );

        if (cartProductIndex === -1) {
            return res.status(404).json({ message: "Product not found in cart" });
        }

        const cartProduct = cart.products[cartProductIndex];


        // Find the matching variant in product
        const variant = product.variants.find(variant => {
            const colorMatch = variant.status === 'active' &&
                variant.color === cartProduct.variantDetails.color;

            // If cart product has storage specification, check for storage match
            if (cartProduct.variantDetails.storage) {
                return colorMatch &&
                    variant.storage !== null &&
                    variant.storageUnit !== 'NIL' &&
                    `${variant.storage}${variant.storageUnit}` === cartProduct.variantDetails.storage;
            }

            // If cart product doesn't have storage, only match color
            return colorMatch &&
                (variant.storage === null || variant.storageUnit === 'NIL');
        });


        if (!variant) {
            return res.status(400).json({ message: "Product variant no longer available" });
        }

        // Calculate new quantity based on action
        let newQuantity = cartProduct.quantity;
        if (action === 'increase') {
            if (newQuantity >= variant.stock || newQuantity >= 4) {
                return res.status(400).json({
                    message: "Maximum quantity limit reached",
                    availableStock: variant.stock
                });
            }
            newQuantity += 1;
        } else if (action === 'decrease') {
            if (newQuantity <= 1) {
                cart.products.splice(cartProductIndex, 1);
            } else {
                newQuantity -= 1;
            }
        }

        if (cartProductIndex !== -1 && newQuantity >= 1) {
            cart.products[cartProductIndex].quantity = newQuantity;
        }

        await cart.save();

        // calculaten new price

        const categoryOffers = await CategoryOffer.find({
            expiryDate: { $gt: Date.now() },
            isActive: true
        }).populate('categoryId', 'categoryName');

        const categoryOffer = categoryOffers.find(offer =>
            offer.categoryId.categoryName === product.category &&
            offer.expiryDate > Date.now()
        );

        const categoryDiscount = categoryOffer?.discountPercentage || 0;
        const effectiveDiscount = Math.max(product.discount, categoryDiscount);

        // Calculate base price with variant adjustments

        const basePrice = product.price + (variant.additionalPrice || 0);
        const discountedPrice = Math.floor(basePrice * (1 - effectiveDiscount / 100));
        const productTotal = newQuantity * discountedPrice;
        const originalTotal = await cart.products.reduce(async (totalPromise, item) => {
            const total = await totalPromise;
            const product = await productsDB.findById(item.productId);
            const variant = product.variants.find(v => 
                v.color === item.variantDetails.color &&
                (!item.variantDetails.storage || v.storage === null || v.storageUnit === 'NIL' || `${v.storage}${v.storageUnit}` === item.variantDetails.storage)
            );
            const basePrice = product.price + (variant.additionalPrice || 0);
            return total + (item.quantity * basePrice);
        }, Promise.resolve(0));

        return res.status(200).json({
            success: true,
            message: 'Cart updated successfully',
            newQuantity,
            newPrice: productTotal,
            originalTotal
        });

    } catch (error) {
        console.error('Error updating cart:', error);
        return res.status(500).json({ message: 'Failed to update cart' });
    }
};

module.exports = { loadCart, addToCart, productDetailsaddToCart, removeFromCart, updateCart };