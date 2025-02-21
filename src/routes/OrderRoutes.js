const express = require("express");
const { getOrdersByUser,cancelOrder } = require("../controllers/paymentController/OrderController");
const { verifyToken } = require("../middleware/VerifyToken");

const router = express.Router();

router.get("/getAllByUser",verifyToken, getOrdersByUser); // Route to get all orders by user
router.post('/cancel/:order_id', cancelOrder);
module.exports = router;
