const Coupon = require('../../models/couponModel')
const Category = require('../../models/categoryModel')
const Cart= require('../../models/cartModel')

const getCoupons = async (req, res) => {
    try {
        const coupons = await Coupon.find().sort({ createdAt: -1 });
        const categories = await Category.find({});
        res.render('admin/coupon_management', { coupons, categories, title: "Coupon Management" });
    } catch (error) {
        console.error(error);
        res.redirect('/admin/dashboard');
    }
};

const createCoupon = async (req, res) => {
    const { code, value, expiryDate, } = req.body;

    if (!code) {
        return res.status(400).json({ message: 'Coupon code is required.' });
    }

    if (isNaN(value) || value <= 0) {
        return res.status(400).json({ message: 'Discount value must be a positive number.' });
    }

    if (new Date(expiryDate) <= new Date()) {
        return res.status(400).json({ message: 'Expiry date must be in the future.' });
    }

    try {
        const couponData = {
            ...req.body,
            isActive: req.body.isActive === 'true' || req.body.isActive === 'on'
        };

        const coupon = new Coupon(couponData);
        await coupon.save();
        res.redirect('/admin/coupons');
    } catch (error) {
        console.error(error);
        res.redirect('/admin/coupons?error=Invalid+coupon+data');
    }
};

const loadAddCoupons = async (req, res) => {
    const categories = await Category.find({ isDeleted: false });
    res.render('admin/coupon_form', {
        coupon: null,
        categories,
        title: "Coupon Management"
    });
}

const loadEditCoupon = async (req, res) => {
    const coupon = await Coupon.findById(req.params.id);
    const categories = await Category.find({ isDeleted: false });
    res.render('admin/coupon_form', {
        coupon,
        categories,
        title: "Coupon Management"
    });
}

const updateCoupon = async (req, res) => {
    try {
        const couponData = {
            ...req.body,
            isActive: req.body.isActive === 'true' || req.body.isActive === 'on'
        };
        await Coupon.findByIdAndUpdate(req.params.id, couponData);
        res.redirect('/admin/coupons');
    } catch (error) {
        res.render('admin/coupon_form', {
            coupon: { ...req.body, _id: req.params.id },
            categories: await Category.find(),
            error: error.message,
            title: "Coupon Management"
        });
    }
};

const deleteCoupon = async (req, res) => {
    try {
        await Coupon.findByIdAndDelete(req.params.id);
        res.redirect('/admin/coupons');
    } catch (error) {
        console.error(error);
        res.redirect('/admin/coupons?error=Delete+failed');
    }
};


const validateCoupon = async (req, res) => {
    const { code, userId, cartId } = req.body;
    try {
      
        const coupon = await Coupon.findOne({ code });
        if (!coupon) return res.status(404).json({ message: 'Invalid coupon code' });

        //validation
        if (!coupon.isActive) throw new Error('Coupon is inactive');
        if (coupon.expiryDate < new Date()) throw new Error('Coupon has expired');
        if (coupon.usedCount >= coupon.usageLimit) throw new Error('Coupon usage limit reached');

       
        const cart = await Cart.findById(cartId).populate({
            path: 'products.productId',
            model: 'Products'
        });        

        //Validate applicability
        if (coupon.applicableTo === 'specific') {
            const validCategories = cart.products.some(item =>
            coupon.categories.includes(item.productId.category.toString())
            );
            if (!validCategories) throw new Error('Coupon not applicable to cart items');
        }

        //Calculate discount
        let discount = 0;
        let cartTotalPrice = req.session.orderSummary.total;

        if (coupon.applicableTo === 'specific') {
            cartTotalPrice = cart.products
            .filter(item => coupon.categories.includes(item.productId.category.toString()))
            .reduce((total, item) => {
                const productPrice = Math.round((item.productId.price + item.variantDetails.additionalPrice) * (1 - item.productId.discount / 100));
                return total + productPrice * item.quantity;
            }, 0);
        }

        if (coupon.discountType === 'percentage') {
            discount = Math.round(cartTotalPrice * (coupon.value / 100));
            if (coupon.maxDiscount && discount > coupon.maxDiscount) {
            discount = coupon.maxDiscount;
            }
        } else {
            discount = coupon.value;
        }

        //Validate minimum purchase
        if (coupon.minPurchase > cartTotalPrice) {
            throw new Error(`Minimum purchase of ₹${coupon.minPurchase} required`);
        }

        res.status(200).json({
            success:true,
            valid: true,
            discount,
            coupon: {
                code: coupon.code,
                id:coupon._id,
                discountType: coupon.discountType,
                value: coupon.value,
                maxDiscount: coupon.maxDiscount,
                discount:discount
            }
        });

    } catch (error) {
        res.status(400).json({
            valid: false,
            message: error.message
        });
    }
}


const getReferrals = async (req, res) => {
    try {
        res.render('admin/referrals', { referrals });
    } catch (error) {
        console.error(error);
        res.redirect('/admin/dashboard');
    }
};

module.exports = { getCoupons, createCoupon, loadAddCoupons,
     updateCoupon, loadEditCoupon, deleteCoupon,validateCoupon, getReferrals }