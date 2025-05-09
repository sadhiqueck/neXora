const ordersDb = require('../../models/ordersModel');
const userDb = require('../../models/userModel');
const productsdb = require('../../models/productModel')
const Wallet = require('../../models/walletModel')



const loadOrders = async (req, res) => {
    try {
        const {
            status = '',
            search = '',
            sortBy = 'orderDate',
            sortOrder = -1,
            page = 1,
            startDate,
            endDate
        } = req.query;

        const limit = 10;
        const skip = (Math.max(1, page) - 1) * limit;

        const matchStage = {};

        // Status filter
        if (['Processing', 'Order Placed', 'Delivered', 'Shipped', 'Out for Delivery', 'Cancelled', 'Returned'].includes(status)) {
            matchStage.status = status;
        }

        // Date filter
        if (startDate || endDate) {
            matchStage.orderDate = {};
            if (startDate) {
                matchStage.orderDate.$gte = new Date(startDate);
            }
            if (endDate) {
                // Add one day to include the end date fully
                const endDateTime = new Date(endDate);
                endDateTime.setDate(endDateTime.getDate() + 1);
                matchStage.orderDate.$lt = endDateTime;
            }
        }

        // Search filter
        if (search) {
            matchStage.$or = [
                { orderNumber: { $regex: search, $options: 'i' } },
                { 'userData.username': { $regex: search, $options: 'i' } },
                { 'userData.email': { $regex: search, $options: 'i' } }
            ];
        }

        const sortOptions = {
            newest: { orderDate: -1 },
            oldest: { orderDate: 1 },
            totalAsc: { total: 1 },
            totalDesc: { total: -1 }
        };

        const sortQuery = sortOptions[sortBy] || { orderDate: -1 };
        if (sortOrder) sortQuery[Object.keys(sortQuery)[0]] = parseInt(sortOrder);

        const aggregation = [
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'userData'
                }
            },
            { $unwind: '$userData' },
            {
                $addFields: {
                    totalQuantity: { $sum: '$products.quantity' },
                    orderDate: { $toDate: '$orderDate' }
                }
            },
            { $match: matchStage },
            {
                $project: {
                    orderNumber: 1,
                    'userData.username': 1,
                    'userData.email': 1,
                    products: 1,
                    total: 1,
                    orderDate: 1,
                    status: 1,
                    deliveryDate: 1,
                    paymentMethod: 1,
                    paymentStatus: 1,
                    deliveryType: 1,
                    totalQuantity: 1
                }
            },
            { $sort: sortQuery },
            {
                $facet: {
                    paginatedResults: [{ $skip: skip }, { $limit: limit }],
                    totalCount: [{ $count: 'count' }]
                }
            }
        ];

        const [result] = await ordersDb.aggregate(aggregation);
        const orders = result.paginatedResults;
        const totalCount = result.totalCount[0]?.count || 0;
        const totalPages = Math.ceil(totalCount / limit);
        const startIndex = skip + 1;
        const endIndex = Math.min(skip + limit, totalCount);

        res.render('admin/order_management', {
            orders,
            title: 'Order Management',
            currentStatus: status,
            currentSearch: search,
            currentSort: sortBy,
            currentSortOrder: sortOrder,
            startDate: startDate || '',
            endDate: endDate || '',
            search,
            pagination: {
                currentPage: Number(page),
                totalPages,
                totalCount,
                startIndex,
                endIndex,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            },
        });
    } catch (err) {
        console.error('Error loading orders:', err);
        res.status(500).render('error', { message: 'Error loading orders' });
    }
};


const updateOrder = async (req, res) => {
    try {
        const orderId = req.params.orderId
        const order = await ordersDb.findById(orderId).populate('userId')
        if (!order) return res.status(404).send("Error inn finding order")
        res.render('admin/orderUpdatePage', { title: "Order Update", order })
    } catch (err) {
        console.log(err)
        res.status(500).send('Error loading order details page');
    }

}

const updateProductStatus = async (req, res) => {
    try {
        const { orderId, productId, status } = req.body;

        const order = await ordersDb.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, error: "Order not found" })
        }

        const product = order.products.id(productId);
        if (!product) {
            return res.status(404).json({ success: false, error: "Products not found" })
        }

        product.status = status;

        if (status === 'Shipped') {
            product.shippedDate = new Date();
        } else if (status === "Delivered") {
            product.deliveredDate = new Date();
            order.deliveredDate = new Date();
        }



        // Compute overall order status
        const newOrderStatus = computeOrderStatus(order.products);

        order.status = newOrderStatus;
        // stopre update date;
        if (newOrderStatus === 'Shipped') {
            order.shippedDate = new Date();
        } else if (newOrderStatus === 'Out for delivery') {
            order.deliveredDate = new Date();
        }

        await order.save();

        res.status(200).json({ success: true, message: 'Status updated successfully' });

    } catch (error) {
        res.status(500).json({ error: error.message || 'Failed to update statuses.' });
    }
}

const cancelAll = async (req, res) => {
    try {
        const { orderId, reasonData } = req.body;
        const order = await ordersDb.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, error: "Order not found" })
        }
        const userId = order.userId

        let totalRefund = 0;
        for (const product of order.products) {

            if (['Shipped', 'Processing', 'Pending'].includes(product.status)) {
                product.status = 'Cancelled';
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
        let previousOrderStatus = order.status
        // Update order status
        order.status = computeOrderStatus(order.products);
        let finalRefund = null;
        // Process refund
        if (totalRefund > 0 && ['Razorpay', 'Wallet'].includes(order.paymentMethod)) {
            let wallet = await Wallet.findOne({ user: userId });
            if (!wallet) {
                wallet = new Wallet({
                    user: userId,
                    balance: 0,
                    transactions: [],
                });
                await wallet.save();
            }

            if (previousOrderStatus !== 'Shipped') {
                finalRefund = totalRefund + order?.deliveryCharge || 0;
                wallet.balance += finalRefund
            } else {
                wallet.balance += totalRefund;
            }

            wallet.transactions.push({
                amount: finalRefund ?? totalRefund,
                type: 'credit',
                description: `Full order refund: ${order.orderNumber}`,
                status: 'completed'
            });
            await wallet.save();
            order.paymentStatus = 'Refunded';
        }
        // recalculte order status
        order.status = computeOrderStatus(order.products);
        order.cancelDescription = reasonData || '';
        await order.save();
        res.status(200).json({ success: true, message: "All products cancelled succesfully" })
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: error.message || "Failed to cancel product" })
    }
}

const ChangeDeliveryDate = async (req, res) => {

    try {

        const { orderId, productId, newDate } = req.body;

        const order = await ordersDb.findById(orderId);
        if (!order) return res.status(404).json({ success: false, error: "Order not found" });

        const product = order.products.id(productId);
        if (!product) return res.status(404).json({ success: false, error: "Product not found" });

        product.deliveryDate = newDate;
        await order.save();

        res.status(200).json({ success: true, message: "Date Updated" });

    } catch (error) {
        console.log(error);
        res.status(500).json({ error: error.message || "Failed to Chnage date" })

    }
}

const reutrnApproval = async (req, res) => {
    const { productId, orderId } = req.body;

    const order = await ordersDb.findById(orderId);

    if (!order) return res.status(404).json({ error: "No order Found" })
    const userId = order.userId

    const product = order.products.id(productId);
    if (!product) {
        return res.status(404).json({ success: false, error: "Products not found" })
    }
    product.paymentStatus = "Refunded";

    order.status = computeOrderStatus(order.products);

    // Process refund if payment was completed
    if (order.paymentStatus === 'Completed' && ['Razorpay', 'Wallet'].includes(order.paymentMethod)) {
        const refundAmount = product.discountedPrice;

        // Update wallet
        let wallet = await Wallet.findOne({ user: userId });
        if (!wallet) {
            wallet = new Wallet({
               user: userId,
               balance: 0,
               transactions: [],
           });
           await wallet.save();
           }
        wallet.balance += refundAmount;
        wallet.transactions.push({
            amount: refundAmount,
            type: 'credit',
            description: `Refund for cancelled item: ${product.productName}`,
            status: 'completed'
        });

        await wallet.save();

        // Update payment status
        order.paymentStatus = order.products.some(p => p.status !== 'Cancelled')
            ? 'Partial Refund'
            : 'Refunded';
    }
    await order.save();
    res.status(200).json({ success: true, message: "Approved refund successfully" });


}
const getInvoice = async (req, res) => {
    try {
        const { orderId } = req.params

        const order = await ordersDb.findById(orderId)
            .populate('userId', 'username email')
            .populate('products.productId', 'productName price');
        res.json(order);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching order details' });
    }
}

function computeOrderStatus(products) {
    const statusCounts = {
        Cancelled: 0,
        Returned: 0,
        Delivered: 0,
        Shipped: 0,
        Processing: 0,
        'Out for delivery': 0
    };

    products.forEach(product => {
        statusCounts[product.status] = (statusCounts[product.status] || 0) + 1;
    });

    if (statusCounts.Cancelled === products.length) return 'Cancelled';
    if (statusCounts.Returned === products.length) return 'Returned';
    if (statusCounts.Delivered === products.length) return 'Delivered';
    if (statusCounts['Out for delivery'] === products.length) return 'Out for delivery';
    if (statusCounts.Delivered > 0 && statusCounts.Cancelled + statusCounts.Returned + statusCounts.Delivered === products.length) return 'Delivered';
    if (statusCounts.Shipped > 0) return 'Shipped';
    if (statusCounts.Processing > 0) return 'Processing';
    return 'Partially Cancelled';
}


module.exports = { loadOrders, updateOrder, updateProductStatus, cancelAll, ChangeDeliveryDate, reutrnApproval, getInvoice }