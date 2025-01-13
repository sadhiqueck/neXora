
const mongoose = require("mongoose");
const app = require("./app");
const connectDB = require("./config/db");
const port = process.env.PORT || 3000;

connectDB();


app.listen(port, () => {
    console.log(`server running on ${port}`);

})

