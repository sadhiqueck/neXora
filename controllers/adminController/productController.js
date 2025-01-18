const adminSchema = require('../../models/adminModel');
const bcrypt = require('bcrypt');
const Users = require("../../models/userModel");
const productDB = require('../../models/productModel')
const categoryDB = require('../../models/categoryModel')
const cloudinary = require('../../config/cloudinaryConfig');
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
        if (!product) {
            return res.send("error to find product")
        }
        res.render('admin/productViewpage', { title: "Product Details Page", product, layout: false })
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
        const discountedPrice = Math.round(numericPrice - (numericPrice * numericDiscount / 100));

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



const editProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const { price, discount, productName, existingImages, deletedImages, variants, ...productData } = req.body;



        const existingImagesArray = JSON.parse(existingImages || '[]');
        const deletedImagesArray = JSON.parse(deletedImages || '[]');


        // validate price 
        if (!price || !discount) {
            return res.status(400).json({
                success: false,
                message: 'Price and discount are required'
            });
        }

        // Check if name already exists 
        const existingProduct = await productDB.findOne({
            productName: { $regex: new RegExp(`^${productName}$`, 'i') },
            _id: { $ne: productId }
        });

        if (existingProduct) {
            return res.status(400).json({ message: 'Product name already exists.' });
        }

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

        const discountedPrice = Math.round(numericPrice - (numericPrice * numericDiscount / 100));

        //current product to access existing images
        const currentProduct = await productDB.findById(productId);
        if (!currentProduct) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }


        let updatedImages = [...currentProduct.images];

        for (const deletedImage of deletedImagesArray) {
            const publicId = deletedImage.name.split('/').pop().split('.')[0];
            console.log(publicId)
            try {
                await cloudinary.uploader.destroy(publicId);
                updatedImages[deletedImage.index] = null;
            } catch (error) {
                console.error(`Failed to delete image ${publicId}:`, error);
            }
        }



        // Handle new image uploads 

        if (req.files && req.files.length > 0) {
            console.log(req.files)
            for (const file of req.files) {
                const filename = file.originalname;
                console.log(filename)
                const index = parseInt(filename.match(/-(\d+)/).slice(1));
                console.log(index)

                const uploadResult = await uploadToCloudinary(file);

                // delete  from clouidnary
                if (updatedImages[index] && !deletedImagesArray.find(img => img.index === index)) {
                    const oldPublicId = updatedImages[index].split('/').pop().split('.')[0];
                    await cloudinary.uploader.destroy(oldPublicId);
                }

                updatedImages[index] = uploadResult.secure_url;
            }
        }

        // Filter out null values and ensure we have at least 3 images
        updatedImages = updatedImages.filter(img => img !== null);
        if (updatedImages.length < 3) {
            return res.status(400).json({
                success: false,
                message: 'At least three images are required'
            });
        }

 
        const updatedProduct = await productDB.findByIdAndUpdate(
            productId,
            {
                ...productData,
                variants,
                price: numericPrice,
                productName: productName,
                discount: numericDiscount,
                discountedPrice,
                images: updatedImages,
            },
            { new: true, runValidators: true }
        );

        return res.status(200).json({
            success: true,
            message: "Product updated successfully",
            product: updatedProduct
        });

    } catch (error) {
        console.error('Error in editProduct:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to update product'
        });
    }
};

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

//  stock Management  function

const updateProductStock = async (req, res) => {
    try {
        const { productId, variantUpdates } = req.body;

        console.log(req.body);

        const product = await productDB.findById(productId);

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        // Update stock for each variant
        variantUpdates.forEach(update => {
            const variant = product.variants.id(update.variantId);
            if (variant) {
                variant.stock = update.newStock;

                // calculate lowstock
                if (variant.stock <= 0) {
                    variant.stockStatus = 'out'; 
                  } else if (variant.stock < variant.lowStockThreshold) {
                    variant.stockStatus = 'low'; 
                  } else {
                    variant.stockStatus = 'normal'; 
                  }
            }
        });

        await product.save();

        return res.status(200).json({ success: true, message: 'Stock updated successfully', totalStock: product.totalStock });
    } catch (error) {
        console.error('Error updating stock:', error);
        return res.status(500).json({ success: false, message: error.message || 'Failed to update stock' });
    }
};


module.exports = {
    addProduct, loadProducts,
    editProduct, loadAddProductpage, loadEditProductpage,
     loadProductViewpage, deleteProduct,updateProductStock
}