const adminSchema = require('../../models/adminModel');
const bcrypt = require('bcrypt');
const Users = require("../../models/userModel");
const productDB = require('../../models/productModel')
const categoryDB = require('../../models/categoryModel')
const { uploadToCloudinary } = require('../../config/multerConfig');

const loadProducts = async (req, res) => {
    try {
        if (req.session.admin) {
            const products = await productDB.find({})
            const categories = await categoryDB.find({})
            res.render("admin/product_manage", { products, categories, title: 'Product Management' })
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
        if (!req.files || req.files.length === 0) {
            throw new Error('No images uploaded');
        }

        const product = req.body;
        const discountedPrice = product.price - (product.price * product.discount / 100);
        const imageUrls = [];

        // Upload all images to Cloudinary
        for (const file of req.files) {
            try {
                const result = await uploadToCloudinary(file);
                imageUrls.push(result.secure_url);
            } catch (uploadError) {
                console.error('Cloudinary upload error:', uploadError);
                throw new Error('Failed to upload image');
            }
        }

        const newProduct = new productDB({
            ...product,
            discountedPrice,
            images: imageUrls,
        });
        await newProduct.save();
        res.redirect('/admin/products');

    } catch (error) {
        console.error('Error in addProduct:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to add product'
        });
    }
}



const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;


        const product = await productDB.findById(id);
        if (!product) {
            return res.status(404).send('Product not found');
        }

        await productDB.findByIdAndUpdate(
            id,
            { isDeleted: !product.isDeleted },
            { new: true }
        );
        res.redirect('/admin/products');

    } catch (error) {
        console.error(error);
        res.status(500).send('Something went wrong');
    }
}

const editProduct = async (req, res) => {
    try {
        const { id, imageIndices, ...productData } = req.body;

        // new code

        const imageUrls = [];
        for (const file of req.files) {
            const result = await uploadToCloudinary(file);
            imageUrls.push(result.secure_url); // Store the Cloudinary URL
        }

        // Assuming you're updating an existing product (example)

        // const updatedProduct = await Product.findByIdAndUpdate(req.body.productId, {
        //   images: imageUrls, // Update the image URLs
        // }, { new: true });

        // end


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

const loadAddProductpage = async (req, res) => {
    try {
        if (req.session.admin) {

            const categories = await categoryDB.find({})
            res.render("admin/productAddpage", { categories, title: 'Product Management', layout: false })
        }
        else {
            return res.redirect('/admin/login')
        }

    } catch (error) {
        console.log(error);
    }
}

const loadEditProductpage = async (req, res) => {
    try {
        if (req.session.admin) {
            const product = await productDB.find({})
            const categories = await categoryDB.find({})
            res.render("admin/productEditpage", { product, categories, title: 'Product Management', layout: false })
        }
        else {
            return res.redirect('/admin/login')
        }

    } catch (error) {
        console.log(error);
    }
}

module.exports = { addProduct, loadProducts, deleteProduct, editProduct, loadAddProductpage, loadEditProductpage }