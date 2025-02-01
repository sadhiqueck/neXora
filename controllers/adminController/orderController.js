const ordersDb = require('../../models/ordersModel');
const userDb = require('../../models/userModel');



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
            }
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

        // Compute overall order status
        const newOrderStatus = computeOrderStatus(order.products);

        order.status = newOrderStatus;
        // stopre update date;
        if (newOrderStatus === 'Shipped') {
            order.shippedDate = new Date();
        } else if (newOrderStatus === "Out for delivery") {
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

        order.products.forEach(product => {
            product.status = 'Cancelled';
        })
        // recalculte order status
        order.status = computeOrderStatus(order.products);
        order.cancelDescription=reasonData || '';
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

function computeOrderStatus(products) {
    const statuses = products.map((product) => product.status);

    console.log(statuses)
    if (statuses.every((status) => status === 'Cancelled')) {
        return 'Cancelled';
    }
    if (statuses.every((status) => status === 'Delivered')) {
        return 'Delivered';
    }
    if (statuses.every((status) => status === 'Shipped')) {
        return 'Shipped';
    }
    if (statuses.includes('Cancelled') && statuses.some((status) => status !== 'Cancelled')) {
        return 'Partially Cancelled';
    }
    if (statuses.some((status) => status === 'Out for delivery')) {
        return 'Out for delivery';
    }
    if (statuses.some((status) => status === 'Shipped')) {
        return 'Shipped';
    }
    if (statuses.some((status) => status === 'Processing')) {
        return 'Processing';
    }
    return 'Pending';
}



module.exports = { loadOrders, updateOrder, updateProductStatus, cancelAll, ChangeDeliveryDate }