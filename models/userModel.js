const mongoose = require('mongoose');
const { applyTimestamps } = require('./productModel');
const findOrCreate = require('mongoose-findorcreate');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: false,
        trim: true
    },
    email: {
        type: String,
        required: false,
        trim: true
    },
    password: {
        type: String,
        required: false,
    },
    googleId: { type: String, required: false },
    isBlocked: {
        type: Boolean,
        default: false,
    },
    isDeleted: {
        type: Boolean,
        default: false,
    },
    
},{timestamps:true});


userSchema.plugin(findOrCreate);
const Users = mongoose.model("user", userSchema)

module.exports = Users;