const Product = require('../models/productModel');
const CategoryOffer = require('../models/categoryOfferModel');


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