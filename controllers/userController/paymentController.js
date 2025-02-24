const productsDB = require('../../models/productModel');
const cartDb = require('../../models/cartModel');
const addressDb = require('../../models/addressModel');
const ordersDb = require('../../models/ordersModel')
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Wallet = require('../../models/walletModel');
const Coupons = require('../../models/couponModel');
const CategoryOffer = require('../../models/categoryOfferModel')
const calculateEffectivePrice = require('../../utils/EffectivePriceCalculator');


const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

const loadPaymentPage = async (req, res) => {
    try {
        const userId = req.session.user._id;
        let deliveryChargeLimit = 10000
        let CODLimit = 50000;
        const cart = await cartDb.findOne({ userId }).populate('products.productId')
        const cartId = cart._id
        const cartVersion=cart.version
        const { selectedAddressId, selectedDeliveryMethod } = req.session;
        const selectedAddress = await addressDb.findById(selectedAddressId);
        const { deliveryType, deliveryDate } = selectedDeliveryMethod;


        if (!cart || !selectedAddressId || !selectedDeliveryMethod) {
            console.log("Error in loading payment page");
            return res.redirect('/user/selectAddress');
        } else {

            const categoryOffers = await CategoryOffer.find({
                expiryDate: { $gt: Date.now() },
                isActive: true
            }).populate('categoryId', 'categoryName');

            const cartWithDetails = cart.products.map((item) => {
                const product = item.productId;

                const matchingVariants = product.variants.filter(v => {
                    const colorMatch = v.color === item.variantDetails.color;

                    if (item.variantDetails.storage) {
                        return colorMatch &&
                            v.storage !== null &&
                            v.storageUnit !== 'NIL' &&
                            `${v.storage}${v.storageUnit}` === item.variantDetails.storage;
                    }

                    return colorMatch && (v.storage === null || v.storageUnit === 'NIL');
                });


                const selectedVariant = matchingVariants[0];

                const priceInfo = calculateEffectivePrice(product, categoryOffers, matchingVariants);

                // checkk product id out of stock
                const isOutOfStock = !selectedVariant || selectedVariant.stock < 1;

                return {
                    ...item.toObject(),
                    variantPrice: priceInfo.discountedPrice,
                    effectiveDiscount: priceInfo.effectiveDiscountPercentage,
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
            const deliveryCharge = subTotal > deliveryChargeLimit ? 0 : 99;
            const tax = Math.round(subTotal * 0.18);
            const total = subTotal + deliveryCharge;

            req.session.orderSummary = { originalTotal, subTotal, totalSavings, deliveryCharge, tax, total };

            const isCODAllowed = total < CODLimit ? true : false;

            // Fetch user wallet data
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
                deliveryCharge, originalTotal, tax, total, userWallet,
                 coupons: combinedCoupons, cartId,cartVersion,isCODAllowed
            })
        }

    } catch (error) {
        console.error('Error loading payment page:', error);
        return res.status(500).json({ error: 'Failed to load payment page' });

    }


}


const createRazorpayOrder = async (req, res) => {
    try {
        let { total } = req.body;

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
        });

    } catch (error) {
        console.error('Razorpay order error:', error);
        res.status(500).json({ error: 'Failed to create Razorpay order' });
    }
};


const verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, appliedCouponData  } = req.body;

        // Create signature
        const generatedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest('hex');

        if (generatedSignature !== razorpay_signature) {
            return res.status(400).json({ error: 'Invalid payment signature' });
        }
        console.log('in verify payment')

        // If verification successful, create order
        await createOrderInDB(req, res, 'Razorpay', appliedCouponData, razorpay_payment_id);

        console.log('success create order and return back to verify payujmetn')
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

const verifyRetryPayment = async (req, res) => {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;
  
      // Verify the payment signature
      const generatedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(razorpay_order_id + '|' + razorpay_payment_id)
        .digest('hex');
  
      if (generatedSignature !== razorpay_signature) {
        return res.status(400).json({ error: 'Invalid payment signature' });
      }
  
      // Find the failed order
      const order = await ordersDb.findById(orderId);
  
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }
  
      // Update the order status and payment status
      order.paymentStatus = 'Completed';
      order.status = 'Processing'; 
      order.transactionID = razorpay_payment_id; 
      await order.save();
  
      res.status(200).json({ success: true, message: 'Payment retry successful' });
    } catch (error) {
      console.error('Payment verification error:', error);
      res.status(500).json({ error: 'Payment verification failed' });
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
            await createOrderInDB(req, res, 'COD', appliedCouponData, `COD${userId}`);
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

const handlePaymentFailure = async (req, res) => {
    try {
        const { razorpayOrderId, appliedCouponData } = req.body;

        await createOrderInDB(req, res, 'Razorpay', appliedCouponData, razorpayOrderId, 'Failed');
        req.session.checkoutAccess = false;
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Payment failure error:', error);
        res.status(500).json({ error: 'Failed to save failed order' });
    }
};


const createOrderInDB = async (req, res, paymentMethod, appliedCouponData, transactionID, paymentStatus = 'Completed') => {
    try {
        const userId = req.session.user._id;
        const { deliveryDate, deliveryType } = req.session.selectedDeliveryMethod;

        console.log('in create order db')
        // const cart = await cartDb.findOne({ userId }).populate({
        //     path: 'products.productId',
        //     select: 'productName model price discount discountedPrice category returnPeriod warranty images stockQuantity variants',
        // });
        const cart = req.session.currenCart;

        if (!cart || cart.products.length === 0) {
            return res.status(400).json({ error: 'Cart is empty. Cannot place order.' });
        }

        const categoryOffers = await CategoryOffer.find({
            expiryDate: { $gt: Date.now() },
            isActive: true
        }).populate('categoryId', 'categoryName');

        const productsWithCategoryDiscount = cart.products.map(item => {
            const product = item.productId;
            const variantDetails = item.variantDetails;

            const basePrice = product.price + (variantDetails?.additionalPrice || 0);

            const categoryOffer = categoryOffers.find(offer =>
                offer.categoryId.categoryName === product.category
            );

            const effectiveDiscount = Math.max(
                product.discount,
                categoryOffer?.discountPercentage || 0
            );

            const categoryAdjustedPrice = Math.floor(basePrice * (1 - effectiveDiscount / 100));

            return {
                ...item,
                categoryAdjustedPrice,
                effectiveDiscount,
            };
        });

        let couponDetails = null;
        let couponDiscount = 0;
        let couponName = '';

        if (appliedCouponData) {
            couponDetails = await Coupons.findById(appliedCouponData.id);
        }

        const finalProducts = productsWithCategoryDiscount.map(item => {
            const product = item.productId;
            let finalPrice = item.categoryAdjustedPrice;

            if (appliedCouponData) {
                const { subTotal } = req.session.orderSummary;
                couponDiscount = appliedCouponData?.discount || 0;
                couponName = appliedCouponData?.code || '';
                const couponCategory = couponDetails.categories.map(category => category);

                if (couponCategory.includes(product.category)) {
                    finalPrice = Math.floor(finalPrice - couponDiscount);
                } else if (couponCategory.length === 0) {
                    const productShare = (finalPrice * item.quantity) / subTotal;
                    const productDiscount = couponDiscount * productShare;
                    finalPrice = Math.floor(finalPrice - productDiscount / item.quantity);
                }
            }

            return {
                productId: product._id,
                productName: product.productName,
                model: product.model,
                price: product.price + (item.variantDetails?.additionalPrice || 0),
                discount: item.effectiveDiscount,
                discountedPrice: Math.floor(finalPrice),
                category: product.category,
                quantity: item.quantity,
                returnPeriod: product.returnPeriod || 0,
                warranty: product.warranty || 0,
                images: product.images[0],
                deliveryDate: deliveryDate,
                variant: item.variantDetails ? {
                    color: item.variantDetails.color,
                    storage: item.variantDetails.storage,
                    additionalPrice: item.variantDetails.additionalPrice || 0
                } : null
            };
        });

        const selectedAddress = await addressDb.findById(req.session.selectedAddressId);
        if (!selectedAddress) {
            return res.status(400).json({ error: 'No address selected for shipping.' });
        }

        const { originalTotal, subTotal, totalSavings, deliveryCharge, tax, total } = req.session.orderSummary;

        const newOrder = new ordersDb({
            userId,
            products: finalProducts,
            deliveryDate,
            deliveryType,
            status: paymentStatus === 'Completed' ? 'Processing' : 'Pending', 
            paymentMethod,
            paymentStatus, 
            transactionID,
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
            },
            originalTotal,
            subTotal,
            totalSavings,
            deliveryCharge,
            tax,
            total: Math.round(total - couponDiscount),
            couponApplied: {
                discount: couponDiscount,
                code: couponName
            }
        });

        const savedOrder = await newOrder.save();

        // Update coupon usage only if payment is successful
        if (appliedCouponData && paymentStatus === 'Completed') {
            await Coupons.findByIdAndUpdate(appliedCouponData.id, {
                $inc: { usedCount: 1 },
                ...(couponDetails.usedCount + 1 >= couponDetails.usageLimit && { isActive: false })
            });
        }
       
            for (const item of cart.products) {
                const product = item.productId;
                const variant = product.variants.find(v => {
                    const colorMatch = v.color === item.variantDetails?.color;
                    if (item.variantDetails?.storage) {
                        return colorMatch && `${v.storage}${v.storageUnit}` === item.variantDetails.storage;
                    }
                    return colorMatch && (v.storage === null || v.storageUnit === 'NIL');
                });

                if (variant) {
                    await productsDB.updateOne(
                        { _id: product._id, 'variants._id': variant._id },
                        { $inc: { 'variants.$.stock': -item.quantity, totalStock: -item.quantity } }
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

const retryPayment = async (req, res) => {
    try {
      const { orderId } = req.body; 
      const userId = req.session.user._id;

    // give temprory checkout access
    req.session.checkoutAccess=true;
  
      // Find the failed order
      const failedOrder = await ordersDb.findOne({
        _id: orderId,
        userId,
        paymentStatus: 'Failed',
      });

  
      if (!failedOrder) {
        return res.status(404).json({ error: 'Failed order not found' });
      }

  
      // Create a new Razorpay order
      const amountInPaisa = failedOrder.total * 100; // Convert to paisa
      const options = {
        amount: amountInPaisa,
        currency: 'INR',
        receipt: `receipt_${Date.now()}`, // Unique receipt ID
      };
  
      const razorpayOrder = await razorpay.orders.create(options);
  
      // Update the failed order with the new Razorpay order ID
      await ordersDb.findByIdAndUpdate(failedOrder._id, {
        transactionID: razorpayOrder.id, // Store the new Razorpay order ID
      });
  
      res.status(200).json({
        success: true,
        razorpayOrder,
      });
    } catch (error) {
      console.error('Retry payment error:', error);
      res.status(500).json({ error: 'Failed to retry payment' });
    }
  };

module.exports = {
    loadPaymentPage, placeOrder, orderSuccess,
    createRazorpayOrder, verifyPayment, verifyWalletPayment, 
    handlePaymentFailure,retryPayment,verifyRetryPayment
}