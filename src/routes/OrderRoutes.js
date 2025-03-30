// routes/orderRoutes.js
const express = require("express");
const {
  getOrdersByUser,
  cancelOrder,
  getExchangeOrdersByUser,
  createReturnOrder,
  getReturnOrdersByUser,
  getOrdersByUserAndStatus,
  createExchangeOrder,
  getDeliveredOrdersByUser,
  getAllOrdersSorted,
  authenticateShiprocket,
  getShiprocketTracking,
} = require("../controllers/paymentController/OrderController");
const { verifyToken } = require("../middleware/VerifyToken");

const router = express.Router();

router.get("/getAllByUser", verifyToken, getOrdersByUser); // Get all orders by user
router.post("/cancel/:order_id", cancelOrder); // Cancel an order
router.get("/getAllOrder", verifyToken, getAllOrdersSorted); // Get all orders sorted
router.post("/shiprocket/auth", authenticateShiprocket); // Shiprocket authentication
router.get("/shiprocket/track/:awbCode", getShiprocketTracking); // Shiprocket tracking
router.get("/delivered", verifyToken, getDeliveredOrdersByUser); // Get delivered orders
router.post("/exchange", verifyToken, createExchangeOrder); // Create exchange order
router.post("/return", verifyToken, createReturnOrder); // Create return order

// Adjusted routes to match frontend GET requests
router.get("/exchange-orders", verifyToken, getExchangeOrdersByUser); // Get exchange orders
router.get("/return-orders", verifyToken, getReturnOrdersByUser); // Get return orders

module.exports = router;