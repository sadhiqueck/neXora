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
router.get('/product',(req,res)=>{
    res.render('user/product')
})


router.post('/verify',(req,res)=>{
    res.render('user/otp_verify')
})
module.exports=router