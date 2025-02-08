
const cron = require('node-cron');
const CategoryOffer = require('../models/categoryOfferModel');

cron.schedule('0 0 * * *', async () => { // Runs daily at midnight
  try {
    // Find expired offers
    const expiredOffers = await CategoryOffer.find({
      expiryDate: { $lte: Date.now() }
    });

    // Update products for each expired offer
    for (const offer of expiredOffers) {
      await updateCategoryProductDiscounts(offer.categoryId);
      await CategoryOffer.deleteOne({ _id: offer._id });
    }
    
    console.log(`Processed ${expiredOffers.length} expired offers`);
  } catch (error) {
    console.error('Error processing expired offers:', error);
  }
});