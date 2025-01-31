
const validateProductsFilter = (req, res, next) => {
    const { minPrice, maxPrice, discount } = req.query;
    
    if (minPrice && isNaN(minPrice)) return res.status(400).send('Invalid minPrice');
    if (maxPrice && isNaN(maxPrice)) return res.status(400).send('Invalid maxPrice');
    if (discount && (isNaN(discount) || discount < 0 || discount > 100)) {
        return res.status(400).send('Invalid discount');
    }
    
    next();
};

module.exports = {validateProductsFilter};