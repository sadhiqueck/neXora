const Order = require('../../models/ordersModel')
const Category = require('../../models/categoryModel');


const getSalesReport = async (req, res) => {

    try {

        const { period, startDate, endDate } = req.query;

        let query = {
            status: 'Delivered',
            'products.status': 'Delivered'
        }

        if (period === 'custom' && startDate && endDate) {
            query.orderDate = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            }
        } else {
            const dateRange = getDateRange(period);
            query.orderDate = { $gte: dateRange }
        }



        const orders = await Order.find(query)
            .populate('userId', 'email')
            .sort({ orderDate: -1 });

        const totalSales = orders.reduce((sum, order) => sum + order.originalTotal, 0)

        const totalOrders = orders.length;
        const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

        const categorySales = await getCategorySales(orders);

        const revenueData = await getRevenueTrend(period, query.orderDate);
        const categoryData = await getCategoryDistribution();
        const RecentOrders = orders.slice(0, 10);

        const totalDiscounts = orders.reduce((total, val) => total + val.totalSavings + (val.couponApplied.discount || 0), 0)

        res.render('admin/salesReport', {
            orders,
            RecentOrders,
            totalSales,
            totalOrders,
            averageOrderValue,
            totalDiscounts,
            categoryData,
            revenueData,
            categorySales,
            period: period || 'all',
            startDate,
            endDate,
            title: "Sale Report"
        })
    } catch (error) {
        console.error('Sales report error:', error);
        res.status(500).render('error', { message: 'Error generating sales report' });
    }
}

const fetchAllOrders = async (req,res) => {

    try {
        const orders = await Order.find({
            status: 'Delivered',
            'products.status': 'Delivered'
        }).populate('userId', 'email'); 
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching orders' });
    }

}

// Helper functions
const getDateRange = (period) => {
    const now = new Date();
    switch (period) {
        case 'daily': return new Date(now.setHours(0, 0, 0, 0));
        case 'weekly': return new Date(now.setDate(now.getDate() - 7));
        case 'monthly': return new Date(now.setMonth(now.getMonth() - 1));
        default: return new Date(0);
    }
};

const getCategorySales = async (orders) => {
    const categoryMap = new Map();

    orders.forEach(order => {
        order.products.forEach(product => {
            const category = product.category;
            const amount = product.discountedPrice * product.quantity;

            if (categoryMap.has(category)) {
                categoryMap.get(category).total += amount;
                categoryMap.get(category).count += product.quantity;
            } else {
                categoryMap.set(category, {
                    total: amount,
                    count: product.quantity
                });
            }
        });
    });

    // Get category names
    const categories = await Category.find({
        categoryName: { $in: Array.from(categoryMap.keys()) }
    });

    return Array.from(categoryMap).map(([categoryName, stats]) => ({
        categoryName,
        ...stats,
        name: categories.find(c => c.categoryName === categoryName)?.categoryName
    }));
};

const getRevenueTrend = async (period, dateFilter) => {
    const matchStage = {
        $match: {
            status: 'Delivered',
            orderDate: dateFilter
        }
    };

    const groupStage = {
        $group: {
            _id: {
                $dateToString: {
                    format: period === 'monthly' ? "%Y-%m" : "%Y-%m-%d",
                    date: "$orderDate"
                }
            },
            total: { $sum: "$total" }
        }
    };

    const trendData = await Order.aggregate([matchStage, groupStage]);
    return trendData.sort((a, b) => a._id.localeCompare(b._id));
};

const getCategoryDistribution = async () => {
    return Order.aggregate([
        { $unwind: "$products" },
        {
            $group: {
                _id: "$products.category",
                total: { $sum: { $multiply: ["$products.quantity", "$products.discountedPrice"] } }
            }
        }
    ]);
};

module.exports = { getSalesReport , fetchAllOrders}