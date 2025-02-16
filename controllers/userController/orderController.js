const orderdb = require('../../models/ordersModel');
const addressdb = require('../../models/addressModel');
const productsdb = require('../../models/productModel');
const Wallet = require('../../models/walletModel')
const userdb = require('../../models/userModel')
const Coupons= require('../../models/couponModel')

const loadOrder = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const { page = 1, status, timePeriod } = req.query;
        const limit = 6;
        const skip = (Math.max(1, page) - 1) * limit;


        const thirtyMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const failedOrders = await orderdb.find({
            userId,
            paymentStatus: 'Failed',
            isOrderable: true,
            orderDate: { $lt: thirtyMinutesAgo }
        });

       
        for (const order of failedOrders) {
            await revertStockAndCoupon(order);
        }

        
        const query = { userId };

     
        if (status && status !== 'all') {
            query.status = status;
        }

 
        if (timePeriod && timePeriod !== 'all') {
            const days = parseInt(timePeriod);
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            query.orderDate = { $gte: startDate };
        }

 
        const [totalOrders, orders] = await Promise.all([
            orderdb.countDocuments(query),
            orderdb.find(query)
                .populate('products.productId')
                .sort({ orderDate: -1 })
                .skip(skip)
                .limit(limit)
                .lean()
        ]);

        const totalPages = Math.ceil(totalOrders / limit);
        const startIndex = skip + 1;
        const endIndex = Math.min(skip + limit, totalOrders);

        res.render('user/orders', {
            title: 'Orders',
            orders,
            status,
            timePeriod,
            pagination: {
                currentPage: Number(page),
                totalOrders,
                totalPages,
                startIndex,
                endIndex,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            },
            razorpayKey: process.env.RAZORPAY_KEY_ID
        });
    } catch (error) {
        console.error('Error loading orders:', error);
        return res.status(500).json({ error: 'Failed to load orders' });
    }
}

const loadOrderDetails = async (req, res) => {
    try {
        const { orderId } = req.params
        const userId = req.session.user._id;

        const order = await orderdb.findOne({
            _id: orderId,
            userId: userId
        }).populate('products.productId');

        if (!order) {
            console.log("Order not found");
            return res.redirect('/user/orders');
        }
        // Check if all products are cancelled except one which is delivered or shipped
        const nonCancelledProducts = order.products.filter(product => product.status !== 'Cancelled');

        if (nonCancelledProducts.length === 1 && ['Delivered', 'Shipped'].includes(nonCancelledProducts[0].status)) {
            order.status = nonCancelledProducts[0].status;
            await order.save();
        }


        //check if any product is delivered or out for delivery
        const isCancelable = order.products.every(product => !['Out for delivery', 'Delivered', 'Cancelled', 'Returned'].includes(product.status));

        order.products.forEach(product => {
            product.isReturnable = isWithinReturnPeriod(product.deliveredDate, product.returnPeriod) && product.status !== 'Returned' && product.status !== 'Shipped' && product.status !== 'Processing' && product.status !== 'Cancelled';
        });
        await order.save();

        //check if the order is returnable
        const isOrderReturnable = order.products.every(product => product.isReturnable);

        res.render('user/orderDetails', {
            title: 'Orders',
            order,
            isCancelable,
            isOrderReturnable,
        });

    } catch (error) {
        console.error('Error loading orders:', error);
        return res.status(500).json({ error: 'Failed to load orders' });
    }
}

const cancelItem = async (req, res) => {
    try {
        const { orderId, productId, reason } = req.body;
        const userId = req.session.user._id;

        const order = await orderdb.findOne({
            _id: orderId,
            userId,
            'products._id': productId
        });

        if (!order) return res.status(404).json({ success: false, message: "Order not found" });

        const product = order.products.id(productId);

        if (['Out for delivery', 'Delivered', 'Returned'].includes(product.status)) {
            return res.status(400).json({
                success: false,
                message: `Cannot cancel item in ${product.status} status`
            });
        }

        product.status = "Cancelled";
        product.cancelDescription = reason; // Save the cancellation reason

        // Add stock back to the specific variant
        const productDetails = await productsdb.findById(product.productId);
        const variantDetails = product.variant;

        const fetchedVariant = productDetails.variants.find(v => {
            const colorMatch = v.color === variantDetails.color;
            if (variantDetails.storage) {
                const storageMatch = `${v.storage}${v.storageUnit}` === variantDetails.storage;
                return colorMatch && storageMatch;
            }
            return colorMatch;
        });

        if (fetchedVariant) {
            // Update variant stock
            await productsdb.updateOne(
                {
                    _id: product.productId,
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
                        'variants.$.stock': +product.quantity,
                        totalStock: +product.quantity
                    }
                }
            );
        }

        order.status = computeOrderStatus(order.products);

        // Process refund if payment was completed
        if (order.paymentStatus === 'Completed' && ['Razorpay', 'Wallet'].includes(order.paymentMethod)) {
            let refundAmount;
            if (product.status === 'Shipped' && order.deliveryCharge) {
                refundAmount = product.discountedPrice - order.deliveryCharge;
            } else {
                refundAmount = product.discountedPrice + order?.deliveryCharge || 0;
            }

            // Update wallet
            const wallet = await Wallet.findOne({ user: userId });
            wallet.balance += refundAmount;
            wallet.transactions.push({
                amount: refundAmount,
                type: 'credit',
                description: `Refund for cancelled item: ${product.productName}`,
                status: 'completed'
            });

            await wallet.save();

            // Update payment status
            order.paymentStatus = order.products.length === 1 || order.products.every(p => p.status === 'Cancelled')
                ? 'Refunded'
                : 'Partial Refund';
        }

        await order.save();

        res.status(200).json({ success: true, message: "Product cancelled successfully" });

    } catch (error) {
        console.log(error);
        res.status(500).json({ error: error.message });
    }
};
// cancel full order
const cancelOrder = async (req, res) => {
    try {
        const { orderId, reason } = req.body;
        const userId = req.session.user._id;

        const order = await orderdb.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, error: "Order not found" })
        }

        let totalRefund = 0;
        for (const product of order.products) {

            if (['Shipped','Processing', 'Pending'].includes(product.status)) {
                product.status = 'Cancelled';
                product.cancelDescription = reason; // Save the cancellation reason
                const productDetails = await productsdb.findById(product.productId);
                const variantDetails = product.variant;

                const fetchedVariant = productDetails.variants.find(v => {
                    const colorMatch = v.color === variantDetails.color;
                    if (variantDetails.storage) {
                        const storageMatch = `${v.storage}${v.storageUnit}` === variantDetails.storage;
                        return colorMatch && storageMatch;
                    }
                    return colorMatch;
                });

                if (fetchedVariant) {
                    // Update variant stock
                    await productsdb.updateOne(
                        {
                            _id: product.productId,
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
                                'variants.$.stock': +product.quantity,
                                totalStock: +product.quantity
                            }
                        }
                    );
                }

                totalRefund += product.discountedPrice;
    
            }
        }
        let previousOrderStatus= order.status
    

        // Update order status
        order.status = computeOrderStatus(order.products);

        // Process refund
        let finalRefund=null;


        if (totalRefund > 0 && ['Razorpay', 'Wallet'].includes(order.paymentMethod)) {
            const wallet = await Wallet.findOne({ user: userId });
            if(previousOrderStatus!=='Shipped'){
                finalRefund= totalRefund + order?.deliveryCharge || 0;
                wallet.balance +=finalRefund
            }else{
                wallet.balance += totalRefund;
            }
          
            wallet.transactions.push({
                amount: finalRefund ?? totalRefund ,
                type: 'credit',
                description: `Full order refund: ${order.orderNumber}`,
                status: 'completed'
            });
            await wallet.save();
            order.paymentStatus = 'Refunded';
        }

        await order.save();
        res.status(200).json({ success: true, message: "All products cancelled succesfully" })
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: error.message || "Failed to cancel product" })
    }
}

const returnOrder = async (req, res) => {
    const { orderId, reason, description } = req.body;

    try {
        const order = await orderdb.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, error: 'Order not found' });
        }

        order.status = "Returned"

        order.products.forEach(product => {
            product.status = "Returned",
                product.returnDetails = {
                    returnReason: reason,
                    returnDescription: description,
                    returnDate: new Date()
                }
        })
        order.returnDetails = {
            returnReason: reason,
            returnDescription: description,
            returnDate: new Date()
        }

        const updatedOrder = await order.save();

        res.json({ success: true, message: 'Order return request submitted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Failed to process return request' });
    }
};

const returnItem = async (req, res) => {
    const { orderId, productId, reason, description } = req.body;

    try {
        const order = await orderdb.findById(orderId);

        if (!order) {
            return res.status(404).json({ success: false, error: 'Order not found' });
        }

        const product = order.products.id(productId);
        if (!product) {
            return res.status(404).json({ success: false, error: 'Product not found in order' });
        }

        product.status = 'Returned';
        product.returnDetails = {
            returnReason: reason,
            returnDescription: description,
            returnDate: new Date()
        }

        await order.save();

        res.json({ success: true, message: 'Product return request submitted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Failed to process return request' });
    }
}


const getInvoice = async (req, res) => {
    try {
        const {orderId}=req.params

        const order = await orderdb.findById(orderId)
            .populate('userId', 'username email')
            .populate('products.productId', 'productName price'); 
        res.json(order);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching order details' });
    }
}

// Enhanced status computation
const computeOrderStatus = (products) => {
    const statusCounts = {
        Cancelled: 0,
        Returned: 0,
        Delivered: 0,
        Shipped: 0,
        Processing: 0
    };

    products.forEach(product => {
        statusCounts[product.status] = (statusCounts[product.status] || 0) + 1;
    });

    if (statusCounts.Cancelled === products.length) return 'Cancelled';
    if (statusCounts.Returned === products.length) return 'Returned';
    if (statusCounts.Delivered === products.length) return 'Delivered';
    if (statusCounts.Returned + statusCounts.Cancelled === products.length) return 'Cancelled';
    if (statusCounts.Shipped > 0) return 'Shipped';
    if (statusCounts.Processing > 0) return 'Processing';
    return 'Partially Cancelled';
};

// Helper to check if return period is valid
const isWithinReturnPeriod = (deliveryDate, returnPeriodDays) => {
    const returnDeadline = new Date(deliveryDate);
    returnDeadline.setDate(returnDeadline.getDate() + returnPeriodDays);
    return new Date() < returnDeadline;
};

const revertStockAndCoupon = async (order) => {
    try {
        // Revert stock for each product in the order
        for (const item of order.products) {
            const product = await productsdb.findById(item.productId);
            if (product) {
                const variant = product.variants.find(v => {
                    const colorMatch = v.color === item.variantDetails?.color;
                    if (item.variantDetails?.storage) {
                        return colorMatch && `${v.storage}${v.storageUnit}` === item.variantDetails.storage;
                    }
                    return colorMatch && (v.storage === null || v.storageUnit === 'NIL');
                });

                if (variant) {
                    await productsdb.updateOne(
                        { _id: product._id, 'variants._id': variant._id },
                        { $inc: { 'variants.$.stock': item.quantity, totalStock: item.quantity } }
                    );
                }
            }
        }

        // Revert coupon usage
        if (order.couponApplied) {
            await Coupons.findByIdAndUpdate(order.couponApplied.id, {
                $inc: { usedCount: -1 },
                isActive: true, // Reactivate coupon if it was deactivated
            });
        }

        // Set isOrderable to false and order as failed
        order.isOrderable = false;
        order.status='Failed';
        await order.save();

        console.log('Stock and coupon reverted for order:', order._id);
    } catch (error) {
        console.error('Error reverting stock and coupon:', error);
    }
};


module.exports = { loadOrder, loadOrderDetails, cancelItem, cancelOrder, returnOrder, returnItem, getInvoice }
