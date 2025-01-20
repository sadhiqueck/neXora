
const Users = require('../../models/userModel')
const Products = require("../../models/productModel")
const addressDb = require('../../models/addressModel')
const Cart = require('../../models/cartModel')
const bcrypt = require('bcrypt')





const loadHome = async (req, res) => {
    try {
        let products;
        if (req.session.user) {
            const userId = req.session.user._id;
            const userCart = await Cart.findOne({
                userId,
                isOrdered: false
            });

            const products = await Products.find({});

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

            return res.render("user/home", {
                title: 'HomePage',
                products: productsWithCartStatus,
            });

        } else {
            const products = await Products.find({});
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
        const address = await addressDb.findOneAndDelete({ _id: addressId, userId: userId });
        if (!address) {
            return res.status(404).json({ error: 'Address not found' });
        }
        return res.status(200).json({ message: 'Address deleted successfully' });

    } catch (error) {
        console.error('Error removing from cart:', error);
        return res.status(500).json({ message: 'Failed to remove from cart' });
    }
};


const LoadChangePassword= async(req,res)=>{
    res.render('user/profileChangePassword',{title:"Change Password"})
}

const updatePassword=async(req,res)=>{
    const{currentPassword,newPassword,userId}= req.body;

    if (currentPassword.trim() === ''||newPassword.trim() === '') {
        return res.status(400).json({ error: 'Fields cannot be empty' });
    }
    try {
        
        const user = await Users.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: "Current password does not match" });
        }
        const isSame = await bcrypt.compare(newPassword, user.password);
        if(isSame){
            return res.status(400).json({ error: "Use different Password" });
        }
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        user.password = hashedPassword;
        await user.save();

        return res.status(200).json({ message: "Password updated successfully" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "An error occurred while updating the password" });
    }
}
    



module.exports = { loadHome, loadUserProfile,
     updateName, loadAddressprofile, updateAddress, 
     profileAddAddress, deleteAddress,LoadChangePassword,
     updatePassword }