const Product = require('../models/productModel');
const CategoryOffer = require('../models/categoryOfferModel');

// const updateCategoryProductDiscounts = async (categoryId) => {
//   try {
//     // Get active category offer for this category
//     const categoryOffer = await CategoryOffer.findOne({
//       categoryId,
//       expiryDate: { $gt: Date.now() }
//     }).populate('categoryId', 'categoryName');

//     // Get all products in this category by category name
//     const products = await Product.find({ category: categoryOffer ? categoryOffer.categoryId.categoryName : categoryId.categoryName });

//     // Update each product
//     for (const product of products) {
//       const effectiveDiscount = Math.max(
//         product.discount,
//         categoryOffer?.discountPercentage || 0
//       );

//       const discountedPrice = product.price * (1 - effectiveDiscount / 100);

//       await Product.findByIdAndUpdate(product._id, {
//         discountedPrice: Math.round(discountedPrice)
//       });
//     }

//     console.log(`Updated discounts for ${products.length} products in category ${categoryId}`);
//   } catch (error) {
//     console.error('Error updating product discounts:', error);
//   }
// };


const calculateEffectivePrice = (product, categoryOffers, variantDetails) => {
  const categoryOffer = categoryOffers.find(offer =>
    offer.categoryId.categoryName === product.category &&
    offer.expiryDate > Date.now()
  );

  const categoryDiscount = categoryOffer?.discountPercentage || 0;
  const effectiveDiscount = Math.max(product.discount, categoryDiscount);

  // Calculate base price with variant adjustments

  const basePrice = product.price + (variantDetails[0]?.additionalPrice || 0);

  return {
    discountedPrice: Math.floor(basePrice * (1 - effectiveDiscount / 100)),
    effectiveDiscountPercentage: effectiveDiscount,
    isCategoryOffer: categoryDiscount > product.discount
  };
};

module.exports = calculateEffectivePrice;