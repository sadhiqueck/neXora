const productsDB = require('../../models/productModel');
const cartDb = require('../../models/cartModel');



//GET /cart
const loadCart = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const products = await productsDB.find({});
        const cart = await cartDb.findOne({ userId })
            .populate('products.productId');

        if (cart) {

            // Calculate the cart summary
            const totalItems = cart.products.reduce((total, product) => total + product.quantity, 0);
            const subTotal = cart.products.reduce((total, product) => total + product.quantity * product.productId.discountedPrice, 0)
            const totalSavings = subTotal - (cart.products.reduce((totalPrice, product) => totalPrice + product.productId.price, 0));
            const deliveryCharge = subTotal > 498 ? 0 : 99;
            const tax = Math.round(subTotal * 0.18);
            const total = subTotal + deliveryCharge;

            res.render('user/cart', { title: 'Cart', cart, products, totalItems, subTotal, totalSavings, deliveryCharge, tax, total });
        }
        else {
            res.render('user/cart', { title: 'Cart', cart: 0 });
        }

    } catch (error) {
        console.error('Error loading cart:', error);
        return res.status(500).json({ error: 'Failed to load cart' });
    }


}


const addToCart = async (req, res) => {
    try {

        const { productId, selectedColor, selectedStorage } = req.body;
        const userId = req.session.user._id;

        const product = await productsDB.findById(productId);
        if (!product) {
            return res.status(404).json({ message: "Product not found!" });
        }

        // find variant
        const variant = product.variants.find(variant =>
            variant.color === selectedColor &&
            variant.storage + variant.storageUnit === selectedStorage
        );

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

        const existingProduct = cart.products.find(item =>
            item.productId.toString() === productId &&
            item.variantDetails.color === selectedColor &&
            item.variantDetails.storage === selectedStorage
        );

        if (existingProduct) {
            if (existingProduct.quantity >= 3) {
                return res.status(400).json({ message: "Maximum 3 products allowed!" });
            }


            if (variant.stock < existingProduct.quantity + 1) {
                return res.status(400).json({ message: "Not enough stock available!" });
            }

            existingProduct.quantity += 1;
        } else {
            cart.products.push({
                productId,
                quantity: 1,
                variantDetails: {
                    color: selectedColor,
                    storage: selectedStorage,
                    price: product.discountedPrice + variant.additionalPrice
                }
            });
        }


        try {
            // decrease stock from variant
            await productsDB.findOneAndUpdate(
                {
                    _id: productId,
                    "variants.color": selectedColor,
                    "variants.storage": selectedStorage.replace(variant.storageUnit, "")
                },
                { $inc: { "variants.$.stock": -1 } }
                
            );

            await cart.save();

        
        } catch (error) {
            throw error;
        } 

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
        console.log(productIndex);
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

    const { productId, action, selectedColor, selectedStorage } = req.body;
    const userId = req.session.user._id;

    try {

        try {
            const cart = await cartDb.findOne({ userId })
                .populate('products.productId', 'productName discountedPrice price variants');

            const cartProduct = cart.products.find((item) =>
                item.productId._id.toString() === productId &&
                item.variantDetails.color === selectedColor &&
                item.variantDetails.storage === selectedStorage
            );

            if (!cartProduct) {
                return res.status(404).json({ message: "Product not found in cart" });
            }

            const variant = cartProduct.productId.variants.find(variant =>
                variant.color === selectedColor &&
                variant.storage + variant.storageUnit === selectedStorage
            );

            if (action === 'increase') {
                if (cartProduct.quantity < 3) {

                    if (variant.stock < 1) {
                        return res.status(400).json({ message: "Not enough stock available" });
                    }
                    cartProduct.quantity++;
                    await productsDB.findOneAndUpdate(
                        {
                            _id: productId,
                            "variants.color": selectedColor,
                            "variants.storage": selectedStorage.replace(variant.storageUnit, "")
                        },
                        { $inc: { "variants.$.stock": -1 } },
                    );
                } else {
                    return res.status(400).json({ message: "Maximum 3 Products Allowed" });
                }
            }

            if (action === 'decrease') {
                if (cartProduct.quantity > 1) {
                    cartProduct.quantity--;
                    // increase stock
                    await productsDB.findOneAndUpdate(
                        {
                            _id: productId,
                            "variants.color": selectedColor,
                            "variants.storage": selectedStorage.replace(variant.storageUnit, "")
                        },
                        { $inc: { "variants.$.stock": 1 } }
                    );
                } else {
                    return res.status(400).json({ message: "Minimum 1 required" });
                }
            }

            await cart.save();

            // calculate Summary 
            const totalItems = cart.products.reduce((total, product) =>
                total + product.quantity, 0
            );

            const subTotal = cart.products.reduce((total, product) => {
                const variantPrice = product.variantDetails.price;
                return total + (product.quantity * variantPrice);
            }, 0);

            const totalSavings = cart.products.reduce((total, product) => {
                const variantPrice = product.variantDetails.price;
                return total + (product.quantity * variantPrice);
            }, 0);

            const deliveryCharge = subTotal > 498 ? 0 : 99;
            const tax = Math.round(subTotal * 0.18);
            const total = subTotal + deliveryCharge + tax;
            const variantPrice = cartProduct.variantDetails.price;
            const newPrice = (variantPrice - (variantPrice * cartProduct.productId.discount / 100)) * cartProduct.quantity;

            return res.status(200).json({
                newQuantity: cartProduct.quantity,
                newPrice,
                totalItems,
                subTotal,
                totalSavings,
                deliveryCharge,
                tax,
                total
            });

        } catch (error) {
            console.log(error);
            throw error;
        }
    } catch (error) {
        console.error('Error updating cart', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};


module.exports = { loadCart, addToCart, removeFromCart, updateCart };