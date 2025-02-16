
const adminSchema = require('../../models/adminModel');
const bcrypt = require('bcrypt');
const Users = require("../../models/userModel");
const Orders = require('../../models/ordersModel')
const Wallet = require('../../models/walletModel');




const loadLogin = async (req, res) => {

    res.render('admin/login', { title: "login", layout: false })

}
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await adminSchema.findOne({ email });



        if (!admin) {
            return res.render('admin/login', { mssg: "Invalid Username!!", layout: false })
        } else {

            const isMatch = await bcrypt.compare(password, admin.password)

            if (!isMatch) return res.render('admin/login', { mssg: "Invalid Password, Try Again", layout: false })

            req.session.admin = true;

            res.redirect('/admin/dashboard');

        }

    } catch (error) {

        res.render('admin/login', { mssg: "Something Wrong, Please try again.", layout: false });
        console.log(error);

    }
}
const logout = (req, res) => {
    req.session.destroy((err) => {
        res.redirect('/admin/login?mssg="Logged out Succesfully')
    })

}



const loadUsers = async (req, res) => {
    try {
        if (req.session.admin) {
            const { sort = '', search = '' } = req.query;
            const page = parseInt(req.query.page) || 1;
            const limit = 5;
            const skip = (page - 1) * limit;

            let query = {};


            if (search) {
                query.$or = [
                    { name: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } }
                ];
            }


            switch (sort) {
                case 'active':
                    query.isDeleted = false;
                    query.isBlocked = false;
                    break;
                case 'blocked':
                    query.isBlocked = true;
                    break;
                case 'deleted':
                    query.isDeleted = true;
                    break;

            }


            let sortQuery = {};
            switch (sort) {
                case 'newest':
                    sortQuery = { createdAt: -1 };
                    break;
                case 'oldest':
                    sortQuery = { createdAt: 1 };
                    break;
                default:
                    sortQuery = { createdAt: -1 };
            }

            const totalUsers = await Users.countDocuments(query);
            const users = await Users.find(query).sort(sortQuery).skip(skip).limit(limit).lean();
            const totalPages = Math.ceil(totalUsers / limit);
            const startIndex = (page - 1) * limit + 1;
            const endIndex = Math.min(page * limit, totalUsers)
            const userOrders = await Orders.aggregate([
                {
                    $match: { status: 'Delivered' }
                },
                {
                    $group: {
                        _id: "$userId",
                        totalOrders: { $sum: 1 }
                    }
                }
            ]);
        
            const userOrdersMap = userOrders.reduce((acc, order) => {
                acc[order._id] = order.totalOrders;
                return acc;
            }, {});

          

            users.forEach(user => {
                user.totalOrders = userOrdersMap[user._id] || 0;
            });


            const userWallets = await Wallet.aggregate([
                {
                    $group: {
                        _id: "$user",
                        totalBalance: { $sum: "$balance" }
                    }
                }
            ]);
            const userWalletsMap = userWallets.reduce((acc, wallet) => {
                acc[wallet._id] = wallet.totalBalance;
                return acc;
            }, {});

            users.forEach(user => {
                user.totalBalance = userWalletsMap[user._id] || 0;
            });

            // console.log(users)
            res.render("admin/user_manage", {
                users,
                title: 'User Management',
                sort,
                searchQuery: search,
                pagination: {
                    currentPage: page,
                    totalUsers,
                    totalPages,
                    startIndex,
                    endIndex,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
            });
        } else {
            return res.redirect('/admin/login');
        }
    } catch (error) {
        console.error('Error in loadUsers:', error);
        res.status(500).render('error', { message: 'Server Error' });
    }
};


const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await Users.findById(id);
        if (!user) {
            return res.status(404).send('User not found');
        }

        // Toggle the `isDeleted` status
        user.isDeleted = !user.isDeleted;

        await user.save();
        res.redirect('/admin/users');

    } catch (error) {
        console.error(error);
        res.status(500).send('Something went wrong');
    }
}
const blockUser = async (req, res) => {
    try {
        const { id } = req.params;


        const user = await Users.findById(id);

        if (!user) {
            return res.sta
            tus(404).send('User not found');
        }
        // toggling
        user.isBlocked = !user.isBlocked;

        await user.save();
        res.redirect('/admin/users');

    } catch (error) {
        console.error(error);
    }
}
const viewUser = async (req, res) => {
    try {
        const { id } = req.params;


        const userDetails = await Users.findById(id);

        if (!userDetails) {
        }

    } catch (error) {
        console.error(error);
    }
}




module.exports = {
    login,
    loadLogin,
    loadUsers,
    deleteUser,
    blockUser,
    viewUser,
    logout
};