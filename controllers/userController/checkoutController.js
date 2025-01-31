const productsDB = require('../../models/productModel');
const cartDb = require('../../models/cartModel');
const addressDb = require('../../models/addressModel');
const ordersDb = require('../../models/ordersModel');

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





module.exports = { loadAddress, addAddress, loadShippingMethod, saveDeliveryMethod, shippingMethod, }