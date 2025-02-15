const express = require("express");
const { getOrdersByUser } = require("../controllers/paymentController/OrderController");
const { verifyToken } = require("../middleware/VerifyToken");

const router = express.Router();

router.get("/getAllByUser",verifyToken, getOrdersByUser); // Route to get all orders by user

module.exports = router;
