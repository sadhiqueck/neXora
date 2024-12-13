const express= require('express')
const router=express.Router();


router.get('/login',(req,res)=>{
    res.render('user/login')
})
router.get('/signup',(req,res)=>{
    res.render('user/signup')
})

router.get('/home',(req,res)=>{
    res.render('user/home')
})
router.get('/products',(req,res)=>{
    res.render('user/products')
})


router.post('/verify',(req,res)=>{
    res.render('user/otp_verify')
})
router.post('/product_details',(req,res)=>{
    res.render('user/product_details')
})
module.exports=router