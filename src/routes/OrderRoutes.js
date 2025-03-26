// routes/orderRoutes.js
const express = require("express");
const { getOrdersByUser, cancelOrder,createReturnOrder,getOrdersByUserAndStatus,createExchangeOrder,getDeliveredOrdersByUser, getAllOrdersSorted, authenticateShiprocket, getShiprocketTracking } = require("../controllers/paymentController/OrderController");
const { verifyToken } = require("../middleware/VerifyToken");

const router = express.Router();

router.get("/getAllByUser", verifyToken, getOrdersByUser); // Route to get all orders by user
router.post('/cancel/:order_id', cancelOrder);
router.get("/getAllOrder", verifyToken, getAllOrdersSorted); // Route to get all orders sorted
router.post("/shiprocket/auth", authenticateShiprocket); // Route for Shiprocket authentication
router.get("/shiprocket/track/:awbCode", getShiprocketTracking); // Route for Shiprocket tracking
router.get("/delivered", verifyToken, getDeliveredOrdersByUser);
router.post("/exchange", verifyToken, createExchangeOrder);
router.post("/return", verifyToken, createReturnOrder); // New route
module.exports = router;