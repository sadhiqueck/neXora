const Order = require('../../models/ordersModel');
const Product = require('../../models/productModel');
const Category = require('../../models/categoryModel');
const User = require('../../models/userModel')

const loadDashboard = async (req, res) => {
    try {
        const timeFilter = req.query.timeFilter || 'monthly';
        const rawStartDate = req.query.startDate ? new Date(req.query.startDate) : null;
        const rawEndDate = req.query.endDate ? new Date(req.query.endDate) : null;

        // Adjust dates to cover full days for custom range
        let adjustedStartDate = rawStartDate;
        let adjustedEndDate = rawEndDate;
        if (rawStartDate && rawEndDate) {
            adjustedStartDate = new Date(rawStartDate);
            adjustedStartDate.setHours(0, 0, 0, 0);
            adjustedEndDate = new Date(rawEndDate);
            adjustedEndDate.setHours(23, 59, 59, 999);
        }

        // Get date range query
        const dateRange = getDateRange(timeFilter, adjustedStartDate, adjustedEndDate);

        const orderQuery = {
            status: 'Delivered',
            ...dateRange  
        };

        // Fetch statistics
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
            getTopSellingBrands(),
            getRecentOrders(),
            getCategorySales(dateRange)
        ]);

        const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

        const salesChartData = await getSalesChartData(
            timeFilter,
            adjustedStartDate,
            adjustedEndDate
        );
        const categoryData = await getCategoryDistribution();

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
            startDate: rawStartDate,
            endDate: rawEndDate,
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


const getDateRange = (timeFilter, startDate, endDate) => {
    if (startDate && endDate) {
        return {
            orderDate: {
                $gte: startDate,
                $lte: endDate
            }
        };
    }

    const now = new Date();
    let dateQuery = {};

    switch (timeFilter) {
        case 'yearly':
            dateQuery = {
                $gte: new Date(now.getFullYear(), 0, 1),
                $lte: now
            };
            break;
        case 'monthly':
            dateQuery = {
                $gte: new Date(now.getFullYear(), now.getMonth(), 1),
                $lte: now
            };
            break;
        case 'weekly':
            const weekAgo = new Date(now);
            weekAgo.setDate(now.getDate() - 7);
            dateQuery = {
                $gte: weekAgo,
                $lte: now
            };
            break;
        default:
            dateQuery = {
                $gte: new Date(now.getFullYear(), 0, 1),
                $lte: now
            };
    }

    return { orderDate: dateQuery };
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
        { 
            $match: { 
                status: 'Delivered',
                ...dateRange 
            } 
        },
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

const getTopSellingBrands = async () => {
    return await Order.aggregate([
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
        .sort({ orderDate: -1 })
        .limit(10)
        .populate('userId', 'username email');
};

const getCategorySales = async (dateRange) => {
    return await Order.aggregate([
        { $match: { orderDate: { $gte: dateRange }, status: 'Delivered' } },
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

const getSalesChartData = async (timeFilter, startDate, endDate) => {
    let dateQuery = {};
    let groupByFormat = '%Y-%m-%d';

    if (startDate && endDate) {
        dateQuery.orderDate = { 
            $gte: startDate,
            $lte: endDate
        };
        const diffDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        groupByFormat = diffDays > 60 ? '%Y-%m' : '%Y-%m-%d';
    } else {
        dateQuery = getDateRange(timeFilter);
        groupByFormat = timeFilter === 'yearly' ? '%Y-%m' : '%Y-%m-%d';
    }

    return await Order.aggregate([
        { $match: { ...dateQuery, status: 'Delivered' } },
        {
            $group: {
                _id: { $dateToString: { format: groupByFormat, date: '$orderDate' } },
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