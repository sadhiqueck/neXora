const productsDB = require('../../models/productModel');
const cartDb = require('../../models/cartModel');
const addressDb = require('../../models/addressModel');
const ordersDb = require('../../models/ordersModel');
const e = require('connect-flash');

const loadAddress = async (req, res) => {
    try {
        req.session.checkoutAccess = true;
        const userId = req.session.user._id;
        const addresses = await addressDb.find({ userId });
        const selectAddressId = req.session.selectedAddressId || null;
        const sortedAdresses = addresses.sort((a, b) => b.isDefault - a.isDefault);

        if (!addresses || addresses.length === 0) {
            return res.render('user/Shipaddress', { title: 'Address', addresses: [] });
        } else {
            return res.render('user/Shipaddress', { title: 'Address', addresses: sortedAdresses, selectAddressId });
        }

    } catch (error) {
        console.error('Error loading address:', error);
        return res.status(500).json({ error: 'Failed to load address' });
    }
}

const addAddress = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const { fullName, phone, addressLine1, addressLine2, landmark, city, state, pincode, addressType, isDefault } = req.body;
        const isDefaultConverted = isDefault === 'true' ? true : false;
        if (isDefaultConverted) {
            await addressDb.updateMany({ userId }, { isDefault: false });
        }

        const newAddress = new addressDb({
            userId,
            fullName,
            phone,
            addressLine1,
            addressLine2,
            landmark,
            city,
            state,
            pincode,
            addressType,
            isDefault: isDefaultConverted
        });
        const addresses = await addressDb.find({ userId });
        const sortedAdresses = addresses.sort((a, b) => b.isDefault - a.isDefault);
        if (addresses.length < 1) {
            newAddress.isDefault = true;
        }
        const savedAddress = await newAddress.save();
        return res.redirect('/user/selectAddress');
    } catch (err) {
        console.error('Error adding address:', err);
        return res.status(500).json({ error: 'Failed to add address' });
    }

}
// shipping method

const loadShippingMethod = async (req, res) => {
    try {
        const { selectedAddress } = req.body;

        if (!selectedAddress) {
            console.log("Error in selected address");
            return res.redirect('/user/selectAddress');
        }
        req.session.selectedAddressId = selectedAddress;
        const selectedDeliveryMethod = req.session.selectedDeliveryMethod || {}; //to find if already selected Addres found
        const cart = await cartDb.findOne({ userId: req.session.user._id }).populate('products.productId', 'discountedPrice')
        const totalAmount = cart.products.reduce((total, product) => total + product.quantity * product.productId.discountedPrice, 0);
        const deliveryCharge = totalAmount > 498 ? 0 : 99;
        req.session.deliveryCharge = deliveryCharge;

        return res.render('user/shippingMethod', { title: 'Shipping_Method', deliveryCharge, selectedDeliveryMethod });

    } catch (error) {
        console.error('Error loading address:', error);
        return res.status(500).json({ error: 'Failed to load address' });
    }
}

const shippingMethod = async (req, res) => {
    const selectedDeliveryMethod = req.session.selectedDeliveryMethod || {};
    const deliveryCharge = req.session.deliveryCharge || 0;
    res.render('user/shippingMethod', {
        title: 'Shipping_Method',
        selectedDeliveryMethod,
        deliveryCharge
    });
}

const saveDeliveryMethod = async (req, res) => {
    try {
        const selectedDeliveryMethod = req.body;
        if (!selectedDeliveryMethod) {
            console.log("Error in selected delivery method");
            return res.status(400).json({ error: 'Something worng in delivery method' });
        }
        req.session.selectedDeliveryMethod = selectedDeliveryMethod;
        return res.status(200).json({ success: 'Delivery method saved successfully' });

        // if ersponse ok redirect to payment page in frontend


    } catch (error) {
        console.error('Error saving delivery method:', error);
        return res.status(500).json({ error: 'Something went wrong while saving delivery method' });
    }
}



const loadPaymentPage = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const cart = await cartDb.findOne({ userId }).populate('products.productId')
        const { selectedAddressId, selectedDeliveryMethod } = req.session;
        const selectedAddress = await addressDb.findById(selectedAddressId);
        const { deliveryType, deliveryDate } = selectedDeliveryMethod;

        if (!cart || !selectedAddressId || !selectedDeliveryMethod) {
            console.log("Error in loading payment page");
            return res.redirect('/user/selectAddress');
        } else {

            const cartWithDetails = cart.products.map((item) => {
                const product = item.productId;

                // Find the matching variant with flexible storage check
                const variant = product.variants.find(v => {
                    const colorMatch = v.color === item.variantDetails.color;

                    // If cart item has storage specification
                    if (item.variantDetails.storage) {
                        return colorMatch &&
                            v.storage !== null &&
                            v.storageUnit !== 'NIL' &&
                            `${v.storage}${v.storageUnit}` === item.variantDetails.storage;
                    }

                    return colorMatch && (v.storage === null || v.storageUnit === 'NIL');
                });


                const basePrice = product.price;

                const variantPrice = Math.round((basePrice + (variant?.additionalPrice || 0)) * (1 - product.discount / 100));

                // checkk product id out of stock
                const isOutOfStock = !variant || variant.stock < 1;

                return {
                    ...item.toObject(),
                    variantPrice,
                    productImage: product.images[0],
                    outOfStock: isOutOfStock,
                };
            });
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

            if (hasOutOfStock) {
                res.redirect('/user/cart');
            }

            // Calculate the cart summary
            const validProducts = cartWithDetails.filter(product => !product.outOfStock);
            const totalItems = validProducts.reduce((total, product) => total + product.quantity, 0);
            const subTotal = validProducts.reduce((total, product) => total + product.quantity * product.variantPrice, 0);
            const originalTotal = validProducts.reduce((total, product) => total + product.quantity * (product.productId.price + (product.variantDetails.additionalPrice || 0)), 0);
            const totalSavings = originalTotal - subTotal;
            const deliveryCharge = subTotal > 498 ? 0 : 99;
            const tax = Math.round(subTotal * 0.18);
            const total = subTotal + deliveryCharge;

            req.session.orderSummary= {originalTotal, subTotal, totalSavings, deliveryCharge, tax, total };

            res.render('user/payment', { title: 'Payment', selectedAddress, deliveryType, deliveryDate, subTotal, totalSavings, deliveryCharge, originalTotal, tax, total })
        }

    } catch (error) {
        console.error('Error loading payment page:', error);
        return res.status(500).json({ error: 'Failed to load payment page' });

    }


}

const placeOrder = async (req, res) => {
    try {
        const { paymentMethod } = req.body;
        const userId = req.session.user._id;
        const { deliveryDate, deliveryType } = req.session.selectedDeliveryMethod;

        const cart = await cartDb.findOne({ userId }).populate({
            path: 'products.productId',
            select: 'productName model price discount discountedPrice category returnPeriod warranty images stockQuantity variants',
        });

        if (!cart || cart.products.length === 0) {
            return res.status(400).json({ error: 'Cart is empty. Cannot place order.' });
        }

        let fetchedVariant = null;
        
        // check if any product is out of stock
        const hasOutOfStock = cart.products.some(item => {
            const product = item.productId;
            const variantDetails = item.variantDetails;
            if (variantDetails) {
                const variant = product.variants.find(v =>
                    v.color === variantDetails.color &&
                    (!variantDetails.storage ||
                        `${v.storage}${v.storageUnit}` === variantDetails.storage)
                );
                return !variant || variant.stock < 1;
            }
        });

        if (hasOutOfStock) {
            return res.status(400).json({ error: 'No stock available' });
        }
        
        
        const selectedAddress = await addressDb.findById(req.session.selectedAddressId);
        if (!selectedAddress) {
            return res.status(400).json({ error: 'No address selected for shipping.' });
        }

        const {originalTotal, subTotal, totalSavings, deliveryCharge, tax, total } = req.session.orderSummary;

        // Enhanced product details array with variant information
        const products = cart.products.map(item => {
            const product = item.productId;
            const variantDetails = item.variantDetails;

            // Calculate final price including variant additional price
            const basePrice = product.price;
            const orginalPrice = product.price + (variantDetails.additionalPrice || 0);
            const finalPrice = variantDetails
                ? Math.floor((basePrice + (variantDetails.additionalPrice || 0)) * (1 - product.discount / 100))
                : basePrice;

            return {
                productId: product._id,
                productName: product.productName,
                model: product.model,
                price: orginalPrice,
                discount: product.discount || 0,
                discountedPrice: finalPrice, // Discounted price including variant additional price
                category: product.category,
                quantity: item.quantity,
                returnPeriod: product.returnPeriod || 0,
                warranty: product.warranty || 0,
                images: product.images[0],
                deliveryDate: deliveryDate,
                variant: variantDetails ? {
                    color: variantDetails.color,
                    storage: variantDetails.storage,
                    additionalPrice: variantDetails.additionalPrice || 0
                } : null
            };
        });

        const newOrder = new ordersDb({
            userId,
            products,
            deliveryDate,
            deliveryType,
            status: 'Processing',
            paymentMethod,
            paymentStatus: 'Pending',
            shippingAddress: {
                addressId: selectedAddress._id,
                fullName: selectedAddress.fullName,
                phone: selectedAddress.phone,
                addressLine1: selectedAddress.addressLine1,
                addressLine2: selectedAddress.addressLine2,
                landmark: selectedAddress.landmark,
                city: selectedAddress.city,
                state: selectedAddress.state,
                pincode: selectedAddress.pincode,
                addressType: selectedAddress.addressType,
            },
            originalTotal,
            subTotal,
            totalSavings,
            deliveryCharge,
            tax,
            total,
        });

        const savedOrder = await newOrder.save();

        // Update stock quantities for products and variants
        for (const item of cart.products) {

            const product = item.productId;
            // const variantDetails = item.variantDetails;

            if (fetchedVariant) {
                // Update variant stock

                await productsDB.updateOne(
                    {
                        _id: product._id,
                        'variants': {
                            $elemMatch: {
                                color: fetchedVariant.color,
                                storage: fetchedVariant.storage,
                                storageUnit: fetchedVariant.storageUnit,
                            }
                        }
                    },
                    {
                        $inc: {
                            'variants.$.stock': -item.quantity,
                            totalStock: -item.quantity
                        }
                    }
                );
            }
        }

        // Clear the cart
        await cartDb.findOneAndUpdate({ userId }, { products: [], isOrdered: true });

        // Reset session data
        req.session.selectedAddressId = null;
        req.session.selectedDeliveryMethod = null;
        req.session.orderSummary = null;

        return res.status(200).json({ message: 'Order placed successfully' });
    } catch (error) {
        console.error('Error placing order:', error);
        res.status(500).json({ error: 'An error occurred while placing the order' });
    }
};


const orderSuccess = (req, res) => {
    req.session.checkoutAccess = false;
    return res.render('user/orderSuccessPage', { title: "Order Success Page" })
}


module.exports = { loadAddress, addAddress, loadShippingMethod, saveDeliveryMethod, loadPaymentPage, shippingMethod, placeOrder, orderSuccess }