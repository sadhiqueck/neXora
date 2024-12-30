const productsDB = require('../../models/productModel');
const cartDb = require('../../models/cartModel');



//GET /cart
const loadCart = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const products = await productsDB.find({});
        const cart = await cartDb.findOne({ userId })
            .populate('products.productId');


        // Calculate the cart summary
        const totalItems = cart.products.reduce((total, product) => total + product.quantity, 0);
        const subTotal = cart.products.reduce((total, product) => total + product.quantity * product.productId.discountedPrice, 0)
        const totalSavings = subTotal - (cart.products.reduce((totalPrice, product) => totalPrice + product.productId.price, 0));
        const deliveryCharge = subTotal > 498 ? 0 : 99;
        const tax = Math.round(subTotal * 0.18);
        const total = subTotal + deliveryCharge;

        res.render('user/cart', { title: 'Cart', cart, products, totalItems, subTotal, totalSavings, deliveryCharge, tax, total });

    } catch (error) {
        console.error('Error loading cart:', error);
        return res.status(500).json({ error: 'Failed to load cart' });
    }


}


const addToCart = async (req, res) => {
    const productId = req.body.productId
    const userId = req.session.user._id;


    try {
        let cart = await cartDb.findOne({ userId });
        if (!cart) {
            cart = new cartDb({ userId, products: [] });
        }
        // Check if product is already in the cart
        const existingProduct = cart.products.find(product => product.productId.toString() === productId);
        if (existingProduct) {
            if (existingProduct.quantity >= 3) {
                return res.status(400).json({ message: "Maximum 3 products allowed!" })
            }
            existingProduct.quantity += 1;
        }
        else {
            cart.products.push({ productId, quantity: 1, });
        }

        await cart.save();
        return res.status(200).json({ message: 'Item added to cart successfully' });
    } catch (error) {
        console.error('Error adding to cart:', error);
        return res.status(500).json({ message: 'Failed to add cart' });
    }
}



// delete items from cart
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

// quantity update

const updateCart = async (req, res) => {
    const { productId, action } = req.body;
    const userId = req.session.user._id;


    try {

        const cart = await cartDb.findOne({ userId }).populate('products.productId', 'productName discountedPrice price')
        const product = cart.products.find((item) => item.productId._id.toString() === productId);
        if (!product) {
            return res.status(404).json({ message: "Product not found in cart" })
        }

        if (action === 'increase') {
            if (product.quantity < 3) {
                product.quantity++;
            } else {
                return res.status(400).json({ message: "Maximum 3 Products Allowed" })
            }
        }

        if (action === 'decrease') {
            if (product.quantity > 1) {
                product.quantity--;
            } else {
                return res.status(400).json({ message: "Minimum 1 required" })
            }
        }
        await cart.save();

        // re-calculate Summary
        const totalItems = cart.products.reduce((total, product) => total + product.quantity, 0);
        const subTotal = cart.products.reduce((total, product) => total + product.quantity * product.productId.discountedPrice, 0)
        const totalSavings = subTotal - (cart.products.reduce((totalPrice, product) => totalPrice + product.productId.price, 0));
        console.log(totalSavings)
        const deliveryCharge = subTotal > 498 ? 0 : 99;
        const tax = Math.round(subTotal * 0.18);
        const total = subTotal + deliveryCharge;
        const newPrice = product.productId?.discountedPrice;
        return res.status(200).json({ newQuantity: product.quantity, newPrice: newPrice * product.quantity, totalItems, subTotal, totalSavings, deliveryCharge, tax, total });

    } catch (error) {
        console.error('Error updating cart', error)
        res.status(500).json({ message: 'Internal server error' });
    }

}



module.exports = { loadCart, addToCart, removeFromCart, updateCart };