const Order = require('../../models/ordersModel');
const Product = require('../../models/productModel');
const Category = require('../../models/categoryModel');
const User = require('../../models/userModel')

const loadDashboard = async (req, res) => {
    try {

        const timeFilter = req.query.timeFilter || 'monthly';
        const dateRange = getDateRange(timeFilter);

        const orderQuery = {
            status: 'Delivered',
            createdAt: { $gte: dateRange }
        };

        // fetch statistics
        const [
            totalSales,
            totalOrders,
            topProducts,
            topBrands,
            recentOrders,
            categorySales,
        ] = await Promise.all([
            calculateTotalSales(orderQuery),
            Order.countDocuments(orderQuery),
            getTopSellingProducts(dateRange),
            getTopSellingBrands(dateRange),
            getRecentOrders(),
            getCategorySales(dateRange)
        ]);

        // Calculate average order value
        const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

        // Get sales chart data
        const salesChartData = await getSalesChartData(timeFilter);

        const categoryData = await getCategoryDistribution();
        console.log(topBrands)

        res.render('admin/dashboard', {
            totalSales,
            totalOrders,
            averageOrderValue,
            totalCustomers: await getTotalCustomers(),
            topProducts,
            topBrands,
            recentOrders,
            categorySales,
            salesChartData,
            categoryData,
            timeFilter,
            title: "Dashboard"
        });

    } catch (error) {
        console.error('Dashboard Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching dashboard data'
        });
    }
};

// Helper Functions
const getDateRange = (timeFilter) => {
    const now = new Date();
    switch (timeFilter) {
        case 'yearly':
            return new Date(now.getFullYear(), 0, 1);
        case 'monthly':
            return new Date(now.getFullYear(), now.getMonth(), 1);
        case 'weekly':
            const lastWeek = new Date(now);
            lastWeek.setDate(now.getDate() - 7);
            return lastWeek;
        default:
            return new Date(now.getFullYear(), 0, 1); // Default to yearly
    }
};

const calculateTotalSales = async (query) => {
    const result = await Order.aggregate([
        { $match: query },
        { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    return result[0]?.total || 0;
};

const getTopSellingProducts = async (dateRange) => {
    return await Order.aggregate([
        { $match: { createdAt: { $gte: dateRange }, status: 'Delivered' } },
        { $unwind: '$products' },
        {
            $group: {
                _id: '$products.productId',
                totalSold: { $sum: '$products.quantity' },
                revenue: { $sum: { $multiply: ['$products.price', '$products.quantity'] } }
            }
        },
        {
            $lookup: {
                from: 'products',
                localField: '_id',
                foreignField: '_id',
                as: 'productInfo'
            }
        },
        { $unwind: '$productInfo' },
        {
            $project: {
                name: '$productInfo.productName',
                totalSold: 1,
                revenue: 1
            }
        },
        { $sort: { totalSold: -1 } },
        { $limit: 10 }
    ]);
};
const getTopSellingBrands = async (dateRange) => {
    return await Order.aggregate([
        { $match: { createdAt: { $gte: dateRange }, status: 'Delivered' } },
        { $unwind: '$products' },
        {
            $lookup: {
                from: 'products',
                localField: 'products.productId',
                foreignField: '_id',
                as: 'productInfo'
            }
        },
        { $unwind: '$productInfo' },
        {
            $group: {
                _id: '$productInfo.brand',
                totalSold: { $sum: '$products.quantity' },
                revenue: { $sum: { $multiply: ['$products.price', '$products.quantity'] } }
            }
        },
        {
            $project: {
                name: '$_id',
                totalSold: 1,
                revenue: 1
            }
        },
        { $sort: { totalSold: -1 } },
        { $limit: 10 }
    ]);
};

const getRecentOrders = async () => {
    return await Order.find({ status: 'Delivered' })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('userId', 'username email');
};

const getCategorySales = async (dateRange) => {
    return await Order.aggregate([
        { $match: { createdAt: { $gte: dateRange }, status: 'Delivered' } },
        { $unwind: '$products' },
        {
            $lookup: {
                from: 'products',
                localField: 'products.productId',
                foreignField: '_id',
                as: 'productInfo'
            }
        },
        { $unwind: '$productInfo' },
        {
            $group: {
                _id: '$productInfo.category',
                total: { $sum: { $multiply: ['$products.price', '$products.quantity'] } }
            }
        },
        {
            $lookup: {
                from: 'categories',
                localField: '_id',
                foreignField: '_id',
                as: 'categoryInfo'
            }
        },
        { $unwind: '$categoryInfo' },
        {
            $project: {
                categoryName: '$categoryInfo.name',
                total: 1
            }
        },
        { $sort: { total: -1 } }
    ]);
};

const getSalesChartData = async (timeFilter) => {
    const dateRange = getDateRange(timeFilter);
    const groupByFormat = timeFilter === 'yearly' ? '%Y-%m' : '%Y-%m-%d';

    return await Order.aggregate([
        { $match: { createdAt: { $gte: dateRange }, status: 'Delivered' } },
        {
            $group: {
                _id: { $dateToString: { format: groupByFormat, date: '$createdAt' } },
                sales: { $sum: '$total' }
            }
        },
        { $sort: { '_id': 1 } }
    ]);
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

const getTotalCustomers = async () => {
    return await User.countDocuments({})
};



module.exports = {
    loadDashboard
};