const mongoose= require('mongoose');
const Schema= mongoose.Schema;

const wishlistschema = new Schema({
    user:{type:Schema.Types.ObjectId,
        ref:'user',
        required:'true'
    },
    products:[{
        product:{type:Schema.Types.ObjectId,
            ref:'Products'
        },
        addedAt:{ type:Date, default: Date.now}
    }]
},{ timestamps: true }); 


module.exports= mongoose.model('Wishlist',wishlistschema)