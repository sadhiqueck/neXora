
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

module.exports = { validateStockUpdate };