const adminSchema = require('../../models/adminModel');
const bcrypt = require('bcrypt');
const Users = require("../../models/userModel");
const productDB = require('../../models/productModel')
const categoryDB = require('../../models/categoryModel')
const upload = require('../../middleware/multer');

const loadProducts = async (req, res) => {
    try {
        if (req.session.admin) {
            const products = await productDB.find({})
            const categories = await categoryDB.find({})
            res.render("admin/product_manage", { products, categories })
        }
        else {
            return res.redirect('/admin/login')
        }

    } catch (error) {
        console.log(error);
    }
}



// admins controller
const addProduct = async (req, res) => {
    try {
        const product = req.body;
        const discountedPrice = product.price - (product.price * product.discount / 100);
        const imagePaths = req.files.map(file => `/uploads/${file.filename}`);
        const newProduct = new productDB({ ...product, discountedPrice, images: imagePaths, })
        await newProduct.save();

        res.redirect('/admin/products')

    } catch (error) {

        console.log(error);

    }
}



const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;


        const product = await productDB.findById(id);

        // Toggle the `isDeleted` status
        product.isDeleted = !product.isDeleted;

        await product.save();
        res.redirect('/admin/products');

    } catch (error) {
        console.error(error);
        res.status(500).send('Something went wrong');
    }
}

const editProduct = async (req, res) => {
    try {
        const { id, imageIndices, ...productData } = req.body;


        if (!id) {
            return res.status(400).send('Missing product ID');
        }

        const updateObject = { ...productData, discountedPrice: productData.price - (productData.price * productData.discount / 100).toFixed(0) };

        //image replacements
        if (req.files && req.files.length > 0) {
            // Convert imageIndices to array if it's not already
            const indices = Array.isArray(imageIndices) ? imageIndices : [imageIndices];

            // Create $set object for image updates
            updateObject.$set = {};


            // Iterate through files and match with indices
            req.files.forEach((file, index) => {
                const imageIndex = indices[index] !== undefined
                    ? indices[index]
                    : index;

                updateObject.$set[`images.${imageIndex}`] = `/uploads/${file.filename}`;
            });
        }



        // Update the product
        const updatedProduct = await productDB.findOneAndUpdate(
            { _id: id },
            updateObject,
            { new: true }
        );

        if (!updatedProduct) {
            return res.status(404).send('Product not found');
        }

        res.redirect('/admin/products');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
};

module.exports = { addProduct, loadProducts, deleteProduct, editProduct }