const cartDb = require('../models/cartModel')



const validateStockUpdate = async (req, res, next) => {
    try {
        // check when vbariant upodate request 

        if (req.body.variantUpdates) {
            for (const update of req.body.variantUpdates) {
                if (update.newStock < 0) {
                    return res.status(400).json({ success: false, message: 'Stock cannot be negative' });
                }
            }
        }

        // check if product variants create or edit
        if (req.body.variants) {
            for (const variant of req.body.variants) {
                if (variant.stock < 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'Stock cannot be negative'
                    })
                }
            }
        }

        next();

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message || 'Stock validation failed' });
    }
}

const stockStatusValidation = async(req,res,next)=>{

    const userId = req.session.user._id;
    const cart = await cartDb.findOne({ userId }).populate('products.productId')

    const hasOutOfStock = cart.products.some(item => {
        const product = item.productId;

        const variant = product.variants.find(v => {
            const colorMatch = v.color === item.variantDetails.color;

            if (item.variantDetails.storage) {
                return colorMatch &&
                    v.storage !== null &&
                    v.storageUnit !== 'NIL' &&
                    `${v.storage}${v.storageUnit}` === item.variantDetails.storage;
            }

            return colorMatch && (v.storage === null || v.storageUnit === 'NIL');
        });

        return !variant || variant.stock < 1;
    });

    if (hasOutOfStock) {
        return res.status(404).json({ outOfStock: true, message: "No stock found" })
    }
    next();

}

module.exports = { validateStockUpdate,stockStatusValidation };