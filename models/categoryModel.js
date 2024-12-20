const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    categoryName: {
        type: String,
        require: true,
    },
    description:{
        type: String,
        require: true,
    },
    isDeleted: {
        type: Boolean,
        default: false,
    },
   
},{timestamps:true});

module.exports = mongoose.model("categories", categorySchema)