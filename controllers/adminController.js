
const adminSchema = require('../models/adminModel');
const bcrypt = require('bcrypt');

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await adminSchema.findOne({email});
       


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

const loadDashboard= async(req,res)=>{
    try {
        if(req.session.admin){
            res.render('admin/dashboard')
        }else{
            return res.redirect('/admin/login')
        }
    } catch (error) {
        console.log(error);
        res.render('admin/login',{mssg:"An error occurred, please try again." })
        
    }
}

module.exports = { login,loadDashboard };