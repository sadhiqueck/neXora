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

const loadProductViewpage = async (req, res) => {
    try {

        const productId = req.params.id
        const product = await productDB.findById(productId)
        if(!product){
            return res.send("error to find product")
        }
        res.render('admin/productViewpage',{title:"Product Details Page",product,layout:false})
    } catch (error) {
        console.log(error);
        res.send("error to load view page")
    }
}

const loadEditProductpage = async (req, res) => {
    try {
        const productId = req.params.id
        const product = await productDB.findById(productId)
        const categories = await categoryDB.find({})
        res.render("admin/productEditpage", { product, categories, title: 'Product Management', layout: false })

    }

    catch (error) {
        console.log(error);
    }
}


const addProduct = async (req, res) => {
    try {
        const { price, discount, productName, ...productData } = req.body;

        // Validate request body
        if (!price || !discount) {
            return res.status(400).json({
                success: false,
                message: 'Price and discount are required'
            });
        }

        // Validate files
        if (!req.files || req.files.length < 3) {
            return res.status(400).json({
                success: false,
                message: 'At least three images is required'
            });
        }
        // Check if name is alraeady exists
        const existingProduct = await productDB.findOne({
            productName: { $regex: new RegExp(`^${productName}$`, 'i') }
        })

        if (existingProduct) {
            return res.status(400).json({ message: 'Product name already exists.' });
        }


        // Convert price and discount to numbers and validate
        const numericPrice = parseFloat(price);
        const numericDiscount = parseFloat(discount);

        if (isNaN(numericPrice) || isNaN(numericDiscount)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid price or discount value'
            });
        }

        if (numericDiscount < 0 || numericDiscount > 100) {
            return res.status(400).json({
                success: false,
                message: 'Discount must be between 0 and 100'
            });
        }

        // Calculate discounted price
        const discountedPrice = numericPrice - (numericPrice * numericDiscount / 100);

        // Upload images with concurrent processing
        const imageUploadPromises = req.files.map(file => uploadToCloudinary(file));
        const uploadResults = await Promise.all(imageUploadPromises);
        const imageUrls = uploadResults.map(result => result.secure_url);

        // Create and save new product
        const newProduct = new productDB({
            ...productData,
            price: numericPrice,
            productName: productName,
            discount: numericDiscount,
            discountedPrice,
            images: imageUrls,
        });

        await newProduct.save();
        return res.status(200).json({ success: true, message: "Product added successfully" });


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



module.exports = { addProduct, loadProducts, deleteProduct, editProduct, loadAddProductpage, loadEditProductpage,loadProductViewpage }