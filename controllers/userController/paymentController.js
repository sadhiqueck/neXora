const productsDB = require('../../models/productModel');
const cartDb = require('../../models/cartModel');
const addressDb = require('../../models/addressModel');
const ordersDb = require('../../models/ordersModel')
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Wallet = require('../../models/walletModel');
const Coupons = require('../../models/couponModel');


const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

const loadPaymentPage = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const cart = await cartDb.findOne({ userId }).populate('products.productId')
        const cartId = cart._id
        const { selectedAddressId, selectedDeliveryMethod } = req.session;
        const selectedAddress = await addressDb.findById(selectedAddressId);
        const { deliveryType, deliveryDate } = selectedDeliveryMethod;

        if (!cart || !selectedAddressId || !selectedDeliveryMethod) {
            console.log("Error in loading payment page");
            return res.redirect('/user/selectAddress');
        } else {

            const cartWithDetails = cart.products.map((item) => {
                const product = item.productId;

                // Find the matching variant with flexible storage check
                const variant = product.variants.find(v => {
                    const colorMatch = v.color === item.variantDetails.color;

                    // If cart item has storage specification
                    if (item.variantDetails.storage) {
                        return colorMatch &&
                            v.storage !== null &&
                            v.storageUnit !== 'NIL' &&
                            `${v.storage}${v.storageUnit}` === item.variantDetails.storage;
                    }

                    return colorMatch && (v.storage === null || v.storageUnit === 'NIL');
                });


                const basePrice = product.price;

                const variantPrice = Math.round((basePrice + (variant?.additionalPrice || 0)) * (1 - product.discount / 100));

                // checkk product id out of stock
                const isOutOfStock = !variant || variant.stock < 1;

                return {
                    ...item.toObject(),
                    variantPrice,
                    productImage: product.images[0],
                    outOfStock: isOutOfStock,
                };
            });
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
                res.redirect('/user/cart');
            }

            // Calculate the cart summary
            const validProducts = cartWithDetails.filter(product => !product.outOfStock);
            const totalItems = validProducts.reduce((total, product) => total + product.quantity, 0);
            const subTotal = validProducts.reduce((total, product) => total + product.quantity * product.variantPrice, 0);
            const originalTotal = validProducts.reduce((total, product) => total + product.quantity * (product.productId.price + (product.variantDetails.additionalPrice || 0)), 0);
            const totalSavings = originalTotal - subTotal;
            const deliveryCharge = subTotal > 498 ? 0 : 99;
            const tax = Math.round(subTotal * 0.18);
            const total = subTotal + deliveryCharge;

            req.session.orderSummary = { originalTotal, subTotal, totalSavings, deliveryCharge, tax, total };

            const userWallet = await Wallet.findOne({ user: userId }) //wallet dat        
            //fetch coupons
            const coupons = await Coupons.find({ isActive: true });

            // Filter eligible coupons based on the categories of products in the cart
            const cartProductCategories = cart.products.map(item => item.productId.category);

            const eligibleCoupons = coupons.filter(coupon => {
                return coupon.categories.some(category => cartProductCategories.includes(category));
            });

            const allApplicableCoupons = coupons.filter(coupon => coupon.applicableTo === 'all');
            // Combine eligible coupons and all applicable coupons
            const combinedCoupons = [...eligibleCoupons, ...allApplicableCoupons];

            res.render('user/payment', {
                title: 'Payment', razorpayKey: process.env.RAZORPAY_KEY_ID, selectedAddress,
                deliveryType, deliveryDate, subTotal, totalSavings,
                deliveryCharge, originalTotal, tax, total, userWallet, coupons: combinedCoupons, cartId
            })
        }

    } catch (error) {
        console.error('Error loading payment page:', error);
        return res.status(500).json({ error: 'Failed to load payment page' });

    }


}


const createRazorpayOrder = async (req, res) => {
    try {
        let { total, isWallet } = req.body;

        // if (isWallet) {
        //     // Wallet Transaction: Get total from request body
        //     if (!total || total <= 0) {
        //         return res.status(400).json({ error: "Invalid amount for wallet transaction" });
        //     }
        // } else {

        //     // if (!req.session.orderSummary || !req.session.orderSummary.total) {
        //     //     return res.status(400).json({ error: "No order summary found in session" });
        //     // }
        //     total = req.session.orderSummary.total;
        // }

        if (!total || total <= 0) {
            return res.status(400).json({ error: "Invalid amount for wallet transaction" });
        }

        // Convert amount to paisa
        const amountInPaisa = total * 100;

        const options = {
            amount: amountInPaisa,
            currency: "INR",
            receipt: `receipt_${Date.now()}`,
        };

        const order = await razorpay.orders.create(options);


        return res.json({
            success: true,
            order: order,
            isWallet: isWallet || false,
        });

    } catch (error) {
        console.error('Razorpay order error:', error);
        res.status(500).json({ error: 'Failed to create Razorpay order' });
    }
};


const verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, appliedCouponData } = req.body;

        // Create signature
        const generatedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest('hex');

        if (generatedSignature !== razorpay_signature) {
            return res.status(400).json({ error: 'Invalid payment signature' });
        }

        // If verification successful, create order
        await createOrderInDB(req, res, 'Razorpay', appliedCouponData);

        res.status(200).json({ success: true, message: 'Order placed successfully' });

    } catch (error) {
        console.error('Payment verification error:', error);
        res.status(500).json({ error: 'Payment verification failed' });
    }
};

const verifyWalletPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, total } = req.body;
        const user = req.session.user._id;

        // Generate signature
        const generatedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest("hex");

        if (generatedSignature !== razorpay_signature) {
            return res.status(400).json({ error: "Invalid payment signature" });
        }

        let wallet = await Wallet.findOne({ user });

        if (!wallet) {
            wallet = new Wallet({
                user,
                balance: 0,
                transactions: [],
            });
        }

        wallet.balance += Number(total);
        wallet.transactions.push({
            amount: total,
            type: "credit",
            description: "Added via Razorpay",
            status: "completed",
        });

        await wallet.save();

        res.status(200).json({ success: true, message: "Wallet updated successfully", wallet });

    } catch (error) {
        console.error("Wallet payment verification error:", error);
        res.status(500).json({ error: "Payment verification failed" });
    }
};


const placeOrder = async (req, res) => {
    try {
        const { paymentMethod, appliedCouponData } = req.body;
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

        if (paymentMethod === 'COD') {
            await createOrderInDB(req, res, 'COD', appliedCouponData);
            res.status(200).json({ success: true, message: 'Order placed successfully' });
        } else if (paymentMethod === 'Razorpay') {

            // For Razorpay, frontend will handle the payment flow
            res.json({ razorpay: true });
        }
    } catch (error) {
        console.error('Error placing order:', error);
        res.status(500).json({ error: 'An error occurred while placing the order' });
    }
};


const createOrderInDB = async (req, res, paymentMethod, appliedCouponData) => {

    try {
        const userId = req.session.user._id;
        const { deliveryDate, deliveryType } = req.session.selectedDeliveryMethod;


        const cart = await cartDb.findOne({ userId }).populate({
            path: 'products.productId',
            select: 'productName model price discount discountedPrice category returnPeriod warranty images stockQuantity variants',
        });

        if (!cart || cart.products.length === 0) {
            return res.status(400).json({ error: 'Cart is empty. Cannot place order.' });
        }

        let fetchedVariant = null;


        // check if any product is out of stock
        const hasOutOfStock = cart.products.some(item => {
            const product = item.productId;
            const variantDetails = item.variantDetails;

            if (variantDetails) {

                fetchedVariant = product.variants.find(v => {
                    const colorMatch = v.color === variantDetails.color;
                    if (variantDetails.storage) {
                        const storageMatch = `${v.storage}${v.storageUnit}` === variantDetails.storage;
                        return colorMatch && storageMatch;
                    }
                    return colorMatch;
                });
                return !fetchedVariant || fetchedVariant.stock < item.quantity;
            }
            return product.stockQuantity < item.quantity;
        });
        if (hasOutOfStock) {
            return res.status(400).json({ error: 'No stock available' });
        }


        const selectedAddress = await addressDb.findById(req.session.selectedAddressId);
        if (!selectedAddress) {
            return res.status(400).json({ error: 'No address selected for shipping.' });
        }

        const { originalTotal, subTotal, totalSavings, deliveryCharge, tax, total } = req.session.orderSummary;

        const couponDiscount = appliedCouponData?.discount || 0
        const couponName=appliedCouponData?.code || ''


        // Enhanced product details array with variant information
        const products = cart.products.map(item => {
            const product = item.productId;
            const variantDetails = item.variantDetails;

            // Calculate final price including variant additional price
            const basePrice = product.price;
            const orginalPrice = product.price + (variantDetails.additionalPrice || 0);
            const finalPrice = variantDetails
                ? Math.floor((basePrice + (variantDetails.additionalPrice || 0)) * (1 - product.discount / 100))
                : basePrice;

            return {
                productId: product._id,
                productName: product.productName,
                model: product.model,
                price: orginalPrice,
                discount: product.discount || 0,
                discountedPrice: finalPrice, // Discounted price including variant additional price
                category: product.category,
                quantity: item.quantity,
                returnPeriod: product.returnPeriod || 0,
                warranty: product.warranty || 0,
                images: product.images[0],
                deliveryDate: deliveryDate,
                variant: variantDetails ? {
                    color: variantDetails.color,
                    storage: variantDetails.storage,
                    additionalPrice: variantDetails.additionalPrice || 0
                } : null
            };
        });

        const newOrder = new ordersDb({
            userId,
            products,
            deliveryDate,
            deliveryType,
            status: 'Processing',
            paymentMethod,
            paymentStatus: 'Pending',
            shippingAddress: {
                addressId: selectedAddress._id,
                fullName: selectedAddress.fullName,
                phone: selectedAddress.phone,
                addressLine1: selectedAddress.addressLine1,
                addressLine2: selectedAddress.addressLine2,
                landmark: selectedAddress.landmark,
                city: selectedAddress.city,
                state: selectedAddress.state,
                pincode: selectedAddress.pincode,
                addressType: selectedAddress.addressType,
                paymentMethod,
                paymentStatus: paymentMethod === 'COD' ? 'Pending' : 'Paid'
            },
            originalTotal,
            subTotal,
            totalSavings,
            deliveryCharge,
            tax,
            total: Math.round(total - couponDiscount),// include coupoun discounts,
            couponApplied:{
                discount:couponDiscount,
                code:couponName
            }
        });

        const savedOrder = await newOrder.save();

            // Update coupon usage
        if (appliedCouponData) {
            const coupon = await Coupons.findById(appliedCouponData.id)
            coupon.usedCount += 1;

            if (coupon.usedCount >= coupon.usageLimit) {
                coupon.isActive = false;
            }
            await coupon.save();
        }
    

        // Update stock quantities for products and variants
        for (const item of cart.products) {

        const product = item.productId;
        // const variantDetails = item.variantDetails;

        if (fetchedVariant) {
            // Update variant stock

            await productsDB.updateOne(
                {
                    _id: product._id,
                    'variants': {
                        $elemMatch: {
                            color: fetchedVariant.color,
                            storage: fetchedVariant.storage,
                            storageUnit: fetchedVariant.storageUnit,
                        }
                    }
                },
                {
                    $inc: {
                        'variants.$.stock': -item.quantity,
                        totalStock: -item.quantity
                    }
                }
            );
        }
    }

    await cartDb.findOneAndUpdate({ userId }, { products: [], isOrdered: true });

    // Reset session data
    req.session.selectedAddressId = null;
    req.session.selectedDeliveryMethod = null;
    req.session.orderSummary = null;

} catch (error) {
    console.error('Error placing order:', error);
    res.status(500).json({ error: 'An error occurred while placing the order' });
}
};




const orderSuccess = (req, res) => {
    req.session.checkoutAccess = false;
    return res.render('user/orderSuccessPage', { title: "Order Success Page" })
}

module.exports = { loadPaymentPage, placeOrder, orderSuccess, createRazorpayOrder, verifyPayment, verifyWalletPayment }