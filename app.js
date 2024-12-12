const express = require("express");
const app = express();
const session = require("express-session");
const path = require("path");
const adminRoute= require('./routes/adminRoute');
const userRoute= require('./routes/userRoute')


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");



app.use('/admin',adminRoute)
app.use('/user',userRoute)

module.exports = app;
