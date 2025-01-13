const orderdb = require('../../models/ordersModel');
const addressdb = require('../../models/addressModel');
const productsdb = require('../../models/productModel');

const loadOrder = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const orders = await orderdb.find({ userId })
            .populate('products.productId').sort({ orderDate: -1 })
        res.render('user/orders', { title: 'Orders', orders });
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
        res.render('user/orderDetails', { title: 'Orders', order });
    } catch (error) {
        console.error('Error loading orders:', error);
        return res.status(500).json({ error: 'Failed to load orders' });
    }
}

const cancelItem = async (req, res) => {
    try {
        const { orderId, productId } = req.body;

        const order = await orderdb.findById(orderId);
        if (!order) return res.status(404).json({ success: false, message: "Order not found" });

        const product = order.products.id(productId);
        if (!product) return res.status(404).json({ success: false, message: "order not found" })

        product.status = "Cancelled";
    
        order.status = computeOrderStatus(order.products);

        await order.save();

        res.status(200).json({ success: true, message: "Product cancelled succesfully" });

    } catch (error) {
        console.log(error);
        res.status(500).json({ error: error.message })
    }
}
// cancel full order
const cancelOrder = async (req, res) => {
    try {
        const { orderId } = req.body;

        const order = await orderdb.findById(orderId);
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

function computeOrderStatus(products) {
    const statuses = products.map((product) => product.status);
    if (statuses.every((status) => status === 'Cancelled')) {
        return 'Cancelled';
    };
}

module.exports = { loadOrder, loadOrderDetails, cancelItem,cancelOrder }
