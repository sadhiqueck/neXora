const Category = require('../../models/categoryModel');
const ReferralOffer = require('../../models/referralOfferModel')
const CategoryOffer = require('../../models/categoryOfferModel')
// const updateCategoryProductDiscounts= require('../../utils/productDiscountUpdater')
const getOfferPage = async (req, res) => {
    try {

        const categories = await Category.find({ isDeleted: false })

        if (!categories) return res.status(404).json({ error: "Category not found" })

        const referralOffers = await ReferralOffer.findOne({})

        if (!referralOffers) {
            const newReferralOffer = new ReferralOffer({});
            await newReferralOffer.save();
        }

        const categoryOffers = await CategoryOffer.find({ isActive: true }).populate({
            path: 'categoryId',
            select: 'categoryName'
        });


        res.render('admin/offer_management', { title: "Offer Management", categories, referralOffers, categoryOffers })

    } catch (error) {
        console.log(error)
    }

}


const referralUpdation = async (req, res) => {
    const { referralBonus, refereeBonus } = req.body;
    try {
        const referralOffers = await ReferralOffer.findOne({})
        if (referralOffers) {
            referralOffers.referralBonus = referralBonus;
            referralOffers.refereeBonus = refereeBonus;
            await referralOffers.save();
            res.status(200).json({ message: "Referral offers updated successfully" });
        } else {
            res.status(404).json({ error: "Referral offers not found" });
        }
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
}

const addCategoryOffer = async (req, res) => {
    const { offerData } = req.body;

    try {
        const categoryOffer = new CategoryOffer(offerData);
        await categoryOffer.save();

        // update products discount in this categry
        // await updateCategoryProductDiscounts(offerData.categoryId);

        res.status(201).json({ message: "Category offer added successfully" });
    } catch (error) {
        res.status(500).json({error})
        console.log(error)
    }
}

const editCategoryOffer = async (req, res) => {
    try {
      const { id } = req.params;
      const { discountPercentage, expiryDate } = req.body;

      const updatedOffer = await CategoryOffer.findByIdAndUpdate(
        id,
        { discountPercentage, expiryDate },
        { new: true }
      );
  
      if (!updatedOffer) {
        return res.status(404).json({ message: 'Offer not found' });
      }
    //   await updateCategoryProductDiscounts(updatedOffer.categoryId);
  
      res.json({ message: 'Offer updated successfully', updatedOffer });
    } catch (error) {
      res.status(500).json({ message: 'Failed to update offer', error: error.message });
    }

}

const deleteCategoryOffer = async(req,res)=>{

    const { id } = req.params;
    try {
        const categoryOffer = await CategoryOffer.findByIdAndDelete(id).populate('categoryId', 'categoryName');
        if (!categoryOffer) {
            return res.status(404).json({ error: "Category offer not found" });
        }
        
        // await updateCategoryProductDiscounts(categoryOffer.categoryId);
        res.status(200).json({ message: "Category offer deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
}

module.exports = { getOfferPage, referralUpdation, addCategoryOffer, editCategoryOffer,deleteCategoryOffer }