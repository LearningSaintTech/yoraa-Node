const express = require("express");
const {
  getOrdersByUser,
  cancelOrder,
  getExchangeOrdersByUser,
  createReturnOrder,
  getReturnOrdersByUser,
  createExchangeOrder,
  getDeliveredOrdersByUser,
  getAllOrdersSorted,
  authenticateShiprocket,
  getShiprocketTracking,
  getOrderStatusCounts
} = require("../controllers/paymentController/OrderController");
const { verifyToken } = require("../middleware/VerifyToken");
const multer = require("multer");

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit per file
}).array("images", 3); // Expect 'images' field with max 3 files

// Routes without file uploads
router.get("/getAllByUser", verifyToken, getOrdersByUser);
router.post("/cancel/:order_id", cancelOrder); // No file upload needed
router.get("/getAllOrder", verifyToken, getAllOrdersSorted);
router.post("/shiprocket/auth", authenticateShiprocket); // No file upload
router.get("/shiprocket/track/:awbCode", getShiprocketTracking); // No file upload
router.get("/delivered", verifyToken, getDeliveredOrdersByUser);
router.get("/exchange-orders", verifyToken, getExchangeOrdersByUser);
router.get("/return-orders", verifyToken, getReturnOrdersByUser);
router.get("/status-counts", verifyToken, getOrderStatusCounts);

// Routes with file uploads (apply multer middleware)
router.post("/exchange", verifyToken, upload, createExchangeOrder);
router.post("/return", verifyToken, upload, createReturnOrder);

module.exports = router;