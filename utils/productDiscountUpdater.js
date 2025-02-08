const Product = require('../models/productModel');
const CategoryOffer = require('../models/categoryOfferModel');

const updateCategoryProductDiscounts = async (categoryId) => {
  try {
    // Get active category offer for this category
    const categoryOffer = await CategoryOffer.findOne({
      categoryId,
      expiryDate: { $gt: Date.now() }
    }).populate('categoryId', 'categoryName');

    // Get all products in this category by category name
    const products = await Product.find({ category: categoryOffer ? categoryOffer.categoryId.categoryName : categoryId.categoryName });

    // Update each product
    for (const product of products) {
      const effectiveDiscount = Math.max(
        product.discount,
        categoryOffer?.discountPercentage || 0
      );
  
      const discountedPrice = product.price * (1 - effectiveDiscount / 100);

      await Product.findByIdAndUpdate(product._id, {
        discountedPrice: Math.round(discountedPrice)
      });
    }
    
    console.log(`Updated discounts for ${products.length} products in category ${categoryId}`);
  } catch (error) {
    console.error('Error updating product discounts:', error);
  }
};
module.exports=updateCategoryProductDiscounts;