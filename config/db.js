const mongoose= require("mongoose");

const connectDB= async()=>{
    try {
        await mongoose.connect('mongodb://localhost:27017/nexora', {});
        console.log("MongoDb Connected Successfully!");
        
    } catch (error) {
        console.error('MongoDB connection error:', err);
        process.exit(1); 
    }
}

module.exports= connectDB;