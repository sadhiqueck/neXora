require('dotenv').config();
const express = require("express");
const app = express();
const session = require("express-session");
const path = require("path");
const adminRoute= require('./routes/adminRoute');
const userRoute= require('./routes/userRoute');
const expressLayouts = require('express-ejs-layouts');
const configurePassport=require("./middleware/passport");
const passport=require('passport');
const {loginStatus}=require('./middleware/userAuth');
const statusCodes = require('./utils/statusCodes');
const errorHandler = require('./utils/errors/errorHandler');
const AppError = require('./utils/errors/AppError');

app.use(expressLayouts);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");

// user layout 
app.use('/user',(req,res,next)=>{
    app.set('layout', 'layouts/userLayout');
    next(); 
});

// admin Layout
app.use('/admin',(req,res,next)=>{
    app.set('layout', 'layouts/adminLayout');
    next(); 
});


configurePassport();


app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
  });

app.use(session({
    secret:process.env.SESSION_SECRET_KEY,
    resave:false,
    saveUninitialized:true,
    cookie:{
        maxAge:1000*60*60
    }
}))
app.use(passport.initialize());
app.use(passport.session());

// default route
app.get('/',(req,res)=>{
    res.redirect('/user/home')
})
app.use('/admin',adminRoute)
app.use('/user',loginStatus,userRoute)

// 404 Route
app.all('*', (req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, statusCodes.NOT_FOUND));
  });
  
  // Error Handling Middleware
app.use(errorHandler);


module.exports = app;
