const express= require('express')
const router=express.Router();


router.get('/login',(req,res)=>{
    res.render('admin/login')
})

router.get('/users',(req,res)=>{
    res.render('admin/user_manage')
})

router.get('/category',(req,res)=>{
    res.render('admin/category_manage')
})

router.get('/product',(req,res)=>{
    res.render('admin/product_manage')
})

module.exports=router