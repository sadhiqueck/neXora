const express= require('express')
const router=express.Router();
const{login,loadDashboard}=require('../controllers/adminController')
const {authsession,isLogin}= require('../middleware/adminAuth')


router.get('/login',isLogin,(req,res)=>{
    res.render('admin/login')
})

router.get('/dashboard',authsession,loadDashboard)

router.get('/users',authsession,(req,res)=>{
    res.render('admin/user_manage')
})

router.get('/category',authsession,(req,res)=>{
    res.render('admin/category_manage')
})

router.get('/product',authsession,(req,res)=>{
    res.render('admin/product_manage')
})


router.post('/login',login)

router.post('/logout',(req,res)=>{
    req.session.destroy((err)=>{
        if(err) return res.status(500).json({ message: 'Logout failed' });
        res.redirect('/admin/login?mssg="Logged out Succesfully')
    })
    
})

module.exports=router