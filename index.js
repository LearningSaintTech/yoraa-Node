require("dotenv").config();
const express = require("express");
const cors = require("cors");



const authRouter  = require("./src/routes/AuthRoutes");
const { connectToDB } = require("./src/database/db");
const itemRouter = require("./src/routes/ItemRoutes");
const SubCategoryRouter = require("./src/routes/SubCategoryRoutes");
const CategoryRouter = require("./src/routes/CategoryRoutes");
const wishlistRouter = require("./src/routes/WishlistRoutes");
const cartRoutes = require("./src/routes/CartRoutes");
const userRoutes = require("./src/routes/UserRoutes");
const addressRoutes = require("./src/routes/AddressRoutes");
const razorpayRoutes = require("./src/routes/paymentRoutes"); // Import Razorpay route
const userProfileRoutes = require("./src/routes/UserProfileRoutes"); // Import Razorpay route
const itemDetailsRoutes = require("./src/routes/ItemDetailsRoutes");
const orderRoutes = require("./src/routes/OrderRoutes");
const privacyPolicyRoutes=require("./src/routes/PrivacyPolicyRoutes");
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended : true}));



connectToDB();

app.use("/api/auth",authRouter);
// app.use("/api/product",ProductRouter);
app.use("/api/user",userRoutes);



app.use("/api/categories", CategoryRouter);
app.use("/api/subcategories", SubCategoryRouter);


app.use("/api/items", itemRouter);
app.use("/api/itemDetails", itemDetailsRoutes);
app.use("/api/wishlist",wishlistRouter);
app.use("/api/cart",cartRoutes);
app.use("/api/address",addressRoutes);
app.use("/api/razorpay", razorpayRoutes);  // Add Razorpay API route
app.use("/api/userProfile", userProfileRoutes);
app.use("/api/orders", orderRoutes);
app.use('/api/privacyPolicy', privacyPolicyRoutes);



app.listen(8080,() => {
    console.log(`Server is running on http://localhost:8080`)
});