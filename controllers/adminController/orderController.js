const ordersDb = require('../../models/ordersModel');
const userDb = require('../../models/userModel');



const loadOrders = async (req, res) => {
    try {

        const orders = await ordersDb.aggregate([
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'userData'
                }
            },
            {
                $unwind: '$userData'
            },
            {
                $addFields: {
                    totalQuantity: {
                        $sum: '$products.quantity'
                    }
                }
            },
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
            {
                $sort: { orderDate: -1 }
            }

        ])

        res.render('admin/order_management', { orders, title: 'Order Management' })
    }
    catch (err) {
        console.error('Error loading orders:', err);
        res.status(500).send('Error loading orders');
    }

}


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
        const { orderId } = req.body;

        const order = await ordersDb.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, error: "Order not found" })
        }

        order.products.forEach(product => {
            product.status = 'Cancelled';
        })
        // recalculte order status
        order.status = computeOrderStatus(order.products);
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