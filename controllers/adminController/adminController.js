
const adminSchema = require('../../models/adminModel');
const bcrypt = require('bcrypt');
const Users = require("../../models/userModel");


const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await adminSchema.findOne({ email });



        if (!admin) {
            return res.render('admin/login', { mssg: "Invalid Username!!" })
        } else {

            const isMatch = await bcrypt.compare(password, admin.password)

            if (!isMatch) return res.render('admin/login', { mssg: "Invalid Password, Try Again" })

            req.session.admin = true;

            res.redirect('/admin/dashboard');

        }

    } catch (error) {

        res.render('admin/login', { mssg: "Something Wrong, Please try again." });
        console.log(error);

    }
}

const loadDashboard = async (req, res) => {
    try {
        if (req.session.admin) {
            res.render('admin/dashboard')
        } else {
            return res.redirect('/admin/login')
        }
    } catch (error) {
        console.log(error);
        res.render('admin/login', { mssg: "An error occurred, please try again." })

    }
}

const loadUsers = async (req, res) => {
    try {
        if (req.session.admin) {
            const users = await Users.find({})
            res.render("admin/user_manage", { users })
        }
        else {
            return res.redirect('/admin/login')
        }

    } catch (error) {
        console.log(error);

    }
}

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
            return res.status(404).send('User not found');
        }


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
    loadDashboard,
    loadUsers,
    deleteUser,
    blockUser,
    viewUser
};