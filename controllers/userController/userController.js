
const Users = require('../../models/userModel')
const bcrypt = require('bcrypt');
const productsDB = require("../../models/productModel")
const addressDb = require('../../models/addressModel')





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

const loadUserProfile = async (req, res) => {
    try {

        const userId = req.session.user._id;
        const address = await addressDb.find({ userId })

        if (!address) return res.render('user/user_profile', { title: "User Profile" })

        const defaultAddress = address.find(item => item.isDefault === true);
        res.render('user/user_profile', { title: 'User Profile', defaultAddress })
    } catch (err) {
        console.log('Error in user profile: ', err)
    }

}
const updateName = async (req, res) => {
    try {
        const { username } = req.body;

        if (!username || username.trim() === '') {
            return res.status(400).json({ error: 'Name cannot be empty' });
        }
        const userId = req.session.user._id;
        const updatedUser = await Users.findByIdAndUpdate(
            userId,
            { username: username.trim() },
            { new: true }
        );
        req.session.user.username = updatedUser.username;

        res.json({ username: updatedUser.username });
    } catch (err) {
        console.error('Error updating name:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};
const loadAddressprofile = async (req, res) => {
    try {
        req.session.checkoutAccess = true;
        const userId = req.session.user._id;
        const addresses = await addressDb.find({ userId });
        const sortedAdresses = addresses.sort((a, b) => b.isDefault - a.isDefault);

        if (!addresses || addresses.length === 0) {
            return res.render('user/profileAddress', { title: 'Address', addresses: [] });
        } else {
            return res.render('user/profileAddress', { title: 'Address', addresses: sortedAdresses });
        }

    } catch (error) {
        console.error('Error loading address:', error);
        return res.status(500).json({ error: 'Failed to load address' });
    }
}

const profileAddAddress = async (req, res) => {
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
        return res.redirect('/user/profile-address');
    } catch (err) {
        console.error('Error adding address:', err);
        return res.status(500).json({ error: 'Failed to add address' });
    }
}
const updateAddress = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const addressId = req.body.addressId;
        const { fullName, phone, addressLine1, addressLine2, landmark, city, state, pincode, addressType, isDefault } = req.body;

        const isDefaultConverted = isDefault === 'true';

        // If the updated address is marked as default, reset `isDefault` for all other addresses
        if (isDefaultConverted) {
            await addressDb.updateMany({ userId }, { $set: { isDefault: false } });
        }


        const updatedAddress = await addressDb.findOneAndUpdate(
            { _id: addressId, userId },
            {
                $set: {
                    fullName,
                    phone,
                    addressLine1,
                    addressLine2,
                    landmark,
                    city,
                    state,
                    pincode,
                    addressType,
                    isDefault: isDefaultConverted,
                },
            },
            { new: true }
        );

        if (!updatedAddress) {
            return res.status(404).json({ error: 'Address not found' });
        }

        return res.redirect('/user/profile-address');
    } catch (err) {
        console.error('Error updating address:', err);
        return res.status(500).json({ error: 'Failed to update address' });
    }
};

const deleteAddress = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const addressId = req.params.id;
        const address = await addressDb.findOneAndDelete({_id: addressId, userId: userId });
        if (!address) {
            return res.status(404).json({ error: 'Address not found' });
        }
        return res.status(200).json({ message: 'Address deleted successfully' });

    } catch (error) {
        console.error('Error removing from cart:', error);
        return res.status(500).json({ message: 'Failed to remove from cart' });
    }
};


module.exports = { loadHome,loadUserProfile, updateName, loadAddressprofile, updateAddress, profileAddAddress,deleteAddress }