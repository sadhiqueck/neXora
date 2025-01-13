const productsDB = require('../../models/productModel');
const cartDb = require('../../models/cartModel');
const addressDb = require('../../models/addressModel');
const ordersDb = require('../../models/ordersModel')

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

            // Calculate the cart summary
            const subTotal = cart.products.reduce((total, product) => total + product.quantity * product.productId.discountedPrice, 0)
            const totalSavings = subTotal - (cart.products.reduce((totalPrice, product) => totalPrice + product.productId.price, 0));
            const deliveryCharge = subTotal > 498 ? 0 : 99;
            const tax = Math.round(subTotal * 0.18);
            const total = subTotal + deliveryCharge;
            req.session.orderSummary = { subTotal, totalSavings, deliveryCharge, tax, total };
            res.render('user/payment', { title: 'Payment', selectedAddress, deliveryType, deliveryDate, subTotal, totalSavings, deliveryCharge, tax, total })
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
            select: 'productName model price discount  discountedPrice category returnPeriod warranty images',
        });

        if (!cart || cart.products.length === 0) {
            return res.status(400).json({ error: 'Cart is empty. Cannot place order.' });
        }
        const selectedAddress = await addressDb.findById(req.session.selectedAddressId);
        if (!selectedAddress) {
            return res.status(400).json({ error: 'No address selected for shipping.' });
        }

        const { subTotal, totalSavings, deliveryCharge, tax, total } = req.session.orderSummary;
        //array of product details 
        const products = cart.products.map(item => ({
            productId: item.productId._id,
            productName: item.productId.productName,
            model: item.productId.model,
            price: item.productId.price,
            discount: item.productId.discount || 0,
            discountedPrice: item.productId.discountedPrice || item.productId.price,
            category: item.productId.category,
            quantity: item.quantity,
            returnPeriod: item.productId.returnPeriod || 0,
            warranty: item.productId.warranty || 0,
            images: item.productId.images[0],
            deliveryDate:deliveryDate
            
        }));


        const newOrder = new ordersDb({
            userId,
            products,
            deliveryDate,
            deliveryType,
            status: 'Processing', // Default status
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
            subTotal,
            totalSavings,
            deliveryCharge,
            tax,
            total,
        });

        const savedOrder = await newOrder.save();

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
}


const orderSuccess = (req, res) => {
    req.session.checkoutAccess = false;
    return res.render('user/orderSuccessPage', { title: "Order Success Page" })
}


module.exports = { loadAddress, addAddress, loadShippingMethod, saveDeliveryMethod, loadPaymentPage, shippingMethod, placeOrder, orderSuccess }