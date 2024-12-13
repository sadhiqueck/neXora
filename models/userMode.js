const mongoose= require('mongoose');

const userSchema= new mongoose.Schema({
    username:{
        type:String,
        required:true,
    },
    email:{
        type:String,
        required:true,
    },
    password:{
        type:String,
        required:true,
    },
    createdAt: { type: Date,
         default: Date.now 
        }
})


const Users= mongoose.model("user",userSchema)

module.exports = Users;